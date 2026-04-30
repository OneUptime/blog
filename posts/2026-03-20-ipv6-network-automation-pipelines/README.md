# How to Build IPv6 Network Automation Pipelines - Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Automation, Pipeline, CI/CD, Ansible, Nornir

Description: Build end-to-end IPv6 network automation pipelines that cover inventory collection, configuration generation, deployment, and continuous compliance verification.

## Introduction

A network automation pipeline treats network configuration as code. Changes flow through source control, automated validation, staged deployment, and continuous compliance checks. This post covers the complete pipeline architecture for IPv6 network automation.

## Pipeline Architecture

```text
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐
│  Source of  │    │  Validation  │    │  Deployment  │    │ Compliance  │
│   Truth     │───▶│  & Testing   │───▶│  Automation  │───▶│  Monitoring │
│  (Git YAML) │    │  (CI/CD)     │    │  (Ansible/   │    │ (Scheduled) │
│             │    │              │    │   Nornir)    │    │             │
└─────────────┘    └──────────────┘    └──────────────┘    └─────────────┘
```

## Stage 1: Source of Truth (YAML)

```yaml
# network/ipv6_policy.yml

---
addressing:
  loopback_prefix: "fd12:3456:789a::/48"
  link_prefix: "fd12:3456:789a:100::/56"
  management_prefix: "fd12:3456:789a:ff00::/64"

bgp:
  asn: 65001
  route_reflectors:
    - "fd12:3456:789a::100"
    - "fd12:3456:789a::101"

routing:
  ospfv3_area: "0.0.0.0"
  isis_net: "49.0001.0000.0000.0001.00"

security:
  management_acl:
    - "fd12:3456:789a:ff00::/64"
    - "fd12:3456:789a:ff10::/64"

devices:
  - name: R1
    role: leaf
    loopback: "fd12:3456:789a::1/128"
    links:
      - peer: R2
        local_addr: "fd12:3456:789a:112::1/64"
        peer_addr: "fd12:3456:789a:112::2/64"
```

## Stage 2: Configuration Generation

```python
#!/usr/bin/env python3
"""Generate IPv6 configs from source of truth."""
import yaml
from jinja2 import Environment, FileSystemLoader

def generate_all_configs(policy_file: str, template_dir: str) -> dict:
    """Generate configs for all devices. Returns {device: config_str}."""
    with open(policy_file) as f:
        policy = yaml.safe_load(f)

    env = Environment(loader=FileSystemLoader(template_dir))
    configs = {}

    for device in policy["devices"]:
        tpl = env.get_template(f"{device['role']}.j2")
        configs[device["name"]] = tpl.render(device=device, policy=policy)

    return configs
```

## Stage 3: Validation Pipeline

```python
#!/usr/bin/env python3
"""Validate generated configurations before deployment."""
import ipaddress
import subprocess

def validate_configs(configs: dict) -> dict:
    """Validate each config. Returns {device: [errors]}."""
    results = {}

    for device, config in configs.items():
        errors = []

        # Check for documentation addresses (should not be in prod)
        doc_prefixes = [
            ipaddress.IPv6Network("2001:db8::/32"),
            ipaddress.IPv6Network("3fff::/20"),
        ]
        for line in config.splitlines():
            import re
            for match in re.finditer(r'(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}', line):
                try:
                    addr = ipaddress.IPv6Address(match.group())
                    if any(addr in p for p in doc_prefixes):
                        errors.append(f"Documentation address in config: {match.group()}")
                except ValueError:
                    pass

        results[device] = errors

    return results

def run_syntax_check(device: str, config: str, platform: str) -> bool:
    """Platform-specific syntax validation."""
    if platform == "nftables":
        proc = subprocess.run(
            ["nft", "-c", "-f", "-"],
            input=config.encode(), capture_output=True
        )
        return proc.returncode == 0
    return True  # Skip for other platforms
```

## Stage 4: Deployment with Nornir

```python
from nornir import InitNornir
from nornir_napalm.plugins.tasks import napalm_configure
from nornir_utils.plugins.functions import print_result

def deploy_configs(configs: dict, dry_run: bool = True):
    """Deploy configs to all devices using Nornir."""
    nr = InitNornir(config_file="nornir_config.yml")

    def deploy_one(task):
        device_name = task.host.name
        if device_name not in configs:
            return
        config = configs[device_name]
        task.run(
            task=napalm_configure,
            configuration=config,
            dry_run=dry_run,
        )

    result = nr.run(task=deploy_one)
    print_result(result)
    return result

configs = generate_all_configs("network/ipv6_policy.yml", "templates")

# Dry run first
print("=== Dry run ===")
deploy_configs(configs, dry_run=True)

# Then actual deployment after approval
# deploy_configs(configs, dry_run=False)
```

## Stage 5: Continuous Compliance

```python
from nornir import InitNornir
import schedule
import time

def compliance_check():
    """Run scheduled compliance verification."""
    from nornir_napalm.plugins.tasks import napalm_get
    nr = InitNornir(config_file="nornir_config.yml")

    def check_bgp(task):
        result = task.run(task=napalm_get, getters=["bgp_neighbors"])
        peers = result[0].result.get("bgp_neighbors", {})
        for vrf, vrf_data in peers.items():
            for peer, data in vrf_data.get("peers", {}).items():
                if ":" in peer and data.get("is_enabled", True) and not data.get("is_up", False):
                    print(f"ALERT: {task.host.name} peer {peer} is down")

    nr.run(task=check_bgp)

# Run compliance every 5 minutes
schedule.every(5).minutes.do(compliance_check)
while True:
    schedule.run_pending()
    time.sleep(60)
```

## Conclusion

A complete IPv6 automation pipeline flows from YAML source of truth through config generation, validation, deployment, and continuous compliance. Each stage can be executed independently or as part of a CI/CD pipeline. The pipeline ensures consistency, prevents human error, and provides an audit trail for every change. Integrate compliance alerts with OneUptime to page on-call engineers when the network drifts from the desired state.
