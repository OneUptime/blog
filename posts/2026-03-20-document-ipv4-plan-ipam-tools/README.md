# How to Document an IPv4 Address Plan with IPAM Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPAM, IPv4, NetBox, phpIPAM, Documentation, Network Management

Description: Learn how to document and manage your IPv4 address plan using IPAM (IP Address Management) tools like NetBox and phpIPAM, including API-based automation.

## Why Use IPAM Tools?

A spreadsheet IPv4 plan quickly becomes unmanageable at scale. IPAM tools provide:
- Visual subnet hierarchy and utilization
- Conflict detection and validation
- API-based automation
- Change history and audit trail
- Integration with DNS and DHCP

## Step 1: Install NetBox (Docker)

```bash
git clone -b release https://github.com/netbox-community/netbox-docker.git
cd netbox-docker

# Copy the example override file
cp docker-compose.override.yml.example docker-compose.override.yml

# Start
docker compose pull
docker compose up -d

# Create the first admin user
docker compose exec netbox /opt/netbox/netbox/manage.py createsuperuser

# Access at http://localhost:8000
```

## Step 2: Create Prefix Hierarchy in NetBox

Via the web UI:
1. IPAM → Prefixes → Add
2. Create parent blocks first (10.0.0.0/8)
3. Then add regional blocks (10.1.0.0/16)
4. Then campus/site blocks (10.1.0.0/21)
5. Then VLAN/floor subnets (10.1.0.0/24)

## Step 3: Automate with NetBox API

```python
import requests

NETBOX_URL = "http://localhost:8000"
NETBOX_TOKEN = "nbt_yourtokenkey.yourtokensecret"

headers = {
    "Authorization": f"Bearer {NETBOX_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

def create_prefix(prefix, description, status="active", scope_id=None):
    """Create a prefix in NetBox."""
    data = {
        "prefix": prefix,
        "description": description,
        "status": status,
    }
    if scope_id:
        data["scope_type"] = "dcim.site"
        data["scope_id"] = scope_id

    response = requests.post(
        f"{NETBOX_URL}/api/ipam/prefixes/",
        json=data,
        headers=headers,
    )
    response.raise_for_status()
    return response.json()

def get_prefix_details(prefix_id):
    """Get details for a prefix."""
    response = requests.get(
        f"{NETBOX_URL}/api/ipam/prefixes/{prefix_id}/",
        headers=headers,
    )
    response.raise_for_status()
    data = response.json()
    return {
        "prefix": data["prefix"],
        "status": data["status"]["value"],
        "children": data["children"],
    }

# Create the addressing hierarchy
prefixes = [
    ("10.0.0.0/8", "Enterprise Root"),
    ("10.1.0.0/16", "Americas Region"),
    ("10.1.0.0/21", "NYC HQ Campus"),
    ("10.1.0.0/24", "NYC Floor 1 - Reception"),
    ("10.1.1.0/24", "NYC Floor 2 - Sales"),
]

for prefix, description in prefixes:
    result = create_prefix(prefix, description)
    print(f"Created: {result['prefix']} (ID: {result['id']})")
```

## Step 4: Import Existing Address Plan

```python
import requests
import csv

NETBOX_URL = "http://localhost:8000"
NETBOX_TOKEN = "nbt_yourtokenkey.yourtokensecret"

headers = {
    "Authorization": f"Bearer {NETBOX_TOKEN}",
    "Content-Type": "application/json",
}

def import_from_csv(csv_file):
    """Import prefixes from a CSV file to NetBox."""
    # CSV format: prefix,description,status,scope_type,scope_id
    with open(csv_file, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            data = {
                "prefix": row["prefix"],
                "description": row["description"],
                "status": row.get("status", "active"),
            }
            if row.get("scope_type") and row.get("scope_id"):
                data["scope_type"] = row["scope_type"]
                data["scope_id"] = int(row["scope_id"])

            response = requests.post(
                f"{NETBOX_URL}/api/ipam/prefixes/",
                json=data,
                headers=headers,
            )

            if response.status_code == 201:
                print(f"✓ {row['prefix']}: {row['description']}")
            elif response.status_code == 400 and "already exists" in response.text.lower():
                print(f"EXISTS: {row['prefix']}")
            else:
                print(f"✗ {row['prefix']}: {response.text}")

import_from_csv('ipv4-plan.csv')
```

## Step 5: Check for Available Subnets

```python
from ipaddress import ip_network

def get_available_subnets(parent_prefix, desired_prefix_length):
    """Find available subnets within a parent prefix."""
    parent_id_response = requests.get(
        f"{NETBOX_URL}/api/ipam/prefixes/?prefix={parent_prefix}",
        headers=headers,
    )
    parent_id_response.raise_for_status()
    prefixes = parent_id_response.json()["results"]
    if not prefixes:
        print(f"Parent prefix {parent_prefix} not found")
        return

    parent_id = prefixes[0]["id"]

    available_response = requests.get(
        f"{NETBOX_URL}/api/ipam/prefixes/{parent_id}/available-prefixes/",
        headers=headers,
    )
    available_response.raise_for_status()

    available = available_response.json()
    matches = []

    for avail in available:
        network = ip_network(avail["prefix"])
        if desired_prefix_length < network.prefixlen:
            continue
        if desired_prefix_length == network.prefixlen:
            matches.append(network)
        else:
            for subnet in network.subnets(new_prefix=desired_prefix_length):
                matches.append(subnet)
                if len(matches) >= 10:
                    break
        if len(matches) >= 10:
            break

    print(f"Available /{desired_prefix_length} prefixes within {parent_prefix}:")
    if not matches:
        print("  None found")
        return
    for network in matches[:10]:
        print(f"  {network} ({network.num_addresses} addresses)")

get_available_subnets('10.1.0.0/16', 24)
```

## Step 6: phpIPAM as an Alternative

For simpler deployments, phpIPAM is lighter weight:

```bash
cat > docker-compose.yml <<'EOF'
services:
  phpipam-web:
    image: phpipam/phpipam-www:latest
    ports:
      - "80:80"
    environment:
      - IPAM_DATABASE_HOST=phpipam-mariadb
      - IPAM_DATABASE_PASS=change_me
      - IPAM_DATABASE_WEBHOST=%
    depends_on:
      - phpipam-mariadb
    cap_add:
      - NET_ADMIN
      - NET_RAW

  phpipam-cron:
    image: phpipam/phpipam-cron:latest
    environment:
      - IPAM_DATABASE_HOST=phpipam-mariadb
      - IPAM_DATABASE_PASS=change_me
      - SCAN_INTERVAL=1h
    depends_on:
      - phpipam-mariadb
    cap_add:
      - NET_ADMIN
      - NET_RAW

  phpipam-mariadb:
    image: mariadb:latest
    environment:
      - MYSQL_ROOT_PASSWORD=change_me_root
    volumes:
      - phpipam-db-data:/var/lib/mysql

volumes:
  phpipam-db-data:
EOF

docker compose up -d

# Access at http://localhost
# Default credentials after a fresh install: Admin / ipamadmin
# API endpoints are served under http://localhost/api/ once an API app is configured
```

## Conclusion

IPAM tools like NetBox and phpIPAM bring structure to IPv4 address management. NetBox's prefix hierarchy, utilization tracking, and REST API make it ideal for large enterprises. Import your existing plan via CSV or API, create sites and VLANs to associate prefixes with network topology, and use the API for automation - creating prefixes when new VLANs are provisioned and marking IPs as used when devices are deployed. The investment in IPAM documentation pays dividends during troubleshooting and capacity planning.
