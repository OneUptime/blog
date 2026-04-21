# How to Test CDN IPv6 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, CDN, Testing, Connectivity, curl, DNS

Description: A guide to testing CDN IPv6 connectivity from multiple angles - DNS verification, direct IPv6 connection tests, cache behavior, and global reachability.

Testing CDN IPv6 connectivity ensures that IPv6 clients worldwide can reach your content. This guide covers systematic testing from DNS through connection establishment to content delivery.

## Basic IPv6 Connectivity Tests

```bash
# Test 1: DNS returns AAAA records

dig AAAA cdn.example.com

# Test 2: Connect to CDN via IPv6
curl -6 -v https://cdn.example.com/ 2>&1 | grep -E "Connected|IPv6|AAAA"

# Test 3: Measure time-to-first-byte over IPv6
curl -6 -w "TTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" \
  -o /dev/null https://cdn.example.com/

# Test 4: Compare IPv4 vs IPv6 performance
echo "=== IPv4 ===" && curl -4 -w "%{time_total}s\n" -o /dev/null https://cdn.example.com/
echo "=== IPv6 ===" && curl -6 -w "%{time_total}s\n" -o /dev/null https://cdn.example.com/
```

## Verifying CDN Edge Server

```bash
# Check which CDN edge server is responding (IPv6)
curl -6 -v https://cdn.example.com/ 2>&1 | grep -Ei "^(< )?(server|x-cache|cf-ray|x-served-by):"

# Get the IPv6 address of the edge server
curl -6 -v https://cdn.example.com/ 2>&1 | grep "Connected to"
# Output: Connected to cdn.example.com (2606:4700::1234) port 443

# Identify edge location
# Cloudflare: decode CF-RAY header (e.g., CF-RAY: xxxx-LGA = New York)
# Fastly: X-Served-By header shows POP
```

## Testing Cache Behavior Over IPv6

```bash
# First request: often MISS if the object is not already cached
curl -6 -D - -o /dev/null https://cdn.example.com/asset.js | grep -Ei "^(x-cache|cf-cache-status|age):"

# Second request: should be HIT when the object is cacheable and the same edge handles it
curl -6 -D - -o /dev/null https://cdn.example.com/asset.js | grep -Ei "^(x-cache|cf-cache-status|age):"

# Verify cache headers
curl -6 -I https://cdn.example.com/asset.js
# Check: Cache-Control, Expires, ETag, Age headers
```

## Global IPv6 Reachability Testing

Test from multiple geographic locations:

```bash
# Using online tools:
# https://globalping.io (test from multiple probes)

# Globalping CLI (Ubuntu/Debian install example)
curl -s https://packagecloud.io/install/repositories/jsdelivr/globalping/script.deb.sh | sudo bash
sudo apt install globalping

globalping http https://cdn.example.com/health \
  --limit 10 \
  --ipv6 \
  --from "world"

# Check results for IPv6 connectivity from:
# - North America
# - Europe
# - Asia Pacific
# - South America
```

## Automated IPv6 CDN Test Script

```bash
#!/bin/bash
# test-cdn-ipv6.sh

CDN_HOST="cdn.example.com"
TEST_PATH="/health"
EXPECTED_STATUS="200"

run_test() {
  local name=$1
  local cmd=$2
  local expected=$3
  local result=$(eval $cmd 2>/dev/null)

  if echo "$result" | grep -q "$expected"; then
    echo "PASS: $name"
  else
    echo "FAIL: $name (got: $result)"
  fi
}

echo "=== CDN IPv6 Connectivity Tests ==="

# DNS Test
run_test "AAAA record exists" \
  "dig +short AAAA $CDN_HOST" \
  ":"

# Connection Test
run_test "IPv6 HTTP connection" \
  "curl -6 -s -o /dev/null -w '%{http_code}' https://$CDN_HOST$TEST_PATH" \
  "$EXPECTED_STATUS"

# Performance Test
TTFB=$(curl -6 -s -o /dev/null -w "%{time_starttransfer}" https://$CDN_HOST$TEST_PATH)
TTFB_STATUS=$?
echo "INFO: IPv6 TTFB = ${TTFB}s"
if [ "$TTFB_STATUS" -ne 0 ]; then
  echo "FAIL: IPv6 TTFB request failed"
elif awk -v ttfb="$TTFB" 'BEGIN {exit !(ttfb < 1.0)}'; then
  echo "PASS: IPv6 TTFB under 1 second ($TTFB)"
else
  echo "WARN: IPv6 TTFB over 1 second ($TTFB)"
fi

# Cache Test
CACHE_STATUS=$(curl -6 -s -D - https://$CDN_HOST/cacheable-asset.css -o /dev/null | \
  grep -Ei "^(x-cache|cf-cache-status):" | awk '{print $2}')
echo "INFO: Cache status = $CACHE_STATUS"

echo "=== Tests Complete ==="
```

## Testing IPv6 with Different Clients

```bash
# Test with Python urllib, forcing IPv6 address resolution
python3 -c "
import socket
import urllib.request

orig_getaddrinfo = socket.getaddrinfo

def getaddrinfo_ipv6(host, port, family=0, type=0, proto=0, flags=0):
    return orig_getaddrinfo(host, port, socket.AF_INET6, type, proto, flags)

socket.getaddrinfo = getaddrinfo_ipv6
with urllib.request.urlopen('https://cdn.example.com/') as response:
    print('Status:', response.status)
"

# Test with wget
wget -6 -O - https://cdn.example.com/health

# Test with httpie (uses the system resolver; use curl -6 or wget -6 to force IPv6)
http --follow --check-status GET https://cdn.example.com/
```

## Continuous IPv6 CDN Monitoring

```yaml
# blackbox.yml
modules:
  http_ipv6:
    prober: http
    timeout: 10s
    http:
      preferred_ip_protocol: ip6
      ip_protocol_fallback: false    # Fail if can't use IPv6
      valid_status_codes: [200]
      fail_if_not_ssl: true
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: cdn_ipv6
    metrics_path: /probe
    params:
      module: [http_ipv6]
    static_configs:
      - targets:
          - https://cdn.example.com/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

Regular CDN IPv6 testing from both synthetic probes and real user locations ensures consistent delivery quality for the growing population of IPv6-connected users.
