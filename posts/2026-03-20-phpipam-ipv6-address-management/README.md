# How to Configure phpIPAM for IPv6 Address Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, phpIPAM, IPAM, Network Management, Open Source

Description: Configure phpIPAM to manage IPv6 subnets, assign addresses, configure DHCPv6 discovery, and use the phpIPAM API for IPv6 automation.

## Introduction

phpIPAM is a PHP-based open source IPAM solution with built-in IPv6 support and a REST API. This guide covers adding IPv6 sections, creating subnets, reviewing the current limits around IPv6 discovery and DHCP integration, and using the API.

## Step 1: Enable IPv6 in phpIPAM

phpIPAM supports IPv6 out of the box, so there is no separate IPv6 toggle to enable.

```yaml
# Example full-stack deployment with the official Docker images
# Save as docker-compose.yml, then run: docker compose up -d

services:
  phpipam-web:
    image: phpipam/phpipam-www:latest
    ports:
      - "80:80"
    environment:
      - TZ=Europe/London
      - IPAM_DATABASE_HOST=phpipam-mariadb
      - IPAM_DATABASE_PASS=my_secret_phpipam_pass
      - IPAM_DATABASE_WEBHOST=%
    restart: unless-stopped
    volumes:
      - phpipam-logo:/phpipam/css/images/logo
      - phpipam-ca:/usr/local/share/ca-certificates:ro
    depends_on:
      - phpipam-mariadb
    cap_add:
      - NET_ADMIN
      - NET_RAW

  phpipam-cron:
    image: phpipam/phpipam-cron:latest
    environment:
      - TZ=Europe/London
      - IPAM_DATABASE_HOST=phpipam-mariadb
      - IPAM_DATABASE_PASS=my_secret_phpipam_pass
      - SCAN_INTERVAL=1h
    restart: unless-stopped
    volumes:
      - phpipam-ca:/usr/local/share/ca-certificates:ro
    depends_on:
      - phpipam-mariadb
    cap_add:
      - NET_ADMIN
      - NET_RAW

  phpipam-mariadb:
    image: mariadb:latest
    environment:
      - MYSQL_ROOT_PASSWORD=my_secret_mysql_root_pass
    restart: unless-stopped
    volumes:
      - phpipam-db-data:/var/lib/mysql

volumes:
  phpipam-db-data:
  phpipam-logo:
  phpipam-ca:
```

## Step 2: Create IPv6 Sections and Subnets

In phpIPAM UI:
1. **Sections**: Create a section called "IPv6" under Administration > Sections
2. **Subnets**: Navigate to the IPv6 section and add subnets

```text
Subnet: 2001:db8:0001::/48
Description: HQ Site
VLAN: associate with existing VLAN
```

## Step 3: phpIPAM REST API for IPv6

```python
#!/usr/bin/env python3
# phpipam_ipv6.py

import requests

PHPIPAM_URL = "http://phpipam.internal"
APP_ID = "myapp"
USERNAME = "admin"
PASSWORD = "password"

# Authenticate
auth_resp = requests.post(
    f"{PHPIPAM_URL}/api/{APP_ID}/user/",
    auth=(USERNAME, PASSWORD)
)
auth_resp.raise_for_status()
TOKEN = auth_resp.json()["data"]["token"]
HEADERS = {"phpipam-token": TOKEN, "Content-Type": "application/json"}

# Create an IPv6 subnet
subnet_data = {
    "subnet": "2001:db8:0001::",
    "mask": 48,
    "description": "HQ Site IPv6 Prefix",
    "sectionId": 2,  # IPv6 section ID
    "isFolder": 0
}

resp = requests.post(
    f"{PHPIPAM_URL}/api/{APP_ID}/subnets/",
    headers=HEADERS,
    json=subnet_data
)
resp.raise_for_status()
print(f"Created subnet: {resp.json()}")

# Add a /64 under the /48
vlan_subnet = {
    "subnet": "2001:db8:0001:0001::",
    "mask": 64,
    "description": "HQ Servers",
    "masterSubnetId": resp.json()["id"],
    "sectionId": 2
}
resp2 = requests.post(
    f"{PHPIPAM_URL}/api/{APP_ID}/subnets/",
    headers=HEADERS,
    json=vlan_subnet
)
resp2.raise_for_status()
print(f"Created /64: {resp2.json()}")

# Get all IPv6 addresses in a subnet
subnet_id = resp2.json()["id"]
addresses_resp = requests.get(
    f"{PHPIPAM_URL}/api/{APP_ID}/subnets/{subnet_id}/addresses/",
    headers=HEADERS
)
addresses_resp.raise_for_status()
print(f"Addresses in subnet: {addresses_resp.json()}")
```

## Step 4: IPv6 Subnet Scanning (Ping Discovery)

Current phpIPAM releases do not support ping or discovery scans for IPv6 subnets. The UI blocks IPv6 subnet scans, and the scheduled ping/discovery jobs only operate on IPv4 subnets. For IPv6, use phpIPAM to model prefixes and track addresses through the UI or API instead of relying on automatic discovery.

## Step 5: DHCPv6 Integration

Current phpIPAM DHCP integration is Kea-based. It reads the Kea configuration defined in phpIPAM's DHCP settings; upstream phpIPAM does not support importing ISC DHCPv6 lease files.

```json
{
  "type": "kea",
  "settings": {
    "file": "/etc/kea/kea.conf"
  }
}
```

## Step 6: Tag IPv6 Addresses by Type

phpIPAM supports custom tags for marking address types:

```python
# Tag an address as SLAAC-derived
tag_data = {
    "ip": "2001:db8:0001:0001::1234:5678:9abc",
    "subnetId": subnet_id,
    "description": "Desktop-workstation-01 SLAAC",
    "tag": 2,            # Tag ID for "Used"
    "owner": "john.doe"
}

resp = requests.post(
    f"{PHPIPAM_URL}/api/{APP_ID}/addresses/",
    headers=HEADERS,
    json=tag_data
)
resp.raise_for_status()
```

## Conclusion

phpIPAM provides solid IPv6 IPAM for small to medium organizations with its subnet hierarchy (sections → subnets → addresses) and REST API. The UI is straightforward for network administrators without programming experience. For automation-heavy environments or large-scale deployments, consider NetBox's more powerful API and data model. The key phpIPAM IPv6 limitation in current upstream releases is that automatic ping and discovery scans are limited to IPv4, so IPv6 addresses such as SLAAC assignments need to be recorded manually or through the API.
