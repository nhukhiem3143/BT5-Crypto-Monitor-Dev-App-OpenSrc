"""
Crypto Monitor & Alert System - Flask REST API
"""
import os
import logging
from datetime import datetime, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS
import pymysql
from influxdb_client import InfluxDBClient

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config from environment
# ---------------------------------------------------------------------------
MARIADB_HOST = os.getenv("MARIADB_HOST", "mariadb")
MARIADB_PORT = int(os.getenv("MARIADB_PORT", 3306))
MARIADB_DB   = os.getenv("MARIADB_DATABASE", "cryptodb")
MARIADB_USER = os.getenv("MARIADB_USER", "cryptouser")
MARIADB_PASS = os.getenv("MARIADB_PASSWORD", "cryptopass123")

INFLUX_URL    = os.getenv("INFLUXDB_HOST", "http://influxdb:8086")
INFLUX_TOKEN  = os.getenv("INFLUXDB_TOKEN", "")
INFLUX_ORG    = os.getenv("INFLUXDB_ORG", "crypto-org")
INFLUX_BUCKET = os.getenv("INFLUXDB_BUCKET", "crypto_prices")

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
def get_mariadb():
    return pymysql.connect(
        host=MARIADB_HOST,
        port=MARIADB_PORT,
        user=MARIADB_USER,
        password=MARIADB_PASS,
        database=MARIADB_DB,
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5,
    )


def get_influx():
    return InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------
def success(data, status=200):
    return jsonify({"status": "success", "data": data, "timestamp": datetime.now(timezone.utc).isoformat()}), status


def error(msg, status=500):
    return jsonify({"status": "error", "message": msg, "timestamp": datetime.now(timezone.utc).isoformat()}), status


# ---------------------------------------------------------------------------
# GET /api/health
# ---------------------------------------------------------------------------
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "flask-api", "timestamp": datetime.now(timezone.utc).isoformat()}), 200


# ---------------------------------------------------------------------------
# GET /api/prices
# ---------------------------------------------------------------------------
@app.route("/api/prices")
def get_prices():
    try:
        conn = get_mariadb()
        with conn.cursor() as cur:
            cur.execute("SELECT symbol, price, volume, updated_at FROM realtime_prices ORDER BY symbol")
            rows = cur.fetchall()
        conn.close()
        # Serialize datetime
        for row in rows:
            if row.get("updated_at"):
                row["updated_at"] = row["updated_at"].isoformat()
        return success(rows)
    except Exception as e:
        logger.error(f"/api/prices error: {e}")
        return error(str(e))


# ---------------------------------------------------------------------------
# GET /api/prices/<symbol>
# ---------------------------------------------------------------------------
@app.route("/api/prices/<symbol>")
def get_price_by_symbol(symbol):
    symbol = symbol.upper()
    try:
        conn = get_mariadb()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT symbol, price, volume, updated_at FROM realtime_prices WHERE symbol = %s",
                (symbol,)
            )
            row = cur.fetchone()
        conn.close()
        if not row:
            return error(f"Symbol {symbol} not found", 404)
        if row.get("updated_at"):
            row["updated_at"] = row["updated_at"].isoformat()
        return success(row)
    except Exception as e:
        logger.error(f"/api/prices/{symbol} error: {e}")
        return error(str(e))


# ---------------------------------------------------------------------------
# GET /api/history/<symbol>?range=1h|6h|24h|7d
# ---------------------------------------------------------------------------
@app.route("/api/history/<symbol>")
def get_history(symbol):
    symbol = symbol.upper()
    time_range = request.args.get("range", "1h")
    valid_ranges = {"1h": "-1h", "6h": "-6h", "24h": "-24h", "7d": "-7d"}
    flux_range = valid_ranges.get(time_range, "-1h")

    try:
        client = get_influx()
        query_api = client.query_api()
        flux_query = f'''
from(bucket: "{INFLUX_BUCKET}")
  |> range(start: {flux_range})
  |> filter(fn: (r) => r["_measurement"] == "crypto_price")
  |> filter(fn: (r) => r["symbol"] == "{symbol}")
  |> filter(fn: (r) => r["_field"] == "price" or r["_field"] == "volume")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"])
  |> limit(n: 500)
'''
        tables = query_api.query(flux_query)
        client.close()

        records = []
        for table in tables:
            for record in table.records:
                records.append({
                    "time": record.get_time().isoformat(),
                    "price": record.values.get("price", 0),
                    "volume": record.values.get("volume", 0),
                })
        return success({"symbol": symbol, "range": time_range, "records": records})
    except Exception as e:
        logger.error(f"/api/history/{symbol} error: {e}")
        return error(str(e))


# ---------------------------------------------------------------------------
# GET /api/alerts?limit=50
# ---------------------------------------------------------------------------
@app.route("/api/alerts")
def get_alerts():
    limit = int(request.args.get("limit", 50))
    try:
        conn = get_mariadb()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, symbol, alert_type, price, threshold, message, sent_at "
                "FROM price_alerts ORDER BY sent_at DESC LIMIT %s",
                (limit,)
            )
            rows = cur.fetchall()
        conn.close()
        for row in rows:
            if row.get("sent_at"):
                row["sent_at"] = row["sent_at"].isoformat()
            row["price"] = float(row["price"])
            row["threshold"] = float(row["threshold"])
        return success(rows)
    except Exception as e:
        logger.error(f"/api/alerts error: {e}")
        return error(str(e))


# ---------------------------------------------------------------------------
# GET /api/system-status
# ---------------------------------------------------------------------------
@app.route("/api/system-status")
def system_status():
    services = {}

    # MariaDB check
    try:
        conn = get_mariadb()
        conn.ping()
        conn.close()
        services["mariadb"] = {"status": "online", "message": "Connected"}
    except Exception as e:
        services["mariadb"] = {"status": "offline", "message": str(e)}

    # InfluxDB check
    try:
        client = get_influx()
        health = client.health()
        client.close()
        services["influxdb"] = {"status": "online" if health.status == "pass" else "offline", "message": health.message}
    except Exception as e:
        services["influxdb"] = {"status": "offline", "message": str(e)}

    # Flask API itself
    services["flask_api"] = {"status": "online", "message": "Running"}

    # Binance: check last update time from MariaDB
    try:
        conn = get_mariadb()
        with conn.cursor() as cur:
            cur.execute("SELECT MAX(updated_at) as last_update FROM realtime_prices")
            row = cur.fetchone()
        conn.close()
        last_update = row.get("last_update") if row else None
        if last_update:
            delta = (datetime.utcnow() - last_update).total_seconds()
            if delta < 30:
                services["binance_ws"] = {"status": "online", "message": f"Last update {int(delta)}s ago"}
            else:
                services["binance_ws"] = {"status": "offline", "message": f"No update for {int(delta)}s"}
        else:
            services["binance_ws"] = {"status": "offline", "message": "No data yet"}
    except Exception as e:
        services["binance_ws"] = {"status": "offline", "message": str(e)}

    # Node-RED: just report as external
    services["nodered"] = {"status": "online", "message": "Check port 1880"}

    return success(services)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)