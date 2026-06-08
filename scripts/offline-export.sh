#!/bin/bash
# =============================================================================
# Crypto Monitor - Export Images for Offline Deploy
# Usage: ./scripts/offline-export.sh
# =============================================================================

set -e
OUTPUT="crypto-monitor-images.tar"

echo "📦 Export Docker images cho deploy offline..."
echo ""

IMAGES=$(docker compose config --images 2>/dev/null | sort -u | tr '\n' ' ')
echo "Images cần export:"
echo "$IMAGES" | tr ' ' '\n' | grep -v '^$' | sed 's/^/  - /'
echo ""

docker save $IMAGES -o "$OUTPUT"
echo "✅ Saved: $OUTPUT ($(du -sh $OUTPUT | cut -f1))"

echo "🗜️  Nén file..."
gzip -9 "$OUTPUT"
echo "✅ Nén xong: ${OUTPUT}.gz ($(du -sh ${OUTPUT}.gz | cut -f1))"
echo ""
echo "📋 Để deploy offline:"
echo "   1. Copy ${OUTPUT}.gz lên server"
echo "   2. gunzip ${OUTPUT}.gz"
echo "   3. docker load -i ${OUTPUT}"
echo "   4. docker compose up -d"
