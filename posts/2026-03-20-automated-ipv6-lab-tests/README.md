# How to Run Automated IPv6 Lab Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Automation, Testing, Pytest, CI/CD, Lab

Description: Build automated IPv6 test suites using pytest, Robot Framework, and CI/CD pipelines to continuously validate IPv6 lab configurations.

## pytest-based IPv6 Test Suite

```python
# tests/test_ipv6_lab.py

import pytest
import subprocess
import socket
import ipaddress

# ─── Fixtures ────────────────────────────────────────────

@pytest.fixture(scope="session")
def lab_nodes():
    return {
        "r1": "2001:db8:1::1",
        "r2": "2001:db8:2::1",
        "r3": "2001:db8:3::1",
    }

@pytest.fixture(scope="session")
def services():
    return [
        ("2001:db8:1::1", 22, "R1 SSH"),
        ("2001:db8:1::1", 80, "R1 HTTP"),
    ]

# ─── Tests ───────────────────────────────────────────────

def ping6(addr, count=2, timeout=2):
    result = subprocess.run(
        ["ping6", "-c", str(count), "-W", str(timeout), "-q", addr],
        capture_output=True,
    )
    return result.returncode == 0

def tcp_connect(host, port, timeout=3):
    try:
        s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect((host, port, 0, 0))
        s.close()
        return True
    except Exception:
        return False

class TestIPv6Reachability:

    @pytest.mark.parametrize("name,addr", [
        ("loopback", "::1"),
        ("R1", "2001:db8:1::1"),
        ("R2", "2001:db8:2::1"),
        ("R3", "2001:db8:3::1"),
    ])
    def test_ping(self, name, addr):
        assert ping6(addr), f"Cannot ping {name} at [{addr}]"

class TestIPv6Services:

    @pytest.mark.parametrize("host,port,name", [
        ("2001:db8:1::1", 22, "SSH"),
        ("2001:db8:1::1", 80, "HTTP"),
    ])
    def test_service(self, host, port, name):
        assert tcp_connect(host, port), \
            f"{name} not reachable at [{host}]:{port}"

class TestIPv6Routing:

    def test_default_route_exists(self):
        result = subprocess.run(
            ["ip", "-6", "route", "show", "default"],
            capture_output=True, text=True,
        )
        assert "via" in result.stdout, "No IPv6 default route"

    def test_lab_prefix_in_table(self):
        result = subprocess.run(
            ["ip", "-6", "route", "show"],
            capture_output=True, text=True,
        )
        assert "2001:db8" in result.stdout, "Lab prefix missing from routing table"

class TestIPv6MTU:

    @pytest.mark.parametrize("packet_size", [1280, 1400, 1480])
    def test_mtu(self, packet_size):
        payload_size = packet_size - 48  # 40-byte IPv6 header + 8-byte ICMPv6 Echo header
        result = subprocess.run(
            ["ping6", "-c", "1", "-M", "do", "-s", str(payload_size), "-W", "3", "::1"],
            capture_output=True,
        )
        assert result.returncode == 0, f"MTU test failed at {packet_size}-byte IPv6 packet"
```

## Robot Framework IPv6 Tests

```robot
# ipv6_tests.robot
*** Settings ***
Library    Process
Library    OperatingSystem

*** Variables ***
${R1_ADDR}    2001:db8:1::1
${R2_ADDR}    2001:db8:2::1

*** Test Cases ***

IPv6 Reachability - Router 1
    [Documentation]    Verify Router 1 is reachable via ICMPv6
    ${result}=    Run Process    ping6    -c    3    -W    2    ${R1_ADDR}
    Should Be Equal As Integers    ${result.rc}    0

IPv6 DNS Resolution
    [Documentation]    Verify AAAA record resolution works
    ${result}=    Run Process    host    -t    AAAA    ipv6.google.com
    Should Contain    ${result.stdout}    IPv6

IPv6 Forwarding Enabled
    [Documentation]    Verify IPv6 forwarding is enabled (router)
    ${result}=    Run Process    sysctl    -n    net.ipv6.conf.all.forwarding
    Should Be Equal    ${result.stdout.strip()}    1

*** Keywords ***

Check Port Open
    [Arguments]    ${host}    ${port}
    ${result}=    Run Process    nc    -z    -6    -w    3    ${host}    ${port}
    Should Be Equal As Integers    ${result.rc}    0    msg=Port ${port} closed on ${host}
```

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ipv6-lab-tests.yml
name: IPv6 Lab Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ipv6-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Enable IPv6
        run: |
          sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
          sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0

      - name: Set up test lab (network namespaces)
        run: sudo bash scripts/setup-lab.sh

      - name: Install dependencies
        run: pip install pytest

      - name: Run IPv6 tests
        run: pytest tests/ -v --tb=short --junit-xml=test-report.xml

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-report.xml
```

## Makefile for Lab Test Automation

```makefile
# Makefile
.PHONY: lab-up lab-down test test-connectivity test-routing test-mtu

lab-up:
	sudo bash scripts/setup-lab.sh

lab-down:
	sudo bash scripts/teardown-lab.sh

test:
	@sudo bash scripts/setup-lab.sh && { \
		status=0; \
		pytest tests/ -v || status=$$?; \
		sudo bash scripts/teardown-lab.sh || exit $$?; \
		exit $$status; \
	}

test-connectivity:
	pytest tests/test_ipv6_lab.py::TestIPv6Reachability -v

test-routing:
	pytest tests/test_ipv6_lab.py::TestIPv6Routing -v

test-mtu:
	pytest tests/test_ipv6_lab.py::TestIPv6MTU -v
```

## Conclusion

Automated IPv6 lab testing with pytest provides fast feedback on configuration changes. Parameterized tests efficiently cover multiple nodes and services. Robot Framework adds human-readable test cases for documentation and non-programmer collaboration. GitHub Actions CI/CD runs tests on pushes to `main` and on pull requests by setting up namespace-based labs in the runner. The key pattern: `setup_lab → run_tests → teardown_lab` in a make target or CI step ensures tests always start from a known-good state.
