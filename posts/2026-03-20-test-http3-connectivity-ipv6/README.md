# How to Test HTTP/3 Connectivity over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HTTP/3, QUIC, IPv6, Testing, Networking

Description: A comprehensive guide to testing HTTP/3 and QUIC connectivity over IPv6 using curl, browser tools, and dedicated testing utilities.

## Testing with curl

curl is the most accessible tool for testing HTTP/3 when it is built with QUIC/HTTP/3 support. The `--http3` flag was added in curl 7.66.0, and examples that use `--http3-only` need curl 7.88.0 or newer:

```bash
# Check if your curl supports HTTP/3

curl --version | grep -Ei "HTTP3|quic|ngtcp2|nghttp3|quiche"

# Test HTTP/3 over IPv6 (force IPv6 with -6)
curl -6 --http3 https://example.com -v 2>&1 | head -30

# Test with verbose QUIC debug output
curl -6 --http3-only https://example.com --trace-ascii - 2>&1 | grep -E "QUIC|h3|UDP"

# Test HTTP/3 to a specific IPv6 address
curl --http3 https://example.com --resolve "example.com:443:[2001:db8::1]" -v

# Show response time breakdown
curl -6 --http3 https://example.com \
  -w "time_namelookup: %{time_namelookup}\ntime_connect: %{time_connect}\ntime_appconnect: %{time_appconnect}\ntime_total: %{time_total}\n" \
  -o /dev/null -s
```

## Using quiche-client

Cloudflare's quiche library includes a test client:

```bash
# Run quiche-client from a cloned quiche checkout
git clone --recursive https://github.com/cloudflare/quiche
cd quiche
cargo run --bin quiche-client -- --no-verify "https://[2001:db8::1]/"

# Or run the published Docker image
docker run --rm cloudflare/quiche quiche-client --no-verify "https://[2001:db8::1]/"

# Test QUIC handshake to IPv6 address
quiche-client --no-verify "https://[2001:db8::1]/"

# Test with HTTP/3 ALPN only
quiche-client --no-verify --http-version HTTP/3 "https://[2001:db8::1]/"
```

## Using ngtcp2

ngtcp2 is a widely used QUIC implementation useful for testing:

```bash
# Test QUIC connection to IPv6 server (choose the client matching your TLS backend)
examples/wsslclient 2001:db8::1 443 https://example.com/

# With qlog output
examples/wsslclient --qlog-file=client.sqlog 2001:db8::1 443 https://example.com/
```

## Browser-Based Testing

```text
# Chrome/Edge - check QUIC connections
chrome://net-internals/#quic

# Check if site uses HTTP/3
1. Open Chrome DevTools (F12)
2. Network tab → right-click column header → enable "Protocol"
3. Reload page and look for "h3" in the Protocol column

# Firefox: check the HTTP table and HTTP Version column
about:networking#http
```

## Online Testing Tools

```bash
# Check HTTP/3 support from a public test site
curl "https://http3check.net/?host=example.com"

# Check Cloudflare's HTTP/3 test endpoint
curl -6 -I https://cloudflare-quic.com/ | grep -i alt-svc

# Alternative browser-based checker
# https://http3.net/
```

## Automated Testing Script

```python
#!/usr/bin/env python3
"""Test HTTP/3 availability over IPv6 for multiple endpoints."""

import subprocess
import sys

ENDPOINTS = [
    "https://example.com",
    "https://api.example.com",
]

def test_http3_ipv6(url):
    """Test HTTP/3 connectivity over IPv6 using curl."""
    cmd = [
        "curl",
        "-6",                    # Force IPv6
        "--http3-only",          # Fail if HTTP/3 not available
        "--max-time", "10",      # Timeout
        "--silent",
        "--show-error",
        "--output", "/dev/null",
        "--write-out", "%{http_version} %{http_code} %{time_total}",
        url
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode == 0:
            parts = result.stdout.strip().split()
            version, code, time_total = parts[0], parts[1], parts[2]
            return True, f"HTTP/{version} {code} in {float(time_total):.3f}s"
        else:
            return False, f"curl error {result.returncode}: {result.stderr.strip()}"
    except subprocess.TimeoutExpired:
        return False, "Timeout"

results = []
for endpoint in ENDPOINTS:
    ok, msg = test_http3_ipv6(endpoint)
    results.append(ok)
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {endpoint}: {msg}")

sys.exit(0 if all(results) else 1)
```

## Checking Alt-Svc Headers

HTTP/3 can be advertised via the Alt-Svc response header from HTTP/1.1 or HTTP/2:

```bash
# Check if server advertises HTTP/3
curl -6 -I https://example.com | grep -i alt-svc

# Expected: Alt-Svc: h3=":443"; ma=86400

# Parse the Alt-Svc header
curl -6 -I https://example.com 2>&1 | awk -F': ' '/alt-svc/i {print "HTTP/3 advertised:", $2}'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the HTTPS endpoints that expose HTTP/3 over IPv6, and pair the monitor with a QUIC-specific check such as the `curl --http3-only` script above. A plain HTTP monitor can still pass over HTTP/2, so the HTTP/3-only check is what detects when HTTP/3 availability drops while HTTP/2 remains functional.

## Conclusion

Testing HTTP/3 over IPv6 requires curl with QUIC support, quiche-client, or browser developer tools. Automate tests with shell scripts or Python to continuously validate that your servers correctly serve HTTP/3 to IPv6 clients.
