# How to Automate IPv6 Change Management Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Change Management, Automation, Git, CI/CD, Ansible

Description: Implement automated IPv6 change management workflows with Git-based approval processes, pre-change validation, automated deployment, and rollback capabilities.

## Introduction

Manual change management for IPv6 configurations is error-prone and slow. A Git-based workflow with automated validation, staged deployment, and commit-confirm rollback on supported platforms provides consistency and auditability. Every change is reviewed, tested, and logged.

## Workflow Overview

```text
1. Engineer creates change in Git branch
2. Pre-commit hooks validate IPv6 syntax and policy
3. Pull request triggers CI validation pipeline
4. Automated tests run against lab topology
5. Peer review required before merge
6. Merge triggers automated deployment
7. Post-deployment health checks verify success
8. Commit-confirm rollback if health checks fail
```

## Change Definition Format

```yaml
# changes/2026-03-20-add-r1-peering.yml

---
change_id: CHG-2026-031
description: "Add IPv6 BGP peering between R1 and R4"
risk_level: medium
rollback_plan: "Remove neighbor 2001:db8:4::1 from R1 BGP config"
pre_checks:
  - "ping -6 2001:db8:4::1 from R1"
  - "verify R4 is reachable via IS-IS"
post_checks:
  - "bgp_neighbor_state R1 2001:db8:4::1 established"
  - "bgp_prefixes_received R1 2001:db8:4::1 > 0"
devices:
  - name: R1
    platform: ios
    hostname: r1.example.net
    username: automation
    config: |
      router bgp 65001
        neighbor 2001:db8:4::1 remote-as 65001
        neighbor 2001:db8:4::1 update-source Loopback0
        address-family ipv6 unicast
          neighbor 2001:db8:4::1 activate
        exit-address-family
      !
```

## Pre-Change Validation Script

```python
#!/usr/bin/env python3
"""Validate IPv6 change before deployment."""
import ipaddress
import re
import sys

import yaml

REQUIRED_FIELDS = ["change_id", "description", "risk_level", "devices"]
IPV6_PATTERN = re.compile(
    r'(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(?:/\d+)?'
)


def validate_change_file(change_file: str) -> list[str]:
    """Return list of validation errors."""
    errors: list[str] = []

    try:
        with open(change_file, encoding="utf-8") as f:
            change = yaml.safe_load(f)
    except (OSError, yaml.YAMLError) as exc:
        return [f"Unable to parse {change_file}: {exc}"]

    if not isinstance(change, dict):
        return [f"Change file must contain a YAML mapping: {change_file}"]

    # Validate required top-level fields
    for field in REQUIRED_FIELDS:
        if field not in change:
            errors.append(f"Missing required field: {field}")

    # Validate device definitions and any IPv6 literals in config blocks
    for device in change.get("devices", []):
        for field in ["name", "platform", "hostname", "username", "config"]:
            if field not in device:
                errors.append(f"Missing required device field: {field}")

        config = device.get("config", "")
        for match in IPV6_PATTERN.finditer(config):
            token = match.group()
            try:
                if "/" in token:
                    ipaddress.ip_network(token, strict=False)
                else:
                    ipaddress.ip_address(token)
            except ValueError:
                errors.append(f"Invalid IPv6 address in config: {token}")

    return errors


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: validate_change.py <change-file>")
        sys.exit(2)

    errors = validate_change_file(sys.argv[1])
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        sys.exit(1)
    print("Validation passed")
```

## GitHub Actions CI Pipeline

```yaml
# .github/workflows/ipv6-changes.yml
name: IPv6 Change Validation

on:
  pull_request:
    paths:
      - 'changes/**/*.yml'
  push:
    branches:
      - main
    paths:
      - 'changes/**/*.yml'

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Set up Python
        uses: actions/setup-python@v6
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install dependencies
        run: python -m pip install napalm netmiko pyyaml jinja2

      - name: Validate change files
        run: |
          find changes -type f -name '*.yml' -print0 | while IFS= read -r -d '' f; do
            echo "Validating $f"
            python scripts/validate_change.py "$f"
          done

      - name: Run lab tests
        run: |
          find changes -type f -name '*.yml' -print0 | while IFS= read -r -d '' f; do
            python scripts/deploy_to_lab.py --dry-run "$f"
          done

  deploy:
    needs: validate
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - name: Set up Python
        uses: actions/setup-python@v6
        with:
          python-version: "3.11"
          cache: "pip"
      - name: Install dependencies
        run: python -m pip install napalm netmiko pyyaml jinja2
      - name: Deploy and verify
        run: |
          find changes -type f -name '*.yml' -print0 | while IFS= read -r -d '' f; do
            python scripts/deploy_with_rollback.py "$f"
          done
        env:
          NETWORK_PASSWORD: ${{ secrets.NETWORK_PASSWORD }}
```

## Deployment with Automatic Rollback

```python
#!/usr/bin/env python3
import os
import sys
import time

import yaml
from napalm import get_network_driver


def run_health_check(devices: dict[str, object], check: str) -> bool:
    """Evaluate simple BGP post-checks against NAPALM getters."""
    tokens = check.split()
    if len(tokens) < 4:
        raise ValueError(f"Unsupported post-check: {check}")

    check_type, device_name, neighbor = tokens[:3]
    device = devices[device_name]
    peer = device.get_bgp_neighbors()["global"]["peers"][neighbor]
    ipv6_stats = peer.get("address_family", {}).get("ipv6", {})

    if check_type == "bgp_neighbor_state" and tokens[3] == "established":
        return peer.get("is_up") is True

    if (
        check_type == "bgp_prefixes_received"
        and len(tokens) == 5
        and tokens[3] == ">"
    ):
        return ipv6_stats.get("received_prefixes", 0) > int(tokens[4])

    raise ValueError(f"Unsupported post-check: {check}")


def open_devices(change: dict) -> dict[str, object]:
    """Open NAPALM sessions for every device in the change file."""
    devices = {}
    for device_def in change["devices"]:
        driver = get_network_driver(device_def["platform"])
        device = driver(
            device_def["hostname"],
            device_def["username"],
            os.environ["NETWORK_PASSWORD"],
        )
        device.open()
        devices[device_def["name"]] = device
    return devices


def deploy_with_rollback(change: dict, devices: dict[str, object]) -> bool:
    """Deploy a change and use commit-confirm rollback on supported platforms."""
    pending_commits = []

    try:
        for dev_config in change["devices"]:
            device = devices[dev_config["name"]]
            device.load_merge_candidate(config=dev_config["config"])
            device.commit_config(revert_in=300)
            pending_commits.append(device)
    except Exception as exc:
        print(f"Deployment failed: {exc}")
        for device in pending_commits:
            device.rollback()
        return False

    time.sleep(30)

    try:
        for check in change.get("post_checks", []):
            if not run_health_check(devices, check):
                print(f"Post-check failed: {check}")
                print("Rolling back...")
                for device in pending_commits:
                    device.rollback()
                return False

        for device in pending_commits:
            device.confirm_commit()
        return True
    except Exception as exc:
        print(f"Verification failed: {exc}")
        for device in pending_commits:
            device.rollback()
        return False


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: deploy_with_rollback.py <change-file>")
        sys.exit(2)

    with open(sys.argv[1], encoding="utf-8") as f:
        change = yaml.safe_load(f)

    devices = open_devices(change)
    try:
        success = deploy_with_rollback(change, devices)
    finally:
        for device in devices.values():
            device.close()

    sys.exit(0 if success else 1)
```

## Conclusion

Git-based change management with automated validation and rollback brings software development best practices to IPv6 network operations. Every change is peer-reviewed, validated, and deployed consistently. Commit-confirm rollback on supported platforms prevents outages from misconfigured changes. Integrate with OneUptime to monitor post-deployment health and page on-call engineers if checks fail after deployment.
