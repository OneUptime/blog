# How to Parse show ip interface brief Output with Python and Regular Expressions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Regular Expression, Cisco IOS, Netmiko, Network Automation

Description: Learn how to parse Cisco IOS 'show ip interface brief' output using Python regular expressions, extracting structured data from unstructured CLI output.

## The Challenge of CLI Output Parsing

Cisco's `show ip interface brief` output is human-readable text:

```text
Interface                  IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0         192.168.1.1     YES NVRAM  up                    up
GigabitEthernet0/1         10.0.0.1        YES NVRAM  up                    up
Loopback0                  1.1.1.1         YES NVRAM  up                    up
GigabitEthernet0/2         unassigned      YES unset  administratively down down
```

Parsing this with Python regex converts it into structured dictionaries you can filter and process.

## Step 1: Parse show ip interface brief

```python
import re

def parse_ip_interface_brief(output):
    """Parse Cisco 'show ip interface brief' output into list of dicts."""
    results = []

    # Regex to match each interface line
    # Groups: interface, ip_address, ok, method, status, protocol
    pattern = re.compile(
        r'^(\S+)\s+'            # Interface name
        r'(\d+\.\d+\.\d+\.\d+|unassigned)\s+'  # IP address
        r'(YES|NO)\s+'          # OK?
        r'(\S+)\s+'             # Method
        r'([\w\s]+?)\s+'        # Status (may have spaces)
        r'(\w+)\s*$',           # Protocol
        re.MULTILINE
    )

    for match in pattern.finditer(output):
        results.append({
            'interface': match.group(1),
            'ip_address': match.group(2),
            'ok': match.group(3) == 'YES',
            'method': match.group(4),
            'status': match.group(5).strip(),
            'protocol': match.group(6),
        })

    return results

# Test with sample output

sample_output = """
Interface                  IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0         192.168.1.1     YES NVRAM  up                    up
GigabitEthernet0/1         10.0.0.1        YES NVRAM  up                    up
Loopback0                  1.1.1.1         YES NVRAM  up                    up
GigabitEthernet0/2         unassigned      YES unset  administratively down down
"""

interfaces = parse_ip_interface_brief(sample_output)

for intf in interfaces:
    status = "UP" if intf['status'] == 'up' else "DOWN"
    ip = intf['ip_address']
    print(f"{intf['interface']:35} {ip:20} {status}")
```

## Step 2: Collect and Parse from Live Devices

```python
from netmiko import ConnectHandler

def get_interface_status(device_info):
    """Get parsed interface status from a Cisco device."""
    with ConnectHandler(**device_info) as conn:
        conn.enable()
        output = conn.send_command('show ip interface brief')

    return parse_ip_interface_brief(output)

device = {
    'device_type': 'cisco_ios',
    'host': '192.168.1.1',
    'username': 'admin',
    'password': 'password',
    'secret': 'enablepass',
}

interfaces = get_interface_status(device)

# Find down interfaces
down_interfaces = [i for i in interfaces if i['protocol'] == 'down']
print(f"Down interfaces ({len(down_interfaces)}):")
for intf in down_interfaces:
    print(f"  {intf['interface']}: {intf['status']}")
```

## Step 3: Parse show ip route Output

```python
def parse_ip_route(output):
    """Parse Cisco 'show ip route' output."""
    routes = []

    pattern = re.compile(
        r'^([OCSBDEI\*])\s+'           # Protocol code
        r'(\d+\.\d+\.\d+\.\d+)'       # Network
        r'(?:/(\d+))?\s+'             # Prefix length (optional)
        r'(?:\[(\d+)/(\d+)\])?\s+'    # Admin distance/metric (optional)
        r'(?:via\s+(\S+))?',          # Next hop (optional)
        re.MULTILINE
    )

    # Protocol code mapping
    protocol_map = {
        'C': 'connected', 'S': 'static', 'O': 'ospf',
        'B': 'bgp', 'D': 'eigrp', 'I': 'igrp', 'E': 'egp',
    }

    for match in pattern.finditer(output):
        routes.append({
            'protocol_code': match.group(1),
            'protocol': protocol_map.get(match.group(1), 'unknown'),
            'network': match.group(2),
            'prefix_length': match.group(3),
            'admin_distance': match.group(4),
            'metric': match.group(5),
            'next_hop': match.group(6),
        })

    return routes
```

## Step 4: Use TextFSM for More Accurate Parsing

TextFSM templates are more reliable than hand-written regex:

```python
from netmiko import ConnectHandler

def get_routes_structured(device_info):
    """Get routing table as structured data using TextFSM."""
    with ConnectHandler(**device_info) as conn:
        conn.enable()
        # use_textfsm=True uses ntc-templates for parsing
        routes = conn.send_command('show ip route', use_textfsm=True)

    if isinstance(routes, str):
        raise ValueError("TextFSM parsing failed, check ntc-templates installation")

    return routes

routes = get_routes_structured(device)

# Count by protocol
from collections import Counter
protocol_counts = Counter(r.get('protocol', 'unknown') for r in routes)
print("Routes by protocol:", dict(protocol_counts))

# Find routes to a specific destination
import ipaddress
target = ipaddress.ip_address('8.8.8.8')
matching = [
    r for r in routes
    if r.get('network') and target in ipaddress.ip_network(
        f"{r['network']}/{r.get('prefix_length', '32')}", strict=False
    )
]
print(f"Routes matching 8.8.8.8: {matching}")
```

## Step 5: Generate Interface Status Report

```python
import csv
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

devices = [
    {'device_type': 'cisco_ios', 'host': '192.168.1.1', 'username': 'admin', 'password': 'pass', 'secret': 'ep', 'name': 'router01'},
    {'device_type': 'cisco_ios', 'host': '192.168.1.2', 'username': 'admin', 'password': 'pass', 'secret': 'ep', 'name': 'router02'},
]

def collect_interfaces(device_info):
    name = device_info.pop('name', device_info['host'])
    interfaces = get_interface_status(device_info)
    return name, interfaces

with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(collect_interfaces, devices))

# Write to CSV
with open('/tmp/interface-report.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Device', 'Interface', 'IP Address', 'Status', 'Protocol'])
    for device_name, interfaces in results:
        for intf in interfaces:
            writer.writerow([device_name, intf['interface'], intf['ip_address'], intf['status'], intf['protocol']])

print("Report saved to /tmp/interface-report.csv")
```

## Conclusion

Parse Cisco CLI output using Python regex with `re.compile()` and `finditer()`, or use TextFSM via Netmiko's `use_textfsm=True` parameter for more reliable parsing with pre-built templates. The regex approach is flexible but brittle; TextFSM templates handle edge cases in CLI output more reliably. Combine parsing with Netmiko's parallel execution to collect and analyze interface status across an entire network in seconds.
