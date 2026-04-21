# How to Test IPv6 Connectivity with Online Tools (test-ipv6.com)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Testing, Online Tools, Connectivity, DNS, Test-ipv6.com

Description: Use test-ipv6.com and other online tools to verify IPv6 connectivity, DNS resolution, and Happy Eyeballs behavior from your network or server.

## Introduction

Online IPv6 testing tools provide an external perspective on your network's IPv6 capabilities. They test connectivity from your client or server to the internet, verify DNS resolution, and check whether IPv6-specific features like Happy Eyeballs work correctly. These are essential during IPv6 deployment and troubleshooting.

## test-ipv6.com

The most comprehensive IPv6 connectivity tester:

```bash
# Test your IPv6 connectivity from the command line

curl -s https://ipv6.icanhazip.com
# If this returns an IPv6 address, you have working IPv6

# test-ipv6.com IP endpoints
curl -s https://test-ipv6.com/ip/?callback=
curl -6 -s http://ipv6.test-ipv6.com/ip/?callback=

# Check your IPv6 address
curl -6 -s https://api6.ipify.org
```

## Checking IPv6 from Server Side

```bash
#!/bin/bash
# server-ipv6-test.sh

echo "=== Server IPv6 Connectivity Test ==="

# 1. What is my IPv4 address?
IPV4=$(curl -4 -s --max-time 5 https://api.ipify.org 2>/dev/null)
echo "IPv4: ${IPV4:-NOT AVAILABLE}"

# 2. What is my IPv6 address?
IPV6=$(curl -6 -s --max-time 5 https://api6.ipify.org 2>/dev/null)
echo "IPv6: ${IPV6:-NOT AVAILABLE}"

# 3. Default protocol test
PROTO_IP=$(curl -s --max-time 5 https://api64.ipify.org 2>/dev/null)
echo "Default: ${PROTO_IP:-NOT AVAILABLE}"

# 4. IPv6 connectivity score
echo ""
echo "=== IPv6 Connectivity Tests ==="

check_ipv6() {
    local name="$1"
    local addr="$2"
    if ping6 -c 1 -W 2 "$addr" &>/dev/null; then
        echo "[PASS] $name ($addr)"
    else
        echo "[FAIL] $name ($addr)"
    fi
}

check_ipv6 "Google IPv6 DNS" "2001:4860:4860::8888"
check_ipv6 "Cloudflare IPv6 DNS" "2606:4700:4700::1111"
check_ipv6 "Hurricane Electric" "2001:470:0:40::2"

# 5. IPv6 DNS resolution
echo ""
echo "=== IPv6 DNS Resolution ==="
for host in "ipv6.google.com" "ip6.me" "ipv6.icanhazip.com"; do
    result=$(dig AAAA "$host" +short 2>/dev/null | head -1)
    echo "$host: ${result:-NO AAAA RECORD}"
done
```

## Useful IPv6 Test URLs

```bash
# Get your IPv6 address
curl -6 https://ipv6.icanhazip.com
curl -6 https://api6.ipify.org
curl -6 https://v6.ident.me/

# IPv6-only endpoints (tests pure IPv6)
curl -6 https://ipv6.google.com
curl -6 https://ip6only.me/api/

# Dual-stack test (tests which protocol is preferred)
curl https://api64.ipify.org   # Returns IPv6 if curl connects over IPv6

# HTTP over IPv6
curl -6 -I https://ipv6.google.com
```

## Testing from a Web Application

```python
import requests

def test_ipv6_connectivity():
    """Test IPv6 connectivity from a Python application."""
    results = {}

    # Test IPv6-only endpoint
    try:
        # ipv6.icanhazip.com publishes only AAAA records, so this requires IPv6.
        session = requests.Session()
        resp = session.get('https://ipv6.icanhazip.com', timeout=5)
        results['ipv6_address'] = resp.text.strip()
        results['has_ipv6'] = True
    except Exception as e:
        results['has_ipv6'] = False
        results['ipv6_error'] = str(e)

    # Test IPv4 fallback
    try:
        resp = requests.get('https://ipv4.icanhazip.com', timeout=5)
        results['ipv4_address'] = resp.text.strip()
        results['has_ipv4'] = True
    except Exception as e:
        results['has_ipv4'] = False
        results['ipv4_error'] = str(e)

    return results

result = test_ipv6_connectivity()
print(f"IPv6: {result.get('ipv6_address', 'NOT AVAILABLE')}")
print(f"IPv4: {result.get('ipv4_address', 'NOT AVAILABLE')}")
```

## Third-Party IPv6 Testing Tools

```bash
# Ping6 to well-known IPv6 hosts
ping6 -c 3 ipv6.google.com
ping6 -c 3 2001:4860:4860::8888

# DNS lookup for AAAA records
dig AAAA google.com
dig AAAA @2001:4860:4860::8888 google.com  # Use IPv6 DNS server

# HTTP test over IPv6
curl -6 -I https://ipv6.google.com

# SSL/TLS test over IPv6
openssl s_client -connect '[2001:4860:4860::8888]:443' \
    -servername dns.google 2>/dev/null | head -5

# Test port 25 over IPv6 (mail)
nc -6 -z -v -w 3 gmail-smtp-in.l.google.com 25
```

## Automated IPv6 Readiness Check

```bash
#!/bin/bash
# ipv6-readiness.sh - Comprehensive IPv6 readiness assessment

SCORE=0
TOTAL=0

test_pass() {
    TOTAL=$((TOTAL+1))
    SCORE=$((SCORE+1))
    echo "[PASS] $1"
}

test_fail() {
    TOTAL=$((TOTAL+1))
    echo "[FAIL] $1"
}

# Basic connectivity
ping6 -c 1 -W 2 ::1 &>/dev/null && test_pass "IPv6 loopback" || test_fail "IPv6 loopback"
ip -6 route show default | grep -q "default" && test_pass "Default IPv6 route" || test_fail "Default IPv6 route"

# External connectivity
ping6 -c 1 -W 3 2001:4860:4860::8888 &>/dev/null && \
    test_pass "Internet IPv6 (Google DNS)" || test_fail "Internet IPv6 (Google DNS)"

# DNS
dig AAAA ipv6.google.com +short 2>/dev/null | grep -q ":" && \
    test_pass "AAAA DNS resolution" || test_fail "AAAA DNS resolution"

# HTTP over IPv6
curl -6 -s -o /dev/null -w "%{http_code}" --max-time 5 https://ipv6.google.com 2>/dev/null | \
    grep -q "200" && test_pass "HTTP(S) over IPv6" || test_fail "HTTP(S) over IPv6"

echo ""
echo "Score: $SCORE/$TOTAL"
[ "$SCORE" -eq "$TOTAL" ] && echo "IPv6: FULLY READY" || echo "IPv6: PARTIAL/NOT READY"
```

## Conclusion

Online IPv6 testing tools like test-ipv6.com, icanhazip.com, and ipify.org provide quick external validation of IPv6 connectivity. Combine these with command-line tests (`ping6`, `curl -6`, `dig AAAA`) for comprehensive coverage. Run the readiness check script after any IPv6 configuration change to confirm all aspects of IPv6 are working correctly.
