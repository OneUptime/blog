# How to Build IPv6 Network Inventory Tools - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Inventory, NAPALM, Netmiko, Automation, Python

Description: Build automated IPv6 network inventory tools that discover interfaces, addresses, BGP peers, and routing tables from network devices.

## Introduction

An accurate IPv6 network inventory is the foundation for automation, capacity planning, and troubleshooting. Manual inventory maintenance quickly becomes stale. This post covers building automated inventory collection using NAPALM, storing results in structured formats, and querying the inventory.

## Inventory Data Model

```python
from dataclasses import dataclass, field

@dataclass
class IPv6Interface:
    device: str
    interface: str
    addresses: list  # ["2001:db8::1/64", "fe80::1/64"]
    enabled: bool
    mtu: int

@dataclass
class IPv6BGPPeer:
    device: str
    router_id: str
    peer_address: str
    remote_as: int
    state: str
    prefixes_received: int

@dataclass
class DeviceInventory:
    hostname: str
    platform: str
    interfaces: list = field(default_factory=list)
    bgp_peers: list = field(default_factory=list)
    routes: list = field(default_factory=list)
```

## Collecting Inventory with NAPALM

```python
from napalm import get_network_driver

def collect_ipv6_inventory(hostname: str, driver_name: str,
                            username: str, password: str) -> DeviceInventory:
    """Collect IPv6 inventory from a device using NAPALM."""
    driver = get_network_driver(driver_name)
    device = driver(
        hostname=hostname,
        username=username,
        password=password,
    )

    inventory = DeviceInventory(hostname=hostname, platform=driver_name)

    with device:
        # Collect interface IPv6 addresses
        interface_states = device.get_interfaces()
        interfaces = device.get_interfaces_ip()
        for iface_name, iface_data in interfaces.items():
            ipv6_addrs = [
                f"{addr}/{data['prefix_length']}"
                for addr, data in iface_data.get("ipv6", {}).items()
            ]
            if ipv6_addrs:
                iface_details = interface_states.get(iface_name, {})
                inventory.interfaces.append(IPv6Interface(
                    device=hostname,
                    interface=iface_name,
                    addresses=ipv6_addrs,
                    enabled=iface_details.get("is_enabled", False),
                    mtu=iface_details.get("mtu", 0),
                ))

        # Collect BGP peers
        bgp_data = device.get_bgp_neighbors()
        for vrf_data in bgp_data.values():
            router_id = vrf_data.get("router_id", "")
            for peer_addr, peer_data in vrf_data.get("peers", {}).items():
                if ":" in peer_addr:  # IPv6 peers only
                    inventory.bgp_peers.append(IPv6BGPPeer(
                        device=hostname,
                        router_id=router_id,
                        peer_address=peer_addr,
                        remote_as=peer_data.get("remote_as", 0),
                        state=(
                            "Established" if peer_data.get("is_up")
                            else "Disabled" if not peer_data.get("is_enabled", True)
                            else "Not Established"
                        ),
                        prefixes_received=peer_data.get("address_family", {})
                            .get("ipv6", {}).get("received_prefixes", 0),
                    ))

    return inventory
```

## Batch Collection with Concurrency

```python
from concurrent.futures import ThreadPoolExecutor
import yaml

def load_device_list(inventory_file: str) -> list:
    with open(inventory_file) as f:
        return yaml.safe_load(f)["devices"]

def collect_all(inventory_file: str, max_workers: int = 10) -> list:
    devices = load_device_list(inventory_file)
    results = []

    def collect_one(device):
        try:
            return collect_ipv6_inventory(
                hostname=device["host"],
                driver_name=device["platform"],
                username=device["username"],
                password=device["password"],
            )
        except Exception as e:
            print(f"Error collecting {device['host']}: {e}")
            return None

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(collect_one, d) for d in devices]
        for f in futures:
            result = f.result()
            if result:
                results.append(result)

    return results
```

## Inventory Storage and Querying

```python
import sqlite3
import json

def store_inventory(devices: list, db_path: str = "ipv6_inventory.db"):
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ipv6_interfaces (
            id INTEGER PRIMARY KEY,
            device TEXT, interface TEXT,
            addresses TEXT, collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bgp_peers (
            id INTEGER PRIMARY KEY,
            device TEXT, peer_address TEXT, remote_as INTEGER,
            state TEXT, collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    for inv in devices:
        for iface in inv.interfaces:
            conn.execute(
                "INSERT INTO ipv6_interfaces (device, interface, addresses) VALUES (?,?,?)",
                (iface.device, iface.interface, json.dumps(iface.addresses))
            )
        for peer in inv.bgp_peers:
            conn.execute(
                "INSERT INTO bgp_peers (device, peer_address, remote_as, state) VALUES (?,?,?,?)",
                (peer.device, peer.peer_address, peer.remote_as, peer.state)
            )

    conn.commit()
    conn.close()

def query_down_peers(db_path: str = "ipv6_inventory.db") -> list:
    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        "SELECT device, peer_address, remote_as FROM bgp_peers WHERE state != 'Established'"
    ).fetchall()
    conn.close()
    return rows
```

## Conclusion

Automated IPv6 inventory collection with NAPALM provides accurate, up-to-date data about your network's addressing and BGP state. Store results in a database for trending and querying. Run collection jobs regularly (every hour or day) and compare against baseline. Integrate inventory data with OneUptime to correlate device state with monitoring alerts.
