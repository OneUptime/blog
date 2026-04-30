# How to Automate IPv6 Compliance Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Compliance, Automation, Python, Ansible, Network Security, Audit

Description: Automate IPv6 compliance auditing across your network infrastructure using Python and Ansible to detect misconfigurations, insecure defaults, and policy violations.

## Introduction

IPv6 compliance automation ensures every device follows your security and operational policy: required ICMPv6 control traffic is permitted, link-local-only interfaces are flagged, SLAAC is properly configured, and no unintended globally-routable addresses exist. Automated compliance checks can run continuously or in CI/CD pipelines.

## Step 1: Define Compliance Policy

```yaml
# compliance/ipv6_policy.yml

ipv6_compliance:
  rules:
    - id: IPV6-001
      description: "All interfaces must have a global IPv6 address"
      severity: high
      check: global_ipv6_present

    - id: IPV6-002
      description: "Required ICMPv6 control traffic must not be blocked"
      severity: critical
      check: icmpv6_not_blocked

    - id: IPV6-003
      description: "No IPv4-mapped IPv6 addresses (::ffff:0:0/96) configured on interfaces"
      severity: medium
      check: no_mapped_interface_addresses

    - id: IPV6-004
      description: "Loopback must have ::1/128"
      severity: high
      check: loopback_ipv6

    - id: IPV6-005
      description: "No more than one global prefix per interface"
      severity: low
      check: single_global_prefix
```

## Step 2: Python Compliance Checker

```python
# compliance/check_ipv6.py
import ipaddress
from napalm import get_network_driver

class IPv6ComplianceChecker:
    def __init__(self, device_info: dict):
        driver = get_network_driver(device_info["platform"])
        self.device = driver(
            hostname=device_info["host"],
            username=device_info.get("username", "admin"),
            password=device_info.get("password", "secret"),
        )
        self.device.open()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.device.close()

    @staticmethod
    def is_system_loopback(iface: str) -> bool:
        return iface.lower() in ("lo", "lo0", "loopback0")

    def check_global_ipv6_present(self) -> dict:
        """IPV6-001: All interfaces have a global IPv6 address."""
        interfaces = self.device.get_interfaces()
        interfaces_ip = self.device.get_interfaces_ip()
        violations = []

        for iface in interfaces:
            if self.is_system_loopback(iface):
                continue
            ipv6_addrs = interfaces_ip.get(iface, {}).get("ipv6", {})
            has_global = any(ipaddress.IPv6Address(addr).is_global for addr in ipv6_addrs)

            if not ipv6_addrs:
                violations.append(f"{iface}: no IPv6 address configured")
            elif not has_global:
                violations.append(f"{iface}: no global IPv6 address configured")

        return {"rule": "IPV6-001", "passed": len(violations) == 0, "violations": violations}

    def check_loopback_ipv6(self) -> dict:
        """IPV6-004: Loopback must have ::1."""
        interfaces_ip = self.device.get_interfaces_ip()
        loopback_ok = False
        for iface, data in interfaces_ip.items():
            if self.is_system_loopback(iface):
                for addr, details in data.get("ipv6", {}).items():
                    if addr == "::1" and details.get("prefix_length") == 128:
                        loopback_ok = True
        return {
            "rule": "IPV6-004",
            "passed": loopback_ok,
            "violations": [] if loopback_ok else ["::1/128 missing from loopback"],
        }

    def run_all_checks(self) -> list:
        checks = [
            self.check_global_ipv6_present,
            self.check_loopback_ipv6,
        ]
        return [check() for check in checks]
```

## Step 3: Ansible Compliance Playbook

```yaml
# playbooks/ipv6_compliance_audit.yml
---
- name: IPv6 Compliance Audit
  hosts: all
  gather_facts: false

  tasks:
    - name: Collect IPv6 interface summary
      cisco.iosxr.iosxr_command:
        commands:
          - "show ipv6 interface brief"
      register: ipv6_ifaces

    - name: Retrieve IPv6 access lists
      cisco.iosxr.iosxr_command:
        commands:
          - "show access-lists ipv6"
      register: acl_output

    - name: Check for broad ICMPv6 deny rules
      fail:
        msg: "COMPLIANCE FAILURE IPV6-002: broad ICMPv6 deny rule found on {{ inventory_hostname }}"
      when: "'deny icmp any any' in acl_output.stdout[0]"

    - name: Ensure local reports directory exists
      file:
        path: reports
        state: directory
      delegate_to: localhost

    - name: Save compliance report
      copy:
        content: |
          Host: {{ inventory_hostname }}
          Date: {{ now(utc=true, fmt='%Y-%m-%dT%H:%M:%SZ') }}
          IPv6 Interfaces: {{ ipv6_ifaces.stdout_lines }}
        dest: "reports/{{ inventory_hostname }}_ipv6_compliance.txt"
      delegate_to: localhost
```

## Step 4: CI/CD Compliance Gate

```yaml
# .github/workflows/ipv6_compliance.yml
name: IPv6 Compliance Audit

on:
  schedule:
    - cron: "0 6 * * *"  # Daily at 6 AM UTC
  push:
    branches: [main]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: |
          pip install napalm nornir ansible
          ansible-galaxy collection install cisco.iosxr

      - name: Run compliance checks
        run: python compliance/run_audit.py

      - name: Upload compliance report
        uses: actions/upload-artifact@v4
        with:
          name: ipv6-compliance-report
          path: reports/

      - name: Fail on critical violations
        run: python compliance/check_exit_code.py --severity critical
```

## Step 5: Reporting

```python
# compliance/generate_report.py
import json
from datetime import datetime

def generate_html_report(results: list, output_file: str):
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])

    html = f"""<!DOCTYPE html>
<html>
<body>
<h1>IPv6 Compliance Report - {datetime.now().isoformat()}</h1>
<p>Passed: {passed} | Failed: {failed}</p>
<table border="1">
  <tr><th>Rule</th><th>Status</th><th>Violations</th></tr>
  {"".join(f"<tr><td>{r['rule']}</td><td>{'PASS' if r['passed'] else 'FAIL'}</td><td>{', '.join(r['violations'])}</td></tr>" for r in results)}
</table>
</body>
</html>"""
    with open(output_file, "w") as f:
        f.write(html)
```

## Conclusion

IPv6 compliance automation provides continuous visibility into configuration drift and security policy violations. Define rules in YAML, implement checks with NAPALM for vendor-agnostic retrieval, and enforce compliance as a CI/CD gate. Critical violations - especially broad ICMPv6 deny rules - should trigger immediate alerts. Use OneUptime to monitor compliance check job execution and alert on failures.
