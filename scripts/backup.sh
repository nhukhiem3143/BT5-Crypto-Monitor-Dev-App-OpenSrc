#!/bin/bash
# =============================================================================
# Crypto Monitor - Backup Script
# Usage: ./scripts/backup.sh
# =============================================================================

set -e
BACKUP_DIR="$(pwd)/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Bắt đầu backup vào: $BACKUP_DIR"

backup_volume() {
  local volume=$1
  local name=$2
  echo "  → Backup $name..."
  docker run --rm \
    -v "${volume}:/data" \
    -v "${BACKUP_DIR}:/backup" \
    alpine tar czf "/backup/${name}.tar.gz" -C /data .
  echo "  ✅ $name xong: $(ls -lh ${BACKUP_DIR}/${name}.tar.gz | awk '{print $5}')"
}

backup_volume "crypto-monitor_mariadb_data"  "mariadb"
backup_volume "crypto-monitor_influxdb_data" "influxdb"
backup_volume "crypto-monitor_grafana_data"  "grafana"
backup_volume "crypto-monitor_nodered_data"  "nodered"

echo ""
echo "✅ Backup hoàn tất!"
ls -lh "$BACKUP_DIR/"