# How to Build a Python Script to Audit IPv4 Addressing Across Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, Network Audit, Netmiko, Automation

Description: Learn how to build a Python script that connects to multiple network devices, collects all configured IPv4 addresses, and generates an audit report for documentation and conflict detection.

## IPv4 Address Audit Goals

A network IPv4 audit collects:
- All interfaces and their configured IP addresses
- Which devices have which subnets
- Duplicate IPs (conflicts)
- Unused IPs within known subnets
- Comparison against documented addressing

## Step 1: Collect IPv4 Addresses with Netmiko

```python
from netmiko import ConnectHandler
from concurrent.futures import ThreadPoolExecutor
import re

def get_ip_interfaces(device_info):
    """Get all IP interface information from a Cisco IOS device."""
    with ConnectHandler(**device_info) as conn:
        conn.enable()
        output = conn.send_command('show ip interface brief')
        detailed = conn.send_command('show running-config | section interface')
        hostname = conn.find_prompt().rstrip('#>')

    return {
        'hostname': hostname,
        'host': device_info['host'],
        'interface_brief': output,
        'running_config': detailed,
    }

devices = [
    {'device_type': 'cisco_ios', 'host': '192.168.1.1', 'username': 'admin', 'password': 'pass', 'secret': 'ep'},
    {'device_type': 'cisco_ios', 'host': '192.168.1.2', 'username': 'admin', 'password': 'pass', 'secret': 'ep'},
]

with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(get_ip_interfaces, devices))

for result in results:
    print(f"\n=== {result['hostname']} ({result['host']}) ===")
    print(result['interface_brief'])
```

## Step 2: Parse IP Addresses with NAPALM

NAPALM provides structured data:

```python
import napalm

def get_structured_ips(device_info):
    driver_class = napalm.get_network_driver(device_info['driver'])
    device = driver_class(
        hostname=device_info['host'],
        username=device_info['username'],
        password=device_info['password'],
        optional_args=device_info.get('optional_args', {}),
    )

    device.open()
    facts = device.get_facts()
    ip_interfaces = device.get_interfaces_ip()
    device.close()

    result = {
        'hostname': facts['hostname'],
        'host': device_info['host'],
        'interfaces': {}
    }

    for intf_name, intf_data in ip_interfaces.items():
        ipv4_addrs = intf_data.get('ipv4', {})
        if ipv4_addrs:
            result['interfaces'][intf_name] = {
                ip: data['prefix_length']
                for ip, data in ipv4_addrs.items()
            }

    return result

# Collect from all devices

devices = [
    {'driver': 'ios', 'host': '192.168.1.1', 'username': 'admin', 'password': 'pass', 'optional_args': {'secret': 'ep'}},
    {'driver': 'ios', 'host': '192.168.1.2', 'username': 'admin', 'password': 'pass', 'optional_args': {'secret': 'ep'}},
]

all_ips = [get_structured_ips(d) for d in devices]
```

## Step 3: Detect Duplicate IPv4 Addresses

```python
from collections import defaultdict

def find_duplicate_ips(all_device_ips):
    """Find IP addresses that appear on more than one device/interface."""
    ip_locations = defaultdict(list)

    for device in all_device_ips:
        hostname = device['hostname']
        for intf_name, ip_dict in device['interfaces'].items():
            for ip_addr, prefix in ip_dict.items():
                ip_locations[ip_addr].append(f"{hostname}:{intf_name}")

    duplicates = {ip: locations for ip, locations in ip_locations.items()
                  if len(locations) > 1}

    return duplicates

duplicates = find_duplicate_ips(all_ips)
if duplicates:
    print("DUPLICATE IP ADDRESSES FOUND:")
    for ip, locations in duplicates.items():
        print(f"  {ip}: {', '.join(locations)}")
else:
    print("No duplicate IP addresses found.")
```

## Step 4: Generate IP Address Report as CSV

```python
import csv
from datetime import datetime

def generate_ip_report(all_device_ips, report_file):
    """Write an IP address audit report to CSV."""
    with open(report_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Hostname', 'Device IP', 'Interface', 'IPv4 Address', 'Prefix Length', 'Timestamp'])

        timestamp = datetime.now().isoformat()
        for device in all_device_ips:
            hostname = device['hostname']
            host = device['host']
            for intf_name, ip_dict in device['interfaces'].items():
                for ip_addr, prefix in ip_dict.items():
                    writer.writerow([hostname, host, intf_name, ip_addr, prefix, timestamp])

    print(f"Report saved: {report_file}")

generate_ip_report(all_ips, '/tmp/ipv4-audit.csv')
```

## Step 5: Compare Against IPAM Documentation

```python
import csv
from ipaddress import ip_interface, ip_network

def compare_with_ipam(all_device_ips, ipam_csv):
    """Compare discovered IPs against documented IPs in an IPAM CSV."""
    # Load documented IPs
    documented = {}
    with open(ipam_csv, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            documented[row['ip_address']] = row

    # Check each discovered IP
    for device in all_device_ips:
        for intf, ips in device['interfaces'].items():
            for ip in ips:
                if ip in documented:
                    doc = documented[ip]
                    if doc['device'] != device['hostname']:
                        print(f"MISMATCH: {ip} documented as {doc['device']} but found on {device['hostname']}")
                else:
                    print(f"UNDOCUMENTED: {ip} on {device['hostname']}:{intf}")
```

## Step 6: Full Audit Script

```python
# Run the complete audit
def run_ipv4_audit(devices, report_dir='/tmp'):
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y%m%d_%H%M')
    report_file = f"{report_dir}/ipv4-audit-{timestamp}.csv"

    print(f"Auditing {len(devices)} devices...")
    all_ips = [get_structured_ips(d) for d in devices]

    # Check for duplicates
    duplicates = find_duplicate_ips(all_ips)
    if duplicates:
        print(f"WARNING: Found {len(duplicates)} duplicate IPs!")

    # Generate report
    generate_ip_report(all_ips, report_file)

    print(f"Audit complete: {report_file}")
    return all_ips

run_ipv4_audit(devices)
```

## Conclusion

A Python IPv4 audit script collects structured interface data via NAPALM's `get_interfaces_ip()`, detects duplicate IPs by building an IP-to-device mapping, and exports results to CSV for review. Run it regularly to detect unauthorized changes, document the current state, and identify conflicts before they cause outages. Combine with IPAM comparison to flag undocumented addresses or mismatches with the documented addressing plan.
