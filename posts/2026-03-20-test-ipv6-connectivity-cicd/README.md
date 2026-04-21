# How to Test IPv6 Connectivity in CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, CI/CD, Testing, Connectivity, DevOps, Pipeline

Description: Write CI/CD pipeline steps that verify IPv6 connectivity, test dual-stack application behavior, and validate IPv6 address configuration in automated build environments.

## Introduction

Testing IPv6 connectivity in CI/CD pipelines ensures that your applications behave correctly in dual-stack and IPv6-only environments before deployment. This guide provides reusable test scripts and pipeline configurations for comprehensive IPv6 connectivity verification.

## Reusable IPv6 Connectivity Test Script

```bash
#!/bin/bash
# test_ipv6_connectivity.sh

# Comprehensive IPv6 connectivity test for CI/CD pipelines

set -e

PASS=0
FAIL=0
WARN=0

log_pass() { echo "[PASS] $1"; PASS=$((PASS+1)); }
log_fail() { echo "[FAIL] $1"; FAIL=$((FAIL+1)); }
log_warn() { echo "[WARN] $1"; WARN=$((WARN+1)); }

echo "=== IPv6 Connectivity Test Suite ==="
echo "Date: $(date -u)"
echo "Host: $(hostname)"
echo ""

# Test 1: IPv6 is not disabled
if IPV6_DISABLED=$(sysctl -n net.ipv6.conf.all.disable_ipv6 2>/dev/null); then
    if [ "$IPV6_DISABLED" = "0" ]; then
        log_pass "IPv6 is enabled (disable_ipv6=0)"
    else
        log_fail "IPv6 is disabled (disable_ipv6=$IPV6_DISABLED)"
    fi
else
    log_warn "IPv6 disable_ipv6 sysctl not available (may be container)"
fi

# Test 2: Global IPv6 address exists
if ip -6 addr show scope global 2>/dev/null | grep -q inet6; then
    IPV6_ADDR=$(ip -6 addr show scope global | grep inet6 | awk '{print $2}' | head -1)
    log_pass "Global IPv6 address found: $IPV6_ADDR"
else
    log_warn "No global IPv6 address (link-local only)"
fi

# Test 3: IPv6 default route exists
if ip -6 route show default 2>/dev/null | grep -q default; then
    log_pass "IPv6 default route present"
else
    log_warn "No IPv6 default route"
fi

# Test 4: IPv6 DNS resolution works
if dig AAAA ipv6.google.com +short 2>/dev/null | grep -q ":"; then
    log_pass "IPv6 DNS (AAAA) resolution works"
else
    log_fail "IPv6 DNS resolution failed"
fi

# Test 5: IPv6 external connectivity
if EXTERNAL_IPV6=$(curl -6 -fsS --max-time 10 https://ipv6.icanhazip.com 2>/dev/null) && echo "$EXTERNAL_IPV6" | grep -q ":"; then
    log_pass "External IPv6 connectivity OK (using $EXTERNAL_IPV6)"
else
    log_warn "No external IPv6 connectivity (may be expected in some CI environments)"
fi

# Test 6: IPv6 socket binding works
if python3 -c "
import socket
s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
s.bind(('::', 0))
s.close()
print('OK')
" 2>/dev/null | grep -q OK; then
    log_pass "IPv6 socket binding works"
else
    log_fail "IPv6 socket binding failed"
fi

echo ""
echo "=== Results ==="
echo "PASS: $PASS | FAIL: $FAIL | WARN: $WARN"

if [ $FAIL -gt 0 ]; then
    echo "RESULT: FAILED"
    exit 1
else
    echo "RESULT: PASSED (with $WARN warnings)"
    exit 0
fi
```

## GitHub Actions IPv6 Test Workflow

```yaml
# .github/workflows/ipv6-tests.yml

name: IPv6 Connectivity Tests

on: [push, pull_request]

jobs:
  ipv6-unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Enable Docker IPv6
        run: |
          echo '{"ipv6": true, "fixed-cidr-v6": "fd00:dead:beef::/64"}' | \
            sudo tee /etc/docker/daemon.json
          sudo systemctl restart docker

      - name: Run IPv6 connectivity tests in Docker
        run: |
          docker network create --ipv6 --subnet fd00:1::/64 test-net
          docker run --rm --network test-net ubuntu:22.04 bash -c "
            apt-get update -q && apt-get install -y iproute2 curl python3 dnsutils -q
            ip -6 addr show
            python3 -c \"
import socket
s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
s.bind(('::', 0))
print('IPv6 socket OK:', s.getsockname())
s.close()
\"
          "

  ipv6-application-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install pytest requests aiohttp

      - name: Run IPv6 unit tests
        run: python -m pytest tests/test_ipv6_*.py -v
```

## Python IPv6 Test Suite

```python
# tests/test_ipv6_connectivity.py
# pytest test suite for IPv6 connectivity

import socket
import pytest

def _has_external_ipv6() -> bool:
    """Check if external IPv6 connectivity is available."""
    import urllib.request
    try:
        with urllib.request.urlopen('https://ipv6.icanhazip.com', timeout=10) as response:
            return ':' in response.read().decode().strip()
    except Exception:
        return False

def test_ipv6_socket_creation():
    """Test that IPv6 sockets can be created."""
    s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    s.close()

def test_ipv6_socket_binding():
    """Test that a server can bind to an IPv6 address."""
    s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind(('::', 0))
        port = s.getsockname()[1]
        assert port > 0
    finally:
        s.close()

def test_ipv6_loopback_connectivity():
    """Test that IPv6 loopback works."""
    # Create a server on ::1
    server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('::1', 0))
    server.listen(1)
    port = server.getsockname()[1]

    # Connect to it
    client = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    client.settimeout(5)
    client.connect(('::1', port))

    conn, addr = server.accept()
    assert addr[0] == '::1'

    conn.close()
    client.close()
    server.close()

def test_ipv6_dual_stack_server():
    """Test that a dual-stack server accepts both IPv4 and IPv6."""
    if not socket.has_dualstack_ipv6():
        pytest.skip("Dual-stack IPv6 sockets are not supported")

    server = socket.create_server(('::', 0), family=socket.AF_INET6, dualstack_ipv6=True)
    server.settimeout(5)
    port = server.getsockname()[1]

    try:
        for host in ('::1', '127.0.0.1'):
            client = socket.create_connection((host, port), timeout=5)
            try:
                conn, addr = server.accept()
                conn.close()
            finally:
                client.close()
    finally:
        server.close()

@pytest.mark.skipif(
    not _has_external_ipv6(),
    reason="No external IPv6 connectivity available"
)
def test_external_ipv6():
    """Test external IPv6 connectivity (skipped if unavailable)."""
    import urllib.request
    with urllib.request.urlopen('https://ipv6.icanhazip.com', timeout=10) as response:
        addr = response.read().decode().strip()
    assert ':' in addr  # Must be an IPv6 address
```

## GitLab CI Integration

```yaml
# .gitlab-ci.yml snippet
ipv6-tests:
  stage: test
  image: ubuntu:22.04
  script:
    - apt-get update -q && apt-get install -y python3 python3-pytest iproute2 curl dnsutils -q
    - chmod +x test_ipv6_connectivity.sh
    - ./test_ipv6_connectivity.sh
    - python3 -m pytest tests/test_ipv6_connectivity.py -v
```

## Conclusion

Testing IPv6 connectivity in CI/CD pipelines requires a layered approach: kernel-level sysctl checks, socket binding tests, DNS resolution verification, and optional external connectivity tests. The provided shell script and Python test suite cover these layers and can be integrated into any CI/CD platform. Use `@pytest.mark.skipif` guards that check external IPv6 reachability for tests that require external IPv6 connectivity, ensuring pipelines pass even in environments without internet-facing IPv6.
