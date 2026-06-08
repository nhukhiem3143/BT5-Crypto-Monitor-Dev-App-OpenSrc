#!/bin/bash
# =============================================================================
# Crypto Monitor - Restore Script
# Usage: ./scripts/restore.sh <backup_dir>
# Example: ./scripts/restore.sh backups/20260601_120000
# =============================================================================

set -e
BACKUP_DIR="${1:-$(ls -dt backups/*/ 2>/dev/null | head -1)}"

if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Không tìm thấy backup. Usage: $0 <backup_dir>"
  exit 1
fi

echo "🔄 Restore từ: $BACKUP_DIR"
echo "⚠️  Dừng stack trước khi restore..."
docker compose down

restore_volume() {
  local volume=$1
  local name=$2
  local file="${BACKUP_DIR}/${name}.tar.gz"
  if [ ! -f "$file" ]; then
    echo "  ⚠️  Bỏ qua $name (không tìm thấy file)"
    return
  fi
  echo "  → Restore $name..."
  docker run --rm \
    -v "${volume}:/data" \
    -v "$(pwd)/${file}:/backup/${name}.tar.gz" \
    alpine sh -c "cd /data && tar xzf /backup/${name}.tar.gz"
  echo "  ✅ $name xong"
}

restore_volume "crypto-monitor_mariadb_data"  "mariadb"
restore_volume "crypto-monitor_influxdb_data" "influxdb"
restore_volume "crypto-monitor_grafana_data"  "grafana"
restore_volume "crypto-monitor_nodered_data"  "nodered"

echo ""
echo "🚀 Khởi động lại hệ thống..."
docker compose up -d
echo "✅ Restore hoàn tất!"
docker compose ps