# How to Use NAPALM for IPv6 Network Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NAPALM, Python, IPv6, Network Automation, Cisco, Juniper, IOS-XR

Description: Use NAPALM (Network Automation and Programmability Abstraction Layer with Multivendor support) to configure and retrieve IPv6 information from network devices in a vendor-agnostic way.

## Introduction

NAPALM provides a unified Python API for managing network devices from multiple vendors. It supports IPv6 configuration deployment, BGP neighbor management, and interface configuration retrieval - all through a consistent interface regardless of vendor.

## Installation

```bash
pip install napalm
```

A single `pip install napalm` ships every supported driver (Cisco IOS, IOS-XR, NX-OS, Arista EOS, Juniper JunOS), so no vendor-specific extras are needed. NAPALM 5.x requires Python 3.9 or newer.

## Step 1: Connect to a Device

```python
import napalm

def get_driver(platform: str):
    return napalm.get_network_driver(platform)

# Connect to Cisco IOS-XR
def connect_device(host: str, platform: str = "iosxr"):
    driver = get_driver(platform)
    device = driver(
        hostname=host,
        username="admin",
        password="secret",
        optional_args={
            "port": 22,
        },
    )
    device.open()
    return device

# Example usage
device = connect_device("2001:db8::1")  # Connect via IPv6
```

## Step 2: Retrieve IPv6 Interface Information

```python
def get_ipv6_interfaces(device) -> dict:
    """Get all IPv6 interface addresses from a device."""
    interfaces_ip = device.get_interfaces_ip()

    ipv6_interfaces = {}
    for iface, data in interfaces_ip.items():
        if "ipv6" in data and data["ipv6"]:
            ipv6_interfaces[iface] = data["ipv6"]

    return ipv6_interfaces

# Usage
device = connect_device("2001:db8::1")
ipv6_ifaces = get_ipv6_interfaces(device)

for iface, addrs in ipv6_ifaces.items():
    for addr, details in addrs.items():
        print(f"{iface}: {addr}/{details['prefix_length']}")

device.close()
```

## Step 3: Deploy IPv6 Configuration

```python
def deploy_ipv6_config(device, interface: str, ipv6_address: str, prefix_len: int):
    """
    Deploy an IPv6 address to a device interface using NAPALM merge.
    """
    # IOS-XR config snippet
    config = f"""
interface {interface}
 ipv6 address {ipv6_address}/{prefix_len}
 no shutdown
!
"""
    # Load config (merge - adds without removing existing config)
    device.load_merge_candidate(config=config)

    # Review the diff
    diff = device.compare_config()
    print(f"Config diff:\n{diff}")

    if diff:
        device.commit_config()
        print("Configuration committed.")
    else:
        print("No changes needed.")
        device.discard_config()
```

## Step 4: Retrieve BGP IPv6 Neighbors

```python
def get_ipv6_bgp_neighbors(device) -> list:
    """Retrieve all BGP neighbors with IPv6 addresses."""
    bgp_data = device.get_bgp_neighbors()

    ipv6_neighbors = []
    for vrf, vrf_data in bgp_data.items():
        for peer_ip, peer_data in vrf_data.get("peers", {}).items():
            import ipaddress
            try:
                addr = ipaddress.ip_address(peer_ip)
                if addr.version == 6:
                    ipv6_neighbors.append({
                        "vrf": vrf,
                        "peer": peer_ip,
                        "is_up": peer_data.get("is_up"),
                        "local_as": peer_data.get("local_as"),
                        "remote_as": peer_data.get("remote_as"),
                        "address_family": peer_data.get("address_family", {}),
                    })
            except ValueError:
                continue

    return ipv6_neighbors
```

## Step 5: Multi-Device IPv6 Audit

```python
from concurrent.futures import ThreadPoolExecutor
import napalm

DEVICES = [
    {"host": "2001:db8::a1", "platform": "iosxr"},
    {"host": "2001:db8::a2", "platform": "junos"},
    {"host": "2001:db8::a3", "platform": "eos"},
]

def audit_device(device_info: dict) -> dict:
    driver = napalm.get_network_driver(device_info["platform"])
    device = driver(
        hostname=device_info["host"],
        username="admin",
        password="secret",
    )
    device.open()

    result = {
        "host": device_info["host"],
        "ipv6_interfaces": get_ipv6_interfaces(device),
        "ipv6_bgp_neighbors": get_ipv6_bgp_neighbors(device),
        "facts": device.get_facts(),
    }
    device.close()
    return result

# Audit all devices in parallel
with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(audit_device, DEVICES))

for result in results:
    print(f"\n=== {result['host']} ===")
    print(f"IPv6 Interfaces: {list(result['ipv6_interfaces'].keys())}")
    print(f"IPv6 BGP Peers: {len(result['ipv6_bgp_neighbors'])}")
```

## Step 6: Validate Before Commit

```python
def safe_deploy_ipv6(device, config: str) -> bool:
    """Deploy config with validation."""
    device.load_merge_candidate(config=config)
    diff = device.compare_config()

    if not diff:
        device.discard_config()
        return False

    print(f"Diff:\n{diff}")
    confirm = input("Apply? [y/N]: ")
    if confirm.lower() == 'y':
        device.commit_config()
        return True

    device.discard_config()
    return False
```

## Conclusion

NAPALM provides a vendor-agnostic interface for IPv6 network automation. Use `get_interfaces_ip()` to inventory IPv6 addresses, `load_merge_candidate()` to deploy configurations, and `get_bgp_neighbors()` for BGP state. Always review diffs before committing. Integrate NAPALM automation scripts with OneUptime to trigger configuration pushes when monitors detect outages.
