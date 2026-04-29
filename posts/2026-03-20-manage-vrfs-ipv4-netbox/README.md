# How to Manage VRFs for IPv4 in NetBox

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NetBox, VRF, IPv4, IPAM, Network Segmentation, Multi-Tenant

Description: Create and manage VRF (Virtual Routing and Forwarding) instances in NetBox to organize overlapping IPv4 address spaces for multi-tenant or segmented network environments.

VRFs in NetBox represent separate routing domains where the same IPv4 address space can be reused. This is essential for multi-tenant environments where different customers or departments use identical private IP ranges.

## When to Use VRFs

- **Multi-tenant**: Customer A and Customer B both use `192.168.1.0/24`
- **Network segmentation**: Production and Development use the same IP scheme
- **Route leaking documentation**: Track which prefixes are shared between VRFs
- **Carrier routing**: Document MPLS VPN customer VRFs

## Creating a VRF

Via web UI: IPAM → VRFs → + Add

```bash
# Create a VRF via API

# "enforce_unique" prevents duplicate prefixes/IP addresses within the VRF
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production",
    "rd": "65000:100",
    "enforce_unique": true,
    "description": "Production network VRF"
  }' \
  http://localhost:8080/api/ipam/vrfs/

# Create another VRF for a customer
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer-A",
    "rd": "65000:200",
    "enforce_unique": true,
    "description": "Customer A private VRF"
  }' \
  http://localhost:8080/api/ipam/vrfs/
```

## Assigning Prefixes to a VRF

```bash
# Get the VRF ID by its unique route distinguisher
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:8080/api/ipam/vrfs/?rd=65000:100" \
  | python3 -c 'import json, sys; print(json.load(sys.stdin)["results"][0]["id"])'

# Create a prefix within the VRF
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "prefix": "10.0.0.0/24",
    "vrf": <VRF_ID>,
    "status": "active",
    "description": "Production server subnet"
  }' \
  http://localhost:8080/api/ipam/prefixes/

# Create the same prefix in Customer-A VRF (allowed due to separate VRF)
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "prefix": "10.0.0.0/24",
    "vrf": <CUSTOMER_A_VRF_ID>,
    "status": "active",
    "description": "Customer A server subnet"
  }' \
  http://localhost:8080/api/ipam/prefixes/
```

## Assigning IP Addresses to a VRF

```bash
# Create an IP in a specific VRF
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "10.0.0.5/24",
    "vrf": <VRF_ID>,
    "status": "active",
    "description": "Production web server"
  }' \
  http://localhost:8080/api/ipam/ip-addresses/
```

## Querying IPs Within a VRF

```bash
# Get all IPs in a specific VRF
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:8080/api/ipam/ip-addresses/?vrf_id=<VRF_ID>" \
  | python3 -m json.tool

# Get all prefixes in a VRF
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:8080/api/ipam/prefixes/?vrf_id=<VRF_ID>" \
  | python3 -m json.tool | grep '"prefix"'
```

## The Global Routing Table

NetBox has a special "global" routing table for IPs not in any VRF. Set `vrf: null` or omit the VRF field for global IPs:

```bash
# Search global table (no VRF)
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:8080/api/ipam/ip-addresses/?vrf_id=null" \
  | python3 -m json.tool
```

## Documenting Route Targets for MPLS VPNs

```bash
# Create import/export route targets
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "65000:100"}' \
  http://localhost:8080/api/ipam/route-targets/

# Assign to VRF
curl -X PATCH \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"import_targets": [<ROUTE_TARGET_ID>], "export_targets": [<ROUTE_TARGET_ID>]}' \
  http://localhost:8080/api/ipam/vrfs/<VRF_ID>/
```

VRF documentation in NetBox is essential for multi-tenant architectures where address space reuse would otherwise make IP tracking ambiguous.
