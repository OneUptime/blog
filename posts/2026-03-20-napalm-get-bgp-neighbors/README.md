# How to Use NAPALM get_bgp_neighbors to Monitor BGP Sessions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NAPALM, BGP, Python, Network Monitoring, Automation

Description: Learn how to use NAPALM's get_bgp_neighbors method to programmatically monitor BGP session state, received/advertised prefix counts, and peer health across network devices.

## NAPALM BGP Monitoring Capabilities

NAPALM's `get_bgp_neighbors()` returns a standardized dictionary of BGP peer information including:
- Peer IP address and AS number (local_as, remote_as, remote_id)
- Whether the peer is up and administratively enabled (is_up, is_enabled)
- Received, accepted, and sent prefix counts per address family
- Peer uptime and description

## Step 1: Get BGP Neighbors

```python
import napalm

driver = napalm.get_network_driver('ios')
device = driver(
    hostname='192.168.1.1',
    username='admin',
    password='password',
    optional_args={'secret': 'enablepass'},
)

device.open()

bgp_neighbors = device.get_bgp_neighbors()
print(bgp_neighbors)

# Output structure:

# {
#   'global': {
#     'router_id': '1.1.1.1',
#     'peers': {
#       '203.0.113.1': {
#         'is_up': True,
#         'is_enabled': True,
#         'uptime': 86400,
#         'remote_as': 65001,
#         'description': 'ISP1',
#         'address_family': {
#           'ipv4': {
#             'received_prefixes': 800000,
#             'accepted_prefixes': 800000,
#             'sent_prefixes': 250,
#           }
#         }
#       }
#     }
#   }
# }

device.close()
```

## Step 2: Display BGP Session Summary

```python
import napalm
from datetime import timedelta

driver = napalm.get_network_driver('ios')
device = driver('192.168.1.1', 'admin', 'password', optional_args={'secret': 'ep'})

device.open()
bgp = device.get_bgp_neighbors()
device.close()

for vrf, vrf_data in bgp.items():
    print(f"\nVRF: {vrf}")
    print(f"Router ID: {vrf_data.get('router_id', 'N/A')}")
    print(f"{'Neighbor':<20} {'AS':>8} {'State':>12} {'Prefixes Recv':>15} {'Uptime':>10}")
    print("-" * 70)

    for peer_ip, peer_data in vrf_data.get('peers', {}).items():
        state = "Established" if peer_data['is_up'] else "Not Up"
        uptime_sec = peer_data.get('uptime', 0)
        uptime_str = str(timedelta(seconds=uptime_sec)) if uptime_sec > 0 else "N/A"

        # Get IPv4 prefix count
        ipv4_af = peer_data.get('address_family', {}).get('ipv4', {})
        received = ipv4_af.get('received_prefixes', 0)

        print(f"{peer_ip:<20} {peer_data.get('remote_as', 0):>8} {state:>12} {received:>15} {uptime_str:>10}")
```

## Step 3: Monitor BGP Health Across Multiple Devices

```python
import napalm
from concurrent.futures import ThreadPoolExecutor

routers = [
    {'host': '192.168.1.1', 'driver': 'ios', 'username': 'admin', 'password': 'pass', 'optional_args': {'secret': 'ep'}},
    {'host': '192.168.1.2', 'driver': 'eos', 'username': 'admin', 'password': 'pass', 'optional_args': {}},
]

def check_bgp_health(router_config):
    driver_class = napalm.get_network_driver(router_config['driver'])
    device = driver_class(
        hostname=router_config['host'],
        username=router_config['username'],
        password=router_config['password'],
        optional_args=router_config.get('optional_args', {}),
    )

    try:
        device.open()
        bgp = device.get_bgp_neighbors()
        facts = device.get_facts()
        device.close()

        down_peers = []
        for vrf, vrf_data in bgp.items():
            for peer_ip, peer_data in vrf_data.get('peers', {}).items():
                if not peer_data['is_up']:
                    down_peers.append(peer_ip)

        return {
            'host': router_config['host'],
            'hostname': facts.get('hostname', ''),
            'down_peers': down_peers,
            'status': 'WARNING' if down_peers else 'OK',
        }

    except Exception as e:
        return {'host': router_config['host'], 'error': str(e), 'status': 'ERROR'}

with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(check_bgp_health, routers))

for result in results:
    if result['status'] == 'OK':
        print(f"✓ {result.get('hostname', result['host'])}: All BGP peers up")
    elif result['status'] == 'WARNING':
        print(f"⚠ {result.get('hostname', result['host'])}: DOWN peers: {result['down_peers']}")
    else:
        print(f"✗ {result['host']}: Error - {result.get('error', 'Unknown')}")
```

## Step 4: Alert on Prefix Count Changes

```python
import napalm
import json
import os
from datetime import datetime

BASELINE_FILE = '/tmp/bgp-baseline.json'

DEVICES = [
    {'host': '192.168.1.1', 'driver': 'ios', 'username': 'admin', 'password': 'pass'},
]

def get_current_prefixes(devices):
    current = {}
    for dev_info in devices:
        driver_class = napalm.get_network_driver(dev_info['driver'])
        device = driver_class(dev_info['host'], dev_info['username'], dev_info['password'])
        device.open()
        bgp = device.get_bgp_neighbors()
        device.close()

        for vrf, vrf_data in bgp.items():
            for peer_ip, peer_data in vrf_data.get('peers', {}).items():
                af = peer_data.get('address_family', {}).get('ipv4', {})
                key = f"{dev_info['host']}:{peer_ip}"
                current[key] = af.get('received_prefixes', 0)
    return current

# Load baseline or create it
if os.path.exists(BASELINE_FILE):
    with open(BASELINE_FILE) as f:
        baseline = json.load(f)
    current = get_current_prefixes(DEVICES)
    for key, count in current.items():
        base_count = baseline.get(key, 0)
        if abs(count - base_count) > 1000:
            print(f"ALERT: {key}: prefix count changed from {base_count} to {count}")
else:
    # Create baseline
    current = get_current_prefixes(DEVICES)
    with open(BASELINE_FILE, 'w') as f:
        json.dump(current, f)
    print("Baseline created.")
```

## Conclusion

NAPALM's `get_bgp_neighbors()` returns structured BGP peer data regardless of the device vendor. Use it to build monitoring dashboards that show peer state, uptime, and prefix counts. The pattern of `device.open()`, `device.get_bgp_neighbors()`, `device.close()` works identically for Cisco IOS, NX-OS, Arista EOS, and Juniper JunOS. Alert on peers with `is_up == False` and on significant prefix count changes that might indicate route leaks or withdrawals.
