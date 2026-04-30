# How to Use Nornir for IPv6 Network Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nornir, Python, IPv6, Network Automation, Inventory, Task, Parallelism

Description: Use Nornir to automate IPv6 configuration across a fleet of network devices using inventory files, plugins, and parallel task execution.

## Introduction

Nornir is a Python automation framework for network engineers. Unlike NAPALM and Netmiko, Nornir handles inventory management, task execution, and result aggregation natively. It uses NAPALM or Netmiko as connection backends and runs tasks in parallel across all devices.

## Installation

```bash
pip install nornir nornir_napalm nornir_netmiko nornir_utils
```

## Step 1: Inventory Configuration

```yaml
# inventory/hosts.yaml

router1:
  hostname: 2001:db8::11      # IPv6 management address
  platform: ios
  groups:
    - core_routers

router2:
  hostname: 2001:db8::12
  platform: iosxr
  groups:
    - core_routers

router3:
  hostname: 2001:db8::13
  platform: junos
  groups:
    - edge_routers
```

```yaml
# inventory/groups.yaml
core_routers:
  data:
    ipv6_enabled: true
    bgp_as: 65000

edge_routers:
  data:
    ipv6_enabled: true
    bgp_as: 65001
```

```yaml
# inventory/defaults.yaml
username: admin
password: secret
connection_options:
  napalm:
    extras:
      optional_args:
        port: 22
```

## Step 2: Nornir Initialization

```python
# main.py
from nornir import InitNornir
from nornir.core.filter import F
from nornir_utils.plugins.functions import print_result

nr = InitNornir(
    runner={
        "plugin": "threaded",
        "options": {
            "num_workers": 10,  # Parallel workers
        },
    },
    inventory={
        "plugin": "SimpleInventory",
        "options": {
            "host_file": "inventory/hosts.yaml",
            "group_file": "inventory/groups.yaml",
            "defaults_file": "inventory/defaults.yaml",
        },
    },
)

# Filter to IPv6-enabled devices only
ipv6_devices = nr.filter(ipv6_enabled=True)
```

## Step 3: Task to Get IPv6 Interfaces

```python
from nornir.core.task import Task, Result
from nornir_napalm.plugins.tasks import napalm_get

def get_ipv6_addresses(task: Task) -> Result:
    """Get all IPv6 addresses from a device."""
    result = task.run(
        task=napalm_get,
        getters=["interfaces_ip"],
    )

    interfaces_ip = result[0].result["interfaces_ip"]
    ipv6_data = {}

    for iface, data in interfaces_ip.items():
        if "ipv6" in data and data["ipv6"]:
            ipv6_data[iface] = [
                f"{addr}/{details['prefix_length']}"
                for addr, details in data["ipv6"].items()
            ]

    return Result(
        host=task.host,
        result=ipv6_data,
    )

# Run on all IPv6-enabled devices
results = ipv6_devices.run(task=get_ipv6_addresses)
print_result(results)
```

## Step 4: Task to Deploy IPv6 Config

```python
from nornir_netmiko.tasks import netmiko_send_config

def deploy_ipv6_prefix_list(task: Task) -> Result:
    """Deploy an IPv6 prefix list to filter BGP prefixes."""
    platform = task.host.platform

    if platform == "ios":
        config = [
            "ipv6 prefix-list IPV6_ALLOWED permit 2001:db8::/32 le 48",
            "ipv6 prefix-list IPV6_ALLOWED permit ::/0",
        ]
    elif platform == "iosxr":
        config = [
            "prefix-set IPV6_ALLOWED",
            "  2001:db8::/32 le 48,",
            "  ::/0",
            "end-set",
        ]
    else:
        return Result(host=task.host, result="Platform not supported", failed=True)

    result = task.run(
        task=netmiko_send_config,
        config_commands=config,
    )

    return Result(host=task.host, result=result[0].result)

# Deploy to core routers only
core_nr = ipv6_devices.filter(F(has_parent_group="core_routers"))
results = core_nr.run(task=deploy_ipv6_prefix_list)
print_result(results)
```

## Step 5: Compliance Check

```python
import ipaddress

def check_ipv6_compliance(task: Task) -> Result:
    """
    Check that each device has at least one non-link-local IPv6 address
    and no link-local-only interfaces.
    """
    result = task.run(task=napalm_get, getters=["interfaces_ip"])
    interfaces = result[0].result["interfaces_ip"]

    violations = []
    has_non_link_local = False
    for iface, data in interfaces.items():
        ipv6_addresses = data.get("ipv6", {})
        if not ipv6_addresses:
            continue

        interface_has_non_link_local = False
        for addr_str in ipv6_addresses:
            try:
                addr = ipaddress.IPv6Address(addr_str)
            except ValueError:
                violations.append(f"{iface}: invalid IPv6 address ({addr_str})")
                continue

            if not addr.is_link_local:
                interface_has_non_link_local = True
                has_non_link_local = True

        if not interface_has_non_link_local:
            violations.append(f"{iface}: link-local only")

    if not has_non_link_local:
        violations.append("Device has no non-link-local IPv6 addresses")

    return Result(
        host=task.host,
        result=violations,
        failed=len(violations) > 0,
    )

results = ipv6_devices.run(task=check_ipv6_compliance)
print_result(results)
```

## Conclusion

Nornir's inventory system maps hostnames to IPv6 management addresses, enabling fleet-wide IPv6 automation. Tasks run in parallel via the threaded runner. Use `nornir_napalm` for structured data retrieval and `nornir_netmiko` for config deployment. Build compliance check tasks to detect IPv6 misconfigurations across all devices. Integrate with OneUptime to alert on compliance failures.
