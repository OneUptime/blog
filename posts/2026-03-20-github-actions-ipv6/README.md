# How to Configure GitHub Actions with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GitHub Action, CI/CD, Docker, DevOps, Testing

Description: Configure GitHub Actions workflows to test and deploy IPv6-enabled applications, including self-hosted runners with IPv6, Docker IPv6 networks, and IPv6 connectivity tests.

## Introduction

GitHub Actions standard hosted runners provide public internet access, but if you need guaranteed native IPv6 connectivity for end-to-end tests, use a self-hosted runner with IPv6 access. For application-level IPv6 testing inside CI, you can also use an IPv6-enabled Docker network on a Linux runner.

## Option 1: Self-Hosted Runner with IPv6

Deploy a self-hosted runner on a host with IPv6 connectivity:

```bash
# On a Linux host with IPv6 access

# Install GitHub Actions runner

mkdir actions-runner && cd actions-runner
# Copy the current download command from:
# Settings > Actions > Runners > New self-hosted runner
curl -o actions-runner-linux-x64-<runner-version>.tar.gz -L \
    https://github.com/actions/runner/releases/download/v<runner-version>/actions-runner-linux-x64-<runner-version>.tar.gz
tar xzf ./actions-runner-linux-x64-<runner-version>.tar.gz

# Configure the runner (your repo URL and token from Settings > Actions > Runners)
./config.sh --url https://github.com/your-org/your-repo \
            --token <TOKEN> \
            --labels ipv6,self-hosted,linux

# Install and start as a service
sudo ./svc.sh install
sudo ./svc.sh start

# Verify IPv6 is available on the runner
ip -6 addr show scope global
```

## Option 2: Test IPv6 with a Docker Network on the Runner

On a Linux runner, create an IPv6-enabled Docker bridge network for internal testing:

```yaml
# .github/workflows/ipv6-test.yml

name: IPv6 Tests

on: [push, pull_request]

jobs:
  ipv6-unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - name: Create IPv6 network
        run: |
          docker network create \
            --driver bridge \
            --ipv6 \
            --subnet fd00:dead:beef::/64 \
            test-ipv6-net

      - name: Run application with IPv6
        run: |
          # Start your application in a container with IPv6
          docker run -d \
            --name myapp \
            --network test-ipv6-net \
            myapp:latest

      - name: Test IPv6 connectivity within Docker network
        run: |
          docker run --rm --network test-ipv6-net \
            ubuntu:22.04 \
            sh -c "apt-get update -q && apt-get install -y curl iputils-ping && \
                   ping -6 -c 2 myapp && \
                   curl -6 http://myapp:8080/health"

      - name: Set up Python
        uses: actions/setup-python@v6
        with:
          python-version: '3.12'

      - name: Run IPv6 integration tests
        run: |
          pip install pytest requests aiocoap
          # Pass the container's IPv6 address to the test process
          IPV6_ADDR=$(docker inspect -f '{{(index .NetworkSettings.Networks "test-ipv6-net").GlobalIPv6Address}}' myapp)
          SERVER_IPV6="$IPV6_ADDR" pytest tests/test_ipv6.py
```

## Option 3: Self-Hosted Runner Workflow

```yaml
# .github/workflows/ipv6-integration.yml

name: IPv6 Integration Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ipv6-tests:
    # Use self-hosted runner with IPv6 label
    runs-on: [self-hosted, linux, ipv6]

    steps:
      - uses: actions/checkout@v6

      - name: Verify IPv6 connectivity
        run: |
          # Check global IPv6 address
          ip -6 addr show scope global
          # Test external IPv6 connectivity
          ping -6 -c 3 2606:4700:4700::1111
          # Get our IPv6 address (for logs)
          curl -6 https://api6.ipify.org

      - name: Run full IPv6 test suite
        run: |
          # Run tests that require real IPv6 internet connectivity
          # (resolving AAAA records, connecting to IPv6-only services, etc.)
          python -m pytest tests/ipv6/ -v --ipv6-enabled

      - name: Deploy to IPv6 staging
        if: github.ref == 'refs/heads/main'
        run: |
          # Deploy to IPv6-capable staging environment
          kubectl --server=https://[2001:db8:1::1]:6443 apply -f k8s/staging/
```

## Testing IPv6 in GitHub Actions: Python Test Example

```python
# tests/test_ipv6.py
# IPv6 integration test for GitHub Actions

import socket
import os
import requests

def test_app_responds_on_ipv6():
    """Test that the application responds on its IPv6 address."""
    server_ipv6 = os.environ["SERVER_IPV6"]
    # Connect specifically using IPv6
    response = requests.get(
        f"http://[{server_ipv6}]:8080/health",
        timeout=10
    )
    assert response.status_code == 200

def test_dns_resolution_aaaa():
    """Test that AAAA record resolution works."""
    # Resolve AAAA record
    results = socket.getaddrinfo(
        "example.org", 80,
        socket.AF_INET6, socket.SOCK_STREAM,
        proto=socket.IPPROTO_TCP
    )
    assert len(results) > 0, "No AAAA records found"
    ipv6_addr = results[0][4][0]
    assert ":" in ipv6_addr, f"Expected IPv6 address, got: {ipv6_addr}"
```

## Conclusion

GitHub Actions IPv6 testing typically requires either a self-hosted runner with native IPv6 connectivity (for testing external IPv6 services) or an internal Docker IPv6 network on a Linux runner (for testing application-level IPv6 support without external connectivity). The self-hosted runner approach is best for integration tests that verify actual IPv6 internet connectivity, while Docker network testing is sufficient for unit and API-level IPv6 testing. Label self-hosted runners with `ipv6` and target them using `runs-on: [self-hosted, linux, ipv6]` in your workflows.
