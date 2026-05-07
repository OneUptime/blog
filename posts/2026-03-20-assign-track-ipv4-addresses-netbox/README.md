# How to Assign and Track IPv4 Addresses in NetBox

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NetBox, IPAM, IPv4, IP Tracking, Network Management, API

Description: Use NetBox to assign specific IPv4 addresses to devices and interfaces, track address status, and maintain a complete IP inventory.

NetBox IP address management connects every IPv4 address to a device, interface, or service, making your IPAM a single source of truth for the entire network.

## Creating Individual IP Addresses

Via the web UI: IPAM → IP Addresses → + Add

```bash
# Create an IP address via the API

curl -X POST \
  -H "Authorization: Token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "10.100.1.10/24",
    "status": "active",
    "dns_name": "web01.corp.example.com",
    "description": "Web server 01 - eth0"
  }' \
  http://localhost:8080/api/ipam/ip-addresses/
```

## Assigning an IP to a Device Interface

First, ensure the device and interface exist in NetBox (DCIM section):

```bash
# Get the interface ID
curl -H "Authorization: Token <TOKEN>" \
  "http://localhost:8080/api/dcim/interfaces/?device=web01&name=eth0&fields=id,name" \
  | python3 -c 'import json, sys; print(json.load(sys.stdin)["results"][0]["id"])'

# Assign IP to the interface
curl -X PATCH \
  -H "Authorization: Token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "assigned_object_type": "dcim.interface",
    "assigned_object_id": <INTERFACE_ID>
  }' \
  http://localhost:8080/api/ipam/ip-addresses/<IP_ID>/
```

## IP Address Status Values

```bash
# Available statuses:
# active      - in use
# reserved    - reserved for future use
# deprecated  - no longer in use, can be reclaimed
# dhcp        - assigned by DHCP (not manually)
# slaac       - assigned via IPv6 SLAAC (IPv6 only)

# Update IP status
curl -X PATCH \
  -H "Authorization: Token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "deprecated"}' \
  http://localhost:8080/api/ipam/ip-addresses/<IP_ID>/
```

## Getting the Next Available IP from a Prefix

```bash
# Request the next available IP in a prefix
curl -X POST \
  -H "Authorization: Token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"description": "auto-assigned to new server"}' \
  "http://localhost:8080/api/ipam/prefixes/<PREFIX_ID>/available-ips/"

# Response includes the allocated IP address
```

## Bulk Importing IP Addresses

```bash
# Import from CSV via web UI: IPAM → IP Addresses → Import
# CSV format:
# address,status,dns_name,description
# 10.100.1.10/24,active,web01.corp.example.com,Web Server 01
# 10.100.1.11/24,active,web02.corp.example.com,Web Server 02
```

## Searching and Filtering IPs

```bash
# Find all IPs in a prefix
curl -H "Authorization: Token <TOKEN>" \
  "http://localhost:8080/api/ipam/ip-addresses/?parent=10.100.1.0/24" \
  | python3 -m json.tool

# Find IPs by DNS name
curl -H "Authorization: Token <TOKEN>" \
  "http://localhost:8080/api/ipam/ip-addresses/?dns_name=web01.corp.example.com" \
  | python3 -m json.tool

# Find all active IPs
curl -H "Authorization: Token <TOKEN>" \
  "http://localhost:8080/api/ipam/ip-addresses/?status=active&limit=100" \
  | python3 -m json.tool | grep "\"address\""
```

## Checking IP Utilization per Prefix

```bash
# NetBox calculates prefix utilization automatically from child IPs, ranges, and prefixes.
# The REST prefix serializer returns prefix metadata such as children and mark_utilized.
curl -H "Authorization: Token <TOKEN>" \
  "http://localhost:8080/api/ipam/prefixes/?prefix=10.100.1.0/24&fields=prefix,children,mark_utilized,is_pool" \
  | python3 -m json.tool
```

## Setting a Device's Primary IP

```bash
# Set the primary IPv4 address for a device (used for management access)
curl -X PATCH \
  -H "Authorization: Token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"primary_ip4": <IP_ADDRESS_ID>}' \
  http://localhost:8080/api/dcim/devices/<DEVICE_ID>/
```

Maintaining an accurate IP-to-device mapping in NetBox eliminates the "what's using this IP?" question and provides an authoritative record for change management and troubleshooting.
