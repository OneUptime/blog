# How to Test IPv6 Migration in a Staging Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Staging, Testing, Migration, DevOps

Description: Set up a staging environment that mimics production IPv6 conditions, run comprehensive dual-stack tests, and create an IPv6-only test client to verify application behavior.

## Introduction

Testing IPv6 migration in staging before production reduces risk significantly. An effective staging test environment isolates IPv6-only client behavior, validates that applications handle IPv6 addresses correctly in all code paths, and simulates the dual-stack conditions end users experience via Happy Eyeballs.

## Step 1: Set Up IPv6-Enabled Staging Network

```bash
# Create a Docker network with IPv6 and no IPv4 address assignment

docker network create \
    --driver bridge \
    --ipv6 \
    --ipv4=false \
    --subnet fd00:172:28::/64 \
    staging-ipv6-net

# Verify the IPv6 subnet
docker network inspect staging-ipv6-net \
    --format '{{json .IPAM.Config}}'
```

## Step 2: Run the Application in IPv6-Only Mode

Testing with an IPv6-only client is the most effective way to find IPv4 assumptions:

```bash
# Start application container with IPv6-only network connectivity
docker run -d \
    --name app-ipv6-test \
    --network staging-ipv6-net \
    --env LISTEN_ADDR=:: \
    --env LISTEN_PORT=8080 \
    your-app:latest

# Get the container's IPv6 address
IPV6_ADDR=$(docker inspect app-ipv6-test \
    --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}')

echo "App IPv6: $IPV6_ADDR"

# Test from another container (IPv6-only)
docker run --rm --network staging-ipv6-net \
    curlimages/curl:latest -6 "http://[$IPV6_ADDR]:8080/health"
```

## Step 3: Automated IPv6 Test Suite

```python
#!/usr/bin/env python3
# tests/test_ipv6_staging.py

import socket
import urllib.request
import ssl
import pytest
import os
import ipaddress
import re

APP_IPV6 = os.environ.get("APP_IPV6_ADDR", "::1")
APP_PORT = int(os.environ.get("APP_PORT", "8080"))

def make_ipv6_request(path: str, expected_status: int = 200) -> str:
    """Make an HTTP request to the app over IPv6."""
    url = f"http://[{APP_IPV6}]:{APP_PORT}{path}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            assert resp.status == expected_status, \
                f"Expected {expected_status}, got {resp.status}"
            return resp.read().decode()
    except urllib.error.HTTPError as e:
        if e.code == expected_status:
            return ""
        raise

class TestIPv6Connectivity:
    def test_health_endpoint_reachable_over_ipv6(self):
        """Health endpoint responds over IPv6."""
        response = make_ipv6_request("/health")
        assert response  # Non-empty response

    def test_api_endpoint_over_ipv6(self):
        """API endpoint works over IPv6."""
        response = make_ipv6_request("/api/v1/status")
        assert "status" in response

    def test_client_ip_logged_as_ipv6(self):
        """Verify the application logs the IPv6 client address."""
        make_ipv6_request("/api/v1/whoami")
        # Check logs contain IPv6 address pattern
        import subprocess
        logs = subprocess.run(
            ["docker", "logs", "--tail=5", "app-ipv6-test"],
            capture_output=True, text=True
        ).stdout
        tokens = re.findall(r"[0-9A-Fa-f:]+", logs)
        has_ipv6 = False
        for token in tokens:
            if ":" not in token:
                continue
            try:
                if ipaddress.ip_address(token).version == 6:
                    has_ipv6 = True
                    break
            except ValueError:
                pass
        assert has_ipv6, f"IPv6 address not found in logs: {logs}"

    def test_ipv6_only_socket(self):
        """Direct TCP test via IPv6."""
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.settimeout(10)
        try:
            sock.connect((APP_IPV6, APP_PORT))
            sock.send(b"GET /health HTTP/1.0\r\nHost: test\r\n\r\n")
            response = sock.recv(1024).decode()
            assert "200 OK" in response
        finally:
            sock.close()

class TestIPv6AddressHandling:
    def test_ipv6_client_in_x_forwarded_for(self):
        """X-Forwarded-For with IPv6 address is parsed correctly."""
        req = urllib.request.Request(
            f"http://[{APP_IPV6}]:{APP_PORT}/api/v1/client-ip",
            headers={"X-Forwarded-For": "2001:db8::1"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode()
            assert "2001:db8::1" in body

    def test_database_accepts_ipv6_addresses(self):
        """Database operations with IPv6 addresses don't fail."""
        payload = '{"client_ip": "2001:db8::1", "action": "login"}'.encode()
        req = urllib.request.Request(
            f"http://[{APP_IPV6}]:{APP_PORT}/api/v1/log",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            assert resp.status in (200, 201)

    def test_rate_limiting_works_with_ipv6(self):
        """Rate limiting handles IPv6 client addresses."""
        for _ in range(5):
            make_ipv6_request("/api/v1/test", expected_status=200)
        # Should be rate-limited now (or not - depends on limits)
        # Main test is that it doesn't crash with IPv6
```

## Step 4: DNS Testing in Staging

```bash
# Test dual-stack DNS resolution in staging
dig AAAA staging.example.com @staging-dns-server +short

# Verify both A and AAAA records exist
host staging.example.com staging-dns-server

# Test AAAA resolution from staging client
dig AAAA api.staging.example.com +short
# Should return: fd00:172:28::10
```

## Step 5: Staging Test Report

After running tests, generate a report:

```bash
#!/bin/bash
echo "=== IPv6 Staging Test Report ==="
echo "Date: $(date)"
echo ""

# Run pytest and capture results
python -m pytest tests/test_ipv6_staging.py -v \
    --tb=short \
    --junitxml=/tmp/ipv6-test-results.xml

# Summary
read -r PASS FAIL ERROR SKIP < <(python - <<'PY'
import xml.etree.ElementTree as ET

root = ET.parse("/tmp/ipv6-test-results.xml").getroot()
stats = {"tests": 0, "failures": 0, "errors": 0, "skipped": 0}
for suite in root.iter("testsuite"):
    for key in stats:
        stats[key] += int(suite.attrib.get(key, 0))

passed = stats["tests"] - stats["failures"] - stats["errors"] - stats["skipped"]
print(passed, stats["failures"], stats["errors"], stats["skipped"])
PY
)
echo ""
echo "Results: $PASS passed, $FAIL failed, $ERROR errors, $SKIP skipped"
[ $((FAIL + ERROR)) -eq 0 ] && echo "READY FOR PRODUCTION" || echo "NOT READY - Fix failures first"
```

## Conclusion

Staging IPv6 migration tests should include IPv6-only client tests (remove IPv4 access to force IPv6 code paths), API endpoint verification over IPv6, client IP header parsing with IPv6 addresses, database schema validation for IPv6 address storage, and rate limiting behavior. The most valuable test is running the application in a Docker network where the test client has only IPv6 connectivity - this surfaces IPv4 assumptions that would never appear in dual-stack testing.
