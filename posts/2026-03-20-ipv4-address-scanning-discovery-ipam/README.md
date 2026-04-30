# How to Set Up IPv4 Address Scanning and Discovery with IPAM Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPAM, IPv4, Network Discovery, Scanning, nmap, NetBox

Description: Configure automated IPv4 address scanning with nmap and integrate discovered hosts into IPAM tools for accurate inventory management.

Network discovery scanning finds IPv4 addresses that are in use, identifies undocumented hosts, and reconciles discovered devices with your IPAM inventory.

## Basic Network Discovery with nmap

```bash
# Install nmap

sudo apt install nmap -y

# Discover live hosts in a subnet (ping scan)
sudo nmap -sn 10.100.1.0/24

# Output:
# Nmap scan report for 10.100.1.1
# Host is up (0.0012s latency).
# ...
# Nmap done: 256 IP addresses (12 hosts up) scanned in 2.30 seconds

# Get live hosts only (no hostnames)
sudo nmap -sn -n 10.100.1.0/24 | awk '/Nmap scan report/{print $5}'
```

## Comprehensive Host Discovery

```bash
# More thorough discovery: on local Ethernet, Nmap also uses ARP by default; add ICMP echo/timestamp and TCP SYN/ACK probes
sudo nmap -sn -PE -PP -PS80,443 -PA3389 10.100.1.0/24

# With OS detection and version scanning (requires root)
sudo nmap -sV -O --open 10.100.1.0/24 -oX scan_results.xml

# Output live hosts only
sudo nmap -sn -n 10.100.0.0/22 | awk '/Nmap scan report/{print $5}'
```

## Python Script: Scan and Compare with NetBox

```python
#!/usr/bin/env python3
# scan_and_reconcile.py
# Scan a subnet and compare discovered IPs with NetBox records

import subprocess
import requests
import xml.etree.ElementTree as ET

NETBOX_URL = "http://netbox.example.com"
TOKEN = "nbt_<key>.<token>"
SUBNET = "10.100.1.0/24"

def get_live_ips(subnet):
    """Run nmap and return list of live IPv4 addresses."""
    result = subprocess.run(
        ["nmap", "-sn", "-n", "-oX", "-", subnet],
        capture_output=True, text=True, check=True
    )
    root = ET.fromstring(result.stdout)
    live_ips = []
    for host in root.findall("host"):
        status = host.find("status")
        if status is None or status.get("state") != "up":
            continue
        for address in host.findall("address"):
            if address.get("addrtype") == "ipv4":
                live_ips.append(address.get("addr"))
                break
    return live_ips

def get_netbox_ips(prefix):
    """Get all documented IPs from NetBox for a prefix."""
    documented = {}
    url = f"{NETBOX_URL}/api/ipam/ip-addresses/"
    params = {"parent": prefix, "limit": 1000}

    while url:
        resp = requests.get(
            url,
            headers={"Authorization": f"Bearer {TOKEN}"},
            params=params,
            timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        for ip in data["results"]:
            documented[ip["address"].split("/")[0]] = ip
        url = data["next"]
        params = None

    return documented

def scan_and_reconcile(subnet):
    print(f"Scanning {subnet}...")
    live_ips = get_live_ips(subnet)
    documented = get_netbox_ips(subnet)

    undocumented = [ip for ip in live_ips if ip not in documented]
    documented_but_offline = [ip for ip, info in documented.items()
                              if ip not in live_ips and info["status"]["value"] == "active"]

    print(f"\nLive hosts: {len(live_ips)}")
    print(f"Documented in NetBox: {len(documented)}")

    if undocumented:
        print(f"\nUNDOCUMENTED live hosts (not in NetBox):")
        for ip in undocumented:
            print(f"  {ip}")

    if documented_but_offline:
        print(f"\nDocumented as active but not responding:")
        for ip in documented_but_offline:
            print(f"  {ip} ({documented[ip].get('dns_name', 'no DNS name')})")

scan_and_reconcile(SUBNET)
```

## Scheduled Scanning with Cron

```bash
# /etc/cron.d/ip-scan
# Run discovery every night at 2 AM
0 2 * * * root python3 /usr/local/bin/scan_and_reconcile.py >> /var/log/ip-scan.log 2>&1
```

## Using arp-scan for Local Network Discovery

```bash
# arp-scan is designed for IPv4 host discovery on local subnets
sudo apt install arp-scan -y

# Scan local subnet
sudo arp-scan --localnet

# Scan a specific subnet via a specific interface
sudo arp-scan -I eth0 10.100.1.0/24

# Output includes IP, MAC, and vendor
# 10.100.1.10  00:11:22:33:44:55  Dell Inc.
```

## phpIPAM Built-in Scanning

phpIPAM has built-in subnet scanning that can be configured to run automatically:

```bash
# Run discovery from the phpIPAM CLI
php /var/www/html/phpipam/functions/scripts/discoveryCheck.php
```

In the web UI: **Administration → Scan Agents** to configure agents, then enable discovery or ping checks on each subnet. Schedule the CLI scripts with cron for recurring scans.

Regular scanning ensures your IPAM stays accurate and reveals undocumented devices or stale entries that should be cleaned up.
