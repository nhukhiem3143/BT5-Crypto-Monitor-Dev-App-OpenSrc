import React, { useState, useEffect, useCallback, useRef } from 'react'

// ============================================================
// Constants
// ============================================================
const API_BASE = '/api'
const REFRESH_PRICES = 3000   // 3s
const REFRESH_ALERTS = 15000  // 15s
const REFRESH_STATUS = 20000  // 20s

const COIN_META = {
  BTCUSDT: { name: 'Bitcoin',  short: 'BTC', color: '#f0b90b', icon: '₿', high: 120000, low: 100000 },
  ETHUSDT: { name: 'Ethereum', short: 'ETH', color: '#627eea', icon: 'Ξ', high: 7000,   low: 4000   },
  SOLUSDT: { name: 'Solana',   short: 'SOL', color: '#9945ff', icon: '◎', high: 300,    low: 100    },
}

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']

// ============================================================
// Utils
// ============================================================
const fmt = (n, decimals = 2) =>
  n != null && n !== 0
    ? Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : '---'

const fmtTime = iso => {
  if (!iso) return '--:--:--'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour12: false })
}

const fmtDateTime = iso => {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

// ============================================================
// Hooks
// ============================================================
function useFetch(url, interval) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url)
      const json = await res.json()
      setData(json.data ?? json)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, interval)
    return () => clearInterval(t)
  }, [fetchData, interval])

  return { data, error, loading, refetch: fetchData }
}

// ============================================================
// Price Card
// ============================================================
function PriceCard({ symbol, price, volume, updatedAt }) {
  const meta = COIN_META[symbol] || {}
  const prevRef = useRef(null)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (prevRef.current !== null && price !== prevRef.current) {
      setFlash(price > prevRef.current ? 'up' : 'down')
      const t = setTimeout(() => setFlash(null), 800)
      return () => clearTimeout(t)
    }
    prevRef.current = price
  }, [price])

  const pct = price && meta.low ? (((price - meta.low) / (meta.high - meta.low)) * 100).toFixed(1) : 0
  const isHigh = price >= meta.high
  const isLow  = price <= meta.low

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isHigh ? 'rgba(246,70,93,0.5)' : isLow ? 'rgba(246,70,93,0.5)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      animation: 'slideInUp 0.4s ease',
      transition: 'border-color 0.3s',
    }}>
      {/* Color accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: meta.color, opacity: 0.8 }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24, color: meta.color }}>{meta.icon}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
              {meta.short}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {symbol}
            </div>
          </div>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: price > 0 ? 'var(--green)' : 'var(--text-muted)',
          animation: price > 0 ? 'blink 2s infinite' : 'none',
        }} />
      </div>

      {/* Price */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 32,
        textAlign: 'center',
        fontWeight: 700,
        color: flash === 'up' ? 'var(--green)' : flash === 'down' ? 'var(--red)' : 'var(--text-primary)',
        transition: 'color 0.3s',
        letterSpacing: '-0.5px',
        marginBottom: 8,
      }}>
        ${fmt(price, price > 100 ? 2 : 4)}
      </div>

      {/* Volume */}
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
        VOL 24H: {fmt(volume, 2)}
      </div>

      {/* Threshold bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
          <span>LOW ${fmt(meta.low, 0)}</span>
          <span>HIGH ${fmt(meta.high, 0)}</span>
        </div>
        <div style={{ height: 4, background: 'var(--bg-surface)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: isHigh ? 'var(--red)' : isLow ? 'var(--red)' : meta.color,
            borderRadius: 2,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Alert badge */}
      {(isHigh || isLow) && (
        <div style={{
          padding: '4px 10px',
          borderRadius: 2,
          background: 'var(--red-dim)',
          border: '1px solid var(--red)',
          color: 'var(--red)',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          display: 'inline-block',
          animation: 'blink 1s infinite',
        }}>
          ⚠ {isHigh ? 'ABOVE HIGH THRESHOLD' : 'BELOW LOW THRESHOLD'}
        </div>
      )}

      {/* Updated */}
      <div style={{ position: 'absolute', bottom: 10, right: 14, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {fmtTime(updatedAt)}
      </div>
    </div>
  )
}

// ============================================================
// Status Badge
// ============================================================
function StatusBadge({ name, status, message }) {
  const isOnline = status === 'online'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      background: 'var(--bg-surface)',
      border: `1px solid ${isOnline ? 'rgba(0,192,118,0.25)' : 'rgba(246,70,93,0.25)'}`,
      borderRadius: 'var(--radius)',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: isOnline ? 'var(--green)' : 'var(--red)',
        flexShrink: 0,
        animation: isOnline ? 'pulse-green 2s infinite' : 'pulse-red 2s infinite',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{name}</div>
        {message && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message}</div>}
      </div>
      <span style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        padding: '2px 8px',
        borderRadius: 2,
        background: isOnline ? 'var(--green-dim)' : 'var(--red-dim)',
        color: isOnline ? 'var(--green)' : 'var(--red)',
        fontWeight: 700,
      }}>
        {isOnline ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  )
}

// ============================================================
// Alert Row
// ============================================================
function AlertRow({ alert }) {
  const meta = COIN_META[alert.symbol] || {}
  const isHigh = alert.alert_type === 'HIGH'
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '30px 90px 80px 1fr 1fr 160px',
      gap: 12,
      padding: '10px 16px',
      borderBottom: '1px solid var(--border)',
      alignItems: 'center',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      animation: 'fadeIn 0.3s ease',
    }}>
      <span style={{ fontSize: 16 }}>{isHigh ? '🔴' : '🔵'}</span>
      <span style={{ color: meta.color, fontWeight: 700 }}>{alert.symbol?.replace('USDT', '')}</span>
      <span style={{
        padding: '2px 6px',
        borderRadius: 2,
        background: isHigh ? 'var(--red-dim)' : 'var(--blue-dim)',
        color: isHigh ? 'var(--red)' : 'var(--blue)',
        fontSize: 10,
        fontWeight: 700,
      }}>{alert.alert_type}</span>
      <span style={{ color: 'var(--text-primary)' }}>${fmt(alert.price)}</span>
      <span style={{ color: 'var(--text-secondary)' }}>@${fmt(alert.threshold)}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{fmtDateTime(alert.sent_at)}</span>
    </div>
  )
}

// ============================================================
// Section Header
// ============================================================
function SectionHeader({ title, subtitle, live }) {
  return (
    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '0.1em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
          {title}
        </h2>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {live && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'blink 1.5s infinite' }} />
          LIVE
        </div>
      )}
    </div>
  )
}

// ============================================================
// Grafana Chart Section
// ============================================================
// ============================================================
// Grafana Chart Section
// ============================================================

// Panel IDs — thay bằng đúng ID trong Grafana của bạn
// Vào Grafana > panel > Edit > URL sẽ thấy &panelId=XX
const GRAFANA_BASE = 'http://192.168.100.2:3000'
const GRAFANA_PARAMS = 'orgId=1&refresh=5s&from=now-1h&to=now&theme=dark'

const PANEL_IDS = {
  PRICE:      1,   // "SOLUSDT Price" line chart
  CURRENT:    2,   // "Current Price" stat panel
  VOLUME:     3,   // "Volume 24H" stat panel
  ALL_COINS:  4,   // "All Coins - Price Comparison" panel
}

function GrafanaPanel({ panelId, title, height = 300 }) {
  const src = `${GRAFANA_BASE}/d-solo/crypto-prices/crypto-monitor?${GRAFANA_PARAMS}&panelId=${panelId}`
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      height,
      background: 'var(--bg-card)',
      position: 'relative',
    }}>
      {/* Overlay chặn click chuột phải / drag vào Grafana */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        pointerEvents: 'none', // cho phép scroll nhưng không redirect
      }} />
      <iframe
        src={src}
        width="100%"
        height="100%"
        frameBorder="0"
        title={title}
        style={{ display: 'block' }}
        // KHÔNG dùng allowFullScreen để hạn chế interaction
        sandbox="allow-scripts allow-same-origin" // chặn form submit, popups
      />
    </div>
  )
}

function GrafanaSection() {
  const [activeSymbol, setActiveSymbol] = useState('BTCUSDT')

  // Map symbol → var-symbol value Grafana dùng
  const varSymbol = activeSymbol // e.g. "BTCUSDT"

  // URL với variable Grafana (nếu dashboard dùng variable $symbol)
  const panelSrcWithVar = (panelId) =>
    `${GRAFANA_BASE}/d-solo/crypto-prices/crypto-monitor?${GRAFANA_PARAMS}&panelId=${panelId}&var-symbol=${varSymbol}`

  return (
    <div>
      <SectionHeader title="Price History" subtitle="Powered by Grafana + InfluxDB" />

      {/* ── Coin Selector ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {SYMBOLS.map(s => {
          const m = COIN_META[s]
          return (
            <button
              key={s}
              onClick={() => setActiveSymbol(s)}
              style={{
                padding: '6px 16px',
                border: `1px solid ${activeSymbol === s ? m.color : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                background: activeSymbol === s ? `${m.color}20` : 'var(--bg-surface)',
                color: activeSymbol === s ? m.color : 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ marginRight: 6 }}>{COIN_META[s].icon}</span>
              {m.short}
            </button>
          )
        })}
      </div>

      {/* ── 3 panels riêng theo coin được chọn ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 180px 180px', // chart lớn + 2 stat nhỏ
        gap: 12,
        marginBottom: 16,
      }}>
        {/* Price line chart */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: 600, background: 'var(--bg-card)' }}>
          <iframe
            key={`price-${activeSymbol}`} // re-mount khi đổi coin
            src={panelSrcWithVar(PANEL_IDS.PRICE)}
            width="100%" height="100%"
            frameBorder="0"
            title={`${activeSymbol} Price Chart`}
            style={{ display: 'block' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {/* Current Price stat */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: 300, background: 'var(--bg-card)' }}>
          <iframe
            key={`current-${activeSymbol}`}
            src={panelSrcWithVar(PANEL_IDS.CURRENT)}
            width="100%" height="100%"
            frameBorder="0"
            title={`${activeSymbol} Current Price`}
            style={{ display: 'block' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {/* Volume stat */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: 300, background: 'var(--bg-card)' }}>
          <iframe
            key={`volume-${activeSymbol}`}
            src={panelSrcWithVar(PANEL_IDS.VOLUME)}
            width="100%" height="100%"
            frameBorder="0"
            title={`${activeSymbol} Volume`}
            style={{ display: 'block' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>

      {/* ── Biểu đồ tổng luôn hiện ── */}
      <div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>
          ALL COINS — PRICE COMPARISON
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: 600, background: 'var(--bg-card)' }}>
          <iframe
            src={`${GRAFANA_BASE}/d-solo/crypto-prices/crypto-monitor?${GRAFANA_PARAMS}&panelId=${PANEL_IDS.ALL_COINS}`}
            width="100%" height="100%"
            frameBorder="0"
            title="All Coins Comparison"
            style={{ display: 'block' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main App
// ============================================================
export default function App() {
  const { data: pricesData, loading: pLoading } = useFetch(`${API_BASE}/prices`, REFRESH_PRICES)
  const { data: alertsData, loading: aLoading } = useFetch(`${API_BASE}/alerts?limit=20`, REFRESH_ALERTS)
  const { data: statusData, loading: sLoading } = useFetch(`${API_BASE}/system-status`, REFRESH_STATUS)

  const pricesMap = {}
  if (Array.isArray(pricesData)) {
    pricesData.forEach(p => { pricesMap[p.symbol] = p })
  }

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const serviceMap = {
    'Binance WS':  statusData?.binance_ws,
    'Node-RED':    statusData?.nodered,
    'MariaDB':     statusData?.mariadb,
    'InfluxDB':    statusData?.influxdb,
    'Flask API':   statusData?.flask_api,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(9,11,15,0.95)',
        backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', animation: 'blink 2s infinite' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
            CRYPTO<span style={{ color: 'var(--accent)' }}>MONITOR</span>
          </span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
            BTC · ETH · SOL
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            {now.toLocaleString('en-US', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' })} ICT
          </div>
          <a href="http://localhost:1880" target="_blank" rel="noreferrer"
            style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--accent)', borderRadius: 'var(--radius)' }}>
            NODE-RED
          </a>
          <a href="http://localhost:3000" target="_blank" rel="noreferrer"
            style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#f5a623', textDecoration: 'none', padding: '4px 10px', border: '1px solid #f5a623', borderRadius: 'var(--radius)' }}>
            GRAFANA
          </a>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 32px' }}>

        {/* ── Price Cards ── */}
        <section style={{ marginBottom: 32 }}>
          <SectionHeader title="Live Prices" subtitle="Data from Binance WebSocket via Node-RED" live />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {SYMBOLS.map(sym => {
              const d = pricesMap[sym] || {}
              return (
                <PriceCard
                  key={sym}
                  symbol={sym}
                  price={d.price ? parseFloat(d.price) : 0}
                  volume={d.volume ? parseFloat(d.volume) : 0}
                  updatedAt={d.updated_at}
                />
              )
            })}
          </div>
        </section>

        {/* ── Chart + Status row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, marginBottom: 32, alignItems: 'start' }}>

          {/* Grafana Chart */}
          <section>
            <GrafanaSection />
          </section>

          {/* System Status */}
          <section>
            <SectionHeader title="System Status" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(serviceMap).map(([name, info]) => (
                <StatusBadge
                  key={name}
                  name={name}
                  status={info?.status || 'offline'}
                  message={info?.message || (sLoading ? 'Loading...' : 'No data')}
                />
              ))}
            </div>
            {/* Threshold Reference */}
<div
  style={{
    marginTop: 20,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px',
    minHeight: '180px',      // tăng chiều cao
    width: '100%',           // chiếm hết chiều ngang cột
  }}
>
  <div
    style={{
      fontSize: 16,          // 12 -> 16
      fontWeight: 800,
      color: 'var(--text-secondary)',
      letterSpacing: '0.15em',
      marginBottom: 16
    }}
  >
    ALERT THRESHOLDS
  </div>

  {Object.entries(COIN_META).map(([sym, m]) => (
    <div
      key={sym}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 12,
        fontSize: 15,        // 12 -> 15
        fontFamily: 'var(--font-mono)',
      }}
    >
      <span style={{ color: m.color, fontWeight: 700 }}>
        {m.short}
      </span>

      <span style={{ color: 'var(--green)', fontWeight: 700 }}>
        ▲{fmt(m.high, 0)}
      </span>

      <span style={{ color: 'var(--red)', fontWeight: 700 }}>
        ▼{fmt(m.low, 0)}
      </span>
    </div>
  ))}
</div>
          </section>
        </div>

        {/* ── Alert History ── */}
        <section>
          <SectionHeader title="Alert History" subtitle="Recent price threshold breaches" />
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '30px 90px 80px 1fr 1fr 160px',
              gap: 12,
              padding: '10px 16px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border)',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}>
              <span>#</span>
              <span>COIN</span>
              <span>TYPE</span>
              <span>PRICE</span>
              <span>THRESHOLD</span>
              <span>TIME</span>
            </div>

            {aLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                Loading alerts...
              </div>
            ) : !alertsData || alertsData.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                No alerts triggered yet. System monitoring prices...
              </div>
            ) : (
              alertsData.map(alert => <AlertRow key={alert.id} alert={alert} />)
            )}
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '16px 32px', marginTop: 40 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            CRYPTO MONITOR v1.0 — Docker Compose Stack
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            Data: Binance WS · Storage: MariaDB + InfluxDB · Viz: Grafana
          </span>
        </div>
      </footer>
    </div>
  )
}