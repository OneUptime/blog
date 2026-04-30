# How to Use Netmiko for IPv6 Network Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Netmiko, Python, IPv6, Network Automation, SSH, Cisco, Juniper

Description: Use Netmiko to automate IPv6 configuration tasks on network devices over SSH, including connecting via IPv6, sending commands, and parsing IPv6 output.

## Introduction

Netmiko is a Python library that simplifies SSH connections to network devices. It supports connecting to devices via their IPv6 management addresses and automating IPv6 configuration commands across Cisco IOS, IOS-XR, Juniper, and other platforms.

## Installation

```bash
pip install netmiko ntc-templates
```

## Step 1: Connect to a Device via IPv6

```python
from netmiko import ConnectHandler

# Connect to a router using its IPv6 management address

device = {
    "device_type": "cisco_xe",
    "host": "2001:db8::1",  # IPv6 address
    "username": "admin",
    "password": "secret",
    "port": 22,
}

with ConnectHandler(**device) as conn:
    output = conn.send_command("show ipv6 interface brief")
    print(output)
```

## Step 2: Configure IPv6 on an Interface

```python
from netmiko import ConnectHandler

def configure_ipv6_interface(host: str, interface: str,
                              ipv6_address: str, prefix_len: int):
    """Add an IPv6 address to a Cisco IOS interface."""
    device = {
        "device_type": "cisco_xe",
        "host": host,
        "username": "admin",
        "password": "secret",
    }

    config_commands = [
        f"interface {interface}",
        f"ipv6 address {ipv6_address}/{prefix_len}",
        "ipv6 enable",
        "no shutdown",
    ]

    with ConnectHandler(**device) as conn:
        output = conn.send_config_set(config_commands)
        conn.save_config()
        return output

# Deploy to multiple routers
routers = [
    ("2001:db8::1", "GigabitEthernet0/0", "2001:db8:1::1", 64),
    ("2001:db8::2", "GigabitEthernet0/0", "2001:db8:1::2", 64),
]

for host, iface, addr, prefix in routers:
    result = configure_ipv6_interface(host, iface, addr, prefix)
    print(f"{host}: {result[:100]}")
```

## Step 3: Retrieve and Parse IPv6 Routes

```python
from netmiko import ConnectHandler
import re

def get_ipv6_routes(host: str) -> list:
    """Retrieve IPv6 routing table from a Cisco IOS device."""
    device = {
        "device_type": "cisco_xe",
        "host": host,
        "username": "admin",
        "password": "secret",
    }

    with ConnectHandler(**device) as conn:
        raw = conn.send_command("show ipv6 route", use_textfsm=True)

    # If ntc-templates/TextFSM support is available, Netmiko returns structured data
    if isinstance(raw, list):
        return raw

    # Manual parsing fallback
    routes = []
    for line in raw.splitlines():
        # Match route lines like: OI 2001:DB8:1::/64 [110/2]
        m = re.match(r'^([A-Za-z][A-Za-z0-9 ]*)\s+([0-9A-Fa-f:]+/\d+)\b', line)
        if m:
            routes.append({
                "type": m.group(1).strip(),
                "prefix": m.group(2),
            })
    return routes
```

## Step 4: Multi-Device IPv6 Audit

```python
from netmiko import ConnectHandler
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

DEVICES = [
    {"device_type": "cisco_xe",      "host": "2001:db8::1"},
    {"device_type": "juniper_junos", "host": "2001:db8::2"},
    {"device_type": "arista_eos",    "host": "2001:db8::3"},
]

COMMANDS = {
    "cisco_xe":      "show ipv6 interface brief",
    "juniper_junos": "show interfaces terse | match inet6",
    "arista_eos":    "show ipv6 interface brief",
}

def audit_device(device_info: dict) -> dict:
    cmd = COMMANDS.get(device_info["device_type"], "show ipv6 interface brief")
    try:
        device_info.update({"username": "admin", "password": "secret"})
        with ConnectHandler(**device_info) as conn:
            output = conn.send_command(cmd)
        return {"host": device_info["host"], "output": output, "error": None}
    except Exception as e:
        return {"host": device_info["host"], "output": None, "error": str(e)}

with ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(audit_device, DEVICES))

for r in results:
    print(f"\n{r['host']}: {'OK' if not r['error'] else r['error']}")
    if r['output']:
        print(r['output'][:200])
```

## Step 5: Configure IPv6 BGP Neighbor

```python
from netmiko import ConnectHandler

def add_ipv6_bgp_neighbor(host: str, neighbor_ip: str,
                           remote_as: int, description: str):
    """Add an IPv6 BGP neighbor on Cisco IOS-XE."""
    config = [
        "router bgp 65000",
        f"neighbor {neighbor_ip} remote-as {remote_as}",
        f"neighbor {neighbor_ip} description {description}",
        "address-family ipv6 unicast",
        f"neighbor {neighbor_ip} activate",
        f"neighbor {neighbor_ip} send-community both",
        "exit-address-family",
    ]

    device = {
        "device_type": "cisco_xe",
        "host": host,
        "username": "admin",
        "password": "secret",
    }

    with ConnectHandler(**device) as conn:
        return conn.send_config_set(config)
```

## Conclusion

Netmiko connects to devices via IPv6 management addresses by passing the IPv6 address as `host`. Use `send_config_set()` for multi-line IPv6 configurations and `use_textfsm=True` with `ntc-templates` for structured output parsing. Run audits with `ThreadPoolExecutor` for parallel multi-device operations. Integrate Netmiko automation scripts with OneUptime webhook alerts to trigger configuration changes in response to alerts.
