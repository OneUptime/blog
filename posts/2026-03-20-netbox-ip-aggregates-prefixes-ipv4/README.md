# How to Create IP Aggregates and Prefixes in NetBox for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NetBox, IPAM, IPv4, Prefixes, Subnets, Network Management

Description: Use NetBox to organize your IPv4 address space by creating RIRs, aggregates, and prefixes that represent your network hierarchy.

NetBox organizes IPv4 address space in a hierarchy: RIR → Aggregate → Prefix → IP Address. Understanding and correctly populating this hierarchy makes IPAM tracking effective.

## The Hierarchy

```text
RIR (e.g., ARIN, RFC 1918)
  └── Aggregate (e.g., 10.0.0.0/8)
        └── Prefix (e.g., 10.100.0.0/16 - Production)
              └── Prefix (e.g., 10.100.1.0/24 - Web Tier)
                    └── IP Address (e.g., 10.100.1.10 - web01)
```

## Step 1: Create RIRs

Via the web UI: IPAM → RIRs → Add

```bash
# Or via API

curl -X POST \
  -H "Authorization: Token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RFC 1918",
    "slug": "rfc-1918",
    "is_private": true,
    "description": "Private IPv4 address ranges"
  }' \
  http://localhost:8080/api/ipam/rirs/
```

## Step 2: Create Aggregates

Aggregates are top-level blocks assigned to an RIR:

```bash
# Create an aggregate for 10.0.0.0/8
curl -X POST \
  -H "Authorization: Token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "prefix": "10.0.0.0/8",
    "rir": 1,
    "description": "Corporate private IPv4 space"
  }' \
  http://localhost:8080/api/ipam/aggregates/

# Create aggregates for all RFC 1918 ranges
# 172.16.0.0/12 and 192.168.0.0/16 follow the same pattern
```

## Step 3: Create Prefixes

Prefixes are subdivisions of aggregates, representing actual network segments:

```bash
# Create a site-level prefix
curl -X POST \
  -H "Authorization: Token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "prefix": "10.100.0.0/16",
    "status": "active",
    "role": null,
    "description": "Production data center - New York",
    "is_pool": false,
    "custom_fields": {}
  }' \
  http://localhost:8080/api/ipam/prefixes/

# Create sub-prefixes (tiers within the site)
# Pass the role's primary key (integer ID) for foreign key fields
curl -X POST \
  -H "Authorization: Token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "prefix": "10.100.1.0/24",
    "status": "active",
    "description": "Production - Web Tier",
    "role": 1
  }' \
  http://localhost:8080/api/ipam/prefixes/
```

## Step 4: Creating Prefixes via the Web UI

1. Navigate to **IPAM → Prefixes → + Add**
2. Enter the **Prefix** (e.g., `10.100.1.0/24`)
3. Set **Status**: Active/Reserved/Deprecated
4. Select a **Site** if applicable
5. Set a **VLAN** if the prefix maps to a VLAN
6. Add a **Description** and **Role**
7. Save

## Viewing Prefix Utilization

```bash
# Get prefix details including utilization
curl -H "Authorization: Token <TOKEN>" \
  "http://localhost:8080/api/ipam/prefixes/?prefix=10.100.1.0/24" \
  | python3 -m json.tool | grep -E "utilized|available"

# From the web UI: IPAM → Prefixes → click a prefix → Utilization bar shows %
```

## Getting Available Sub-Prefixes

```bash
# Ask NetBox for available prefixes within a parent
curl -H "Authorization: Token <TOKEN>" \
  "http://localhost:8080/api/ipam/prefixes/<ID>/available-prefixes/" \
  | python3 -m json.tool
```

## Prefix Roles

Define roles to categorize prefixes:

```bash
# Create prefix roles
for role in web-tier app-tier db-tier management vpn dmz; do
  curl -X POST \
    -H "Authorization: Token <TOKEN>" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$role\", \"slug\": \"$role\"}" \
    http://localhost:8080/api/ipam/roles/
done
```

With a well-organized prefix hierarchy in NetBox, you can immediately see which subnets are allocated, what role they serve, and how much space remains in each block.
