# How to Conduct Post-Migration IPv6 Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Migration, Validation, Testing, Post-Migration

Description: Conduct comprehensive post-migration validation to verify IPv6 is working correctly across DNS, connectivity, applications, security, and monitoring after completing IPv6 enablement.

## Introduction

Post-migration validation confirms that IPv6 migration goals were achieved and that no regressions exist for IPv4 users. A structured validation process covers DNS records, end-to-end connectivity, application behavior, security posture, and monitoring completeness.

## Validation Checklist Script

```bash
#!/bin/bash
# post_migration_validation.sh

# Run after IPv6 migration to validate all aspects

PASS=0
FAIL=0
WARN=0

ok()   { echo "  [PASS] $1"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN+1)); }

DOMAIN="${1:-example.com}"

echo "====================================="
echo "Post-Migration IPv6 Validation"
echo "Domain: $DOMAIN"
echo "Date: $(date)"
echo "====================================="

# Section 1: DNS Validation
echo ""
echo "--- DNS ---"

# Check AAAA records for key services
for subdomain in www api mail vpn; do
    hostname="${subdomain}.${DOMAIN}"
    AAAA=$(dig AAAA "$hostname" +short 2>/dev/null)
    A=$(dig A "$hostname" +short 2>/dev/null)

    if [ -n "$AAAA" ] && [ -n "$A" ]; then
        ok "$hostname: A=$A AAAA=$AAAA (dual-stack)"
    elif [ -n "$AAAA" ]; then
        warn "$hostname: AAAA only (no A record) - IPv6-only"
    elif [ -n "$A" ]; then
        fail "$hostname: A record only, missing AAAA"
    else
        warn "$hostname: No DNS records found"
    fi
done

# Section 2: Connectivity
echo ""
echo "--- Connectivity ---"

IPV6_TARGETS=("2001:4860:4860::8888" "2001:4860:4860::8844")
for target in "${IPV6_TARGETS[@]}"; do
    if ping -6 -c 2 -W 3 "$target" &>/dev/null; then
        ok "IPv6 reachability to $target"
    else
        fail "Cannot reach $target via IPv6"
    fi
done

# Section 3: Service Connectivity
echo ""
echo "--- Services ---"

for subdomain in www api; do
    hostname="${subdomain}.${DOMAIN}"
    if curl -6 -sf --max-time 10 "https://${hostname}/" -o /dev/null; then
        ok "HTTPS over IPv6: ${hostname}"
    else
        fail "HTTPS over IPv6 FAILED: ${hostname}"
    fi
done

# Section 4: Verify services listen on IPv6
echo ""
echo "--- Local Service Bindings ---"

for port in 80 443 22 25; do
    if ss -H -ltn6 "sport = :${port}" | grep -q .; then
        ok "TCP port $port listening on IPv6"
    else
        warn "TCP port $port: no IPv6 listener found"
    fi
done

if ss -H -ltn6 'sport = :53' | grep -q . || ss -H -lun6 'sport = :53' | grep -q .; then
    ok "Port 53 listening on IPv6"
else
    warn "Port 53: no IPv6 listener found"
fi

# Section 5: IPv6 traffic in logs
echo ""
echo "--- Traffic ---"

if [ -f /var/log/nginx/access.log ]; then
    IPV6_COUNT=$(grep -cE '^[0-9a-fA-F:]{3,39} ' /var/log/nginx/access.log 2>/dev/null || echo 0)
    if [ "$IPV6_COUNT" -gt 0 ]; then
        ok "IPv6 traffic in nginx logs: $IPV6_COUNT requests"
    else
        warn "No IPv6 traffic in nginx logs yet"
    fi
fi

# Section 6: Monitoring
echo ""
echo "--- Monitoring ---"

if curl -6 -sf "http://[::1]:9090/api/v1/query?query=up" -o /dev/null; then
    ok "Prometheus accessible over IPv6"
else
    warn "Prometheus not accessible over IPv6"
fi

if curl -6 -sf "http://[::1]:3000/api/health" -o /dev/null; then
    ok "Grafana accessible over IPv6"
else
    warn "Grafana not accessible over IPv6"
fi

# Final summary
echo ""
echo "====================================="
echo "Validation Results"
echo "PASS: $PASS | FAIL: $FAIL | WARN: $WARN"
if [ $FAIL -eq 0 ]; then
    echo "STATUS: VALIDATION PASSED"
    exit 0
else
    echo "STATUS: VALIDATION FAILED - $FAIL critical issues"
    exit 1
fi
```

## Functional Validation Tests

```python
#!/usr/bin/env python3
# post_migration_functional_test.py

import http.client
import socket
import ssl
import dns.resolver

DOMAIN = "example.com"

def resolve_aaaa(hostname: str) -> str | None:
    try:
        answers = dns.resolver.resolve(hostname, "AAAA")
        return answers[0].to_text()
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers, dns.resolver.LifetimeTimeout):
        return None

def resolve_a(hostname: str) -> str | None:
    try:
        answers = dns.resolver.resolve(hostname, "A")
        return answers[0].to_text()
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers, dns.resolver.LifetimeTimeout):
        return None

def https_get(hostname: str, ip_address: str, family: int, path: str = "/") -> tuple[int, str]:
    context = ssl.create_default_context()
    address = (ip_address, 443, 0, 0) if family == socket.AF_INET6 else (ip_address, 443)

    with socket.socket(family, socket.SOCK_STREAM) as sock:
        sock.settimeout(15)
        sock.connect(address)

        with context.wrap_socket(sock, server_hostname=hostname) as tls_sock:
            request = (
                f"GET {path} HTTP/1.1\r\n"
                f"Host: {hostname}\r\n"
                "Connection: close\r\n\r\n"
            )
            tls_sock.sendall(request.encode("ascii"))

            response = http.client.HTTPResponse(tls_sock)
            response.begin()
            body = response.read().decode("utf-8", errors="replace")
            return response.status, body

class TestDNS:
    def test_www_has_aaaa(self):
        assert resolve_aaaa(f"www.{DOMAIN}") is not None

    def test_api_has_aaaa(self):
        assert resolve_aaaa(f"api.{DOMAIN}") is not None

class TestConnectivity:
    def test_http_over_ipv6(self):
        ipv6 = resolve_aaaa(f"www.{DOMAIN}")
        assert ipv6, "No AAAA record"
        status, _ = https_get(f"www.{DOMAIN}", ipv6, socket.AF_INET6)
        assert status == 200

    def test_ipv6_socket_connects(self):
        ipv6 = resolve_aaaa(f"api.{DOMAIN}")
        assert ipv6
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.settimeout(10)
        try:
            sock.connect((ipv6, 443, 0, 0))
        finally:
            sock.close()

class TestApplicationBehavior:
    def test_api_returns_ipv6_client_ip_in_response(self):
        ipv6 = resolve_aaaa(f"api.{DOMAIN}")
        assert ipv6, "No AAAA record"
        _, body = https_get(f"api.{DOMAIN}", ipv6, socket.AF_INET6, "/api/v1/client-ip")
        assert ":" in body, f"Response does not contain IPv6 address: {body}"

    def test_ipv4_still_works(self):
        """Verify IPv4 was not broken by migration."""
        ipv4 = resolve_a(f"www.{DOMAIN}")
        assert ipv4, "No A record"
        status, _ = https_get(f"www.{DOMAIN}", ipv4, socket.AF_INET)
        assert status == 200
```

## Post-Migration Report Template

```markdown
# Post-Migration IPv6 Validation Report

**Date:** 2026-03-20
**Validated by:** Network Team

## Validation Results
- DNS (AAAA coverage): 12/12 services (100%)
- IPv6 connectivity: All external targets reachable
- Service endpoints: All responding over IPv6
- IPv6 traffic: 8% of total traffic (expected 5-15% week 1)
- Monitoring: All dashboards showing IPv6 data

## IPv4 Regression Check
- IPv4 traffic: Unchanged, no increase in error rates
- IPv4 service availability: 100%

## Outstanding Items
1. Mail server PTR records not yet configured for /48 (tracking issue #456)
2. VPN gateway IPv6 - vendor firmware update pending

## Sign-off
- Network Lead: Approved
- Security Lead: Approved
- Application Lead: Approved
```

## Conclusion

Post-migration validation uses automated scripts and functional tests to confirm AAAA DNS records are published, services respond over IPv6, applications correctly handle IPv6 client addresses, and IPv4 service remains unaffected. Run validation immediately after migration and again 24 hours later to catch issues that appear only under real traffic. Track IPv6 traffic percentage daily for the first two weeks to confirm adoption is trending in the right direction.
