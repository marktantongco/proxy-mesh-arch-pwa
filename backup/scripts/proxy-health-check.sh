#!/bin/bash
# Proxy Stack Health Check + Memory Monitor — runs every 5 minutes via cron
# Uses bash /dev/tcp (no curl dependency)

MEM_LOG="/home/x1/.local/share/memory-monitor.log"
MEM_AVAIL=$(awk '/MemAvailable:/ {printf "%d", $2/1024}' /proc/meminfo)
MEM_TOTAL=$(awk '/MemTotal:/ {printf "%d", $2/1024}' /proc/meminfo)
MEM_USED=$((MEM_TOTAL - MEM_AVAIL))
SWAP_TOTAL=$(awk '/SwapTotal:/ {printf "%d", $2/1024}' /proc/meminfo)
SWAP_USED=$(awk '/SwapUsed:/ {printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || awk '/SwapTotal:/{t=$2} /SwapFree:/{f=$2; printf "%d", (t-f)/1024}' /proc/meminfo)
ZRAM_DATA=$(zramctl --noheadings -o DATA 2>/dev/null | awk '{printf "%.0f", $1}')
ZRAM_COMPR=$(zramctl --noheadings -o COMPR 2>/dev/null | awk '{printf "%.0f", $1}')

# Log memory snapshot (once per hour, every 12th run at 5min interval)
if [ $(( $(date +%M) % 60 )) -eq 0 ]; then
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  if [ -n "$ZRAM_DATA" ] && [ "$ZRAM_DATA" -gt 0 ] 2>/dev/null; then
    echo "$TIMESTAMP MEM=${MEM_USED}MB/${MEM_TOTAL}MB AVAIL=${MEM_AVAIL}MB SWAP=${SWAP_USED}MB/${SWAP_TOTAL}MB ZRAM_DATA=${ZRAM_DATA}MB ZRAM_COMPR=${ZRAM_COMPR}MB" >> "$MEM_LOG"
  else
    echo "$TIMESTAMP MEM=${MEM_USED}MB/${MEM_TOTAL}MB AVAIL=${MEM_AVAIL}MB SWAP=${SWAP_USED}MB/${SWAP_TOTAL}MB" >> "$MEM_LOG"
  fi
  # Keep last 720 lines (30 days of hourly samples)
  tail -n 720 "$MEM_LOG" > "${MEM_LOG}.tmp" && mv "${MEM_LOG}.tmp" "$MEM_LOG"
fi

# Alert on low memory
if [ "$MEM_AVAIL" -lt 500 ]; then
  logger -p user.warning "memory-monitor: LOW MEMORY — ${MEM_AVAIL}MB available (threshold: 500MB)"
elif [ "$MEM_AVAIL" -lt 200 ]; then
  logger -p user.crit "memory-monitor: CRITICAL MEMORY — ${MEM_AVAIL}MB available"
fi

# Alert on high swap usage
if [ -n "$SWAP_USED" ] && [ "$SWAP_USED" -gt 2048 ] 2>/dev/null; then
  logger -p user.warning "memory-monitor: HIGH SWAP — ${SWAP_USED}MB used"
fi

check_port() {
  local host="$1" port="$2" name="$3"
  timeout 3 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null && return 0 || return 1
}

# Check mihomo (port 7890)
check_port 127.0.0.1 7890 "mihomo" || logger -p user.warning "proxy-health: mihomo (:7890) UNREACHABLE"

# Check 9Router (port 20128)
check_port 127.0.0.1 20128 "9Router" || logger -p user.warning "proxy-health: 9Router (:20128) UNREACHABLE"

# Check triune-proxy (port 20129)
check_port 127.0.0.1 20129 "triune-proxy" || logger -p user.warning "proxy-health: triune-proxy (:20129) UNREACHABLE"
