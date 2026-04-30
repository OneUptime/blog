# How to Migrate from Spreadsheet-Based IPv4 Tracking to NetBox or phpIPAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPAM, NetBox, phpIPAM, IPv4, Network Management, Migration

Description: Migrate your IPv4 address inventory from spreadsheets to a proper IPAM tool like NetBox or phpIPAM using bulk import via CSV and API automation.

## Introduction

Many organizations track IP addresses in Excel or Google Sheets. While this works for small networks, it breaks down at scale - no conflict detection, no audit trail, no API integration. Migrating to NetBox (open-source, API-first) or phpIPAM gives you a proper IPAM system with automation capabilities.

## Why Migrate to a Proper IPAM Tool

| Feature | Spreadsheet | NetBox/phpIPAM |
|---------|-------------|----------------|
| Duplicate detection | Manual | Built-in validation/tools |
| Subnet visualization | No | Yes |
| API for automation | No | Full REST API |
| Change audit trail | No | Built-in |
| VLAN management | Limited | Full |
| DNS/DHCP integration | No | Via API/integrations |

## Step 1: Export Your Spreadsheet

Structure your existing data into a CSV with standard columns:

```csv
ip_address,subnet,hostname,description,device,location,vlan,status
10.1.1.10,10.1.1.0/24,web-01.example.com,Web server,Dell PowerEdge,NYC-DC,10,active
10.1.1.11,10.1.1.0/24,web-02.example.com,Web server,Dell PowerEdge,NYC-DC,10,active
10.1.2.50,10.1.2.0/24,workstation-50,John Smith workstation,HP EliteBook,NYC-Office,20,active
```

## Step 2A: Import into NetBox via CSV

NetBox supports native CSV import for most object types, and the REST API can automate repeatable imports.

```bash
# NetBox API: Create each prefix (subnet) first
curl -s -X POST "http://netbox.example.com/api/ipam/prefixes/" \
  -H "Authorization: Token your-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "prefix": "10.1.1.0/24",
    "description": "NYC DC Server VLAN",
    "vlan": 10,
    "scope_type": "dcim.site",
    "scope_id": 1,
    "status": "active"
  }'

# Create IP address records via API (script to loop over CSV)
python3 << 'PYEOF'
import csv
import ipaddress

import requests

NETBOX_URL = "http://netbox.example.com/api"
TOKEN = "your-api-token"
HEADERS = {"Authorization": f"Token {TOKEN}", "Content-Type": "application/json"}

with open("ip-inventory.csv", newline="") as f:
    for row in csv.DictReader(f):
        prefix_length = ipaddress.ip_network(row["subnet"], strict=False).prefixlen
        data = {
            "address": f"{row['ip_address']}/{prefix_length}",
            "dns_name": row["hostname"],
            "description": row["description"],
            "status": row["status"]
        }
        r = requests.post(
            f"{NETBOX_URL}/ipam/ip-addresses/",
            json=data,
            headers=HEADERS,
            timeout=30,
        )
        if r.status_code == 201:
            print(f"Created: {row['ip_address']}")
        else:
            print(f"Error {r.status_code}: {row['ip_address']} - {r.text}")
PYEOF
```

## Step 2B: Import into phpIPAM via CSV

phpIPAM supports CSV import from the UI:

1. Open the IP address import tool in the web UI
2. Upload your CSV file
3. Map CSV columns to phpIPAM fields
4. Review conflicts and import

Or use the API:

```bash
python3 << 'PYEOF'
import csv
from urllib.parse import quote

import requests
from requests.auth import HTTPBasicAuth

PHPIPAM_URL = "http://phpipam.example.com/api/myapp"
USERNAME = "admin"
PASSWORD = "password"

auth = requests.post(
    f"{PHPIPAM_URL}/user/",
    auth=HTTPBasicAuth(USERNAME, PASSWORD),
    timeout=30,
)
auth.raise_for_status()
token = auth.json()["data"]["token"]
headers = {"phpipam-token": token}

with open("ip-inventory.csv", newline="") as f:
    for row in csv.DictReader(f):
        subnet = row["subnet"]
        subnet_lookup = requests.get(
            f"{PHPIPAM_URL}/subnets/cidr/{quote(subnet, safe='')}/",
            headers=headers,
            timeout=30,
        )
        subnet_lookup.raise_for_status()
        subnet_id = subnet_lookup.json()["data"]["id"]

        payload = {
            "subnetId": subnet_id,
            "ip": row["ip_address"],
            "hostname": row["hostname"],
            "description": row["description"],
        }
        r = requests.post(
            f"{PHPIPAM_URL}/addresses/",
            json=payload,
            headers=headers,
            timeout=30,
        )
        if r.status_code == 201:
            print(f"Created: {row['ip_address']}")
        else:
            print(f"Error {r.status_code}: {row['ip_address']} - {r.text}")
PYEOF
```

## Step 3: Validate the Migration

After import, validate the data:

```bash
python3 << 'PYEOF'
import csv
import ipaddress
from collections import Counter

import requests

NETBOX_URL = "http://netbox.example.com/api"
TOKEN = "your-api-token"
HEADERS = {"Authorization": f"Token {TOKEN}"}

def get_all(path):
    url = f"{NETBOX_URL}{path}"
    items = []
    while url:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        payload = response.json()
        items.extend(payload["results"])
        url = payload["next"]
    return items

ip_objects = get_all("/ipam/ip-addresses/")
addresses = [item["address"] for item in ip_objects]
address_set = set(addresses)

expected = []
with open("ip-inventory.csv", newline="") as f:
    for row in csv.DictReader(f):
        prefix_length = ipaddress.ip_network(row["subnet"], strict=False).prefixlen
        expected.append(f"{row['ip_address']}/{prefix_length}")

missing = [address for address in expected if address not in address_set]
if missing:
    print("Missing IPs:")
    for address in missing:
        print(address)
else:
    print("All CSV IPs are present in NetBox.")

duplicates = sorted(address for address, count in Counter(addresses).items() if count > 1)
if duplicates:
    print("Duplicate IPs:")
    for address in duplicates:
        print(address)
else:
    print("No duplicate IPs found.")
PYEOF
```

## Step 4: Set Up Ongoing Automation

```bash
# Configure DHCP server integration (ISC DHCP/Kea) to update IPAM on lease events
# Configure your provisioning tool (Terraform/Ansible) to allocate IPs from IPAM
# Set up periodic scanning to detect unregistered IPs
```

## Conclusion

Migrating to NetBox or phpIPAM replaces fragile spreadsheets with a robust, API-driven IPAM platform. The bulk import process is straightforward - export to CSV, transform to the tool's format, and validate after import. Once live, integrate with your provisioning workflows to keep the IPAM database accurate automatically.
