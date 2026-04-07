# How to Choose Server Form Factor for Ceph Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Hardware, Server, Form Factor, Infrastructure, Data Center

Description: Compare server form factors for Ceph nodes including 1U, 2U, 4U dense storage, and JBOD configurations to find the best fit for your cluster size and operational requirements.

---

## Overview

Server form factor significantly impacts Ceph cluster density, manageability, power efficiency, and cost. The right choice depends on your disk count requirements, data center space, cooling capabilities, and planned growth.

## Common Form Factors for Ceph

### 1U Rack Server
- Typically 4-12 drive bays
- Low density, best for NVMe-heavy clusters
- Good for compute-intensive workloads (NVMe OSDs)

### 2U Rack Server
- Typically 8-24 drive bays
- Good balance of density and manageability
- Suitable for mixed SSD/HDD Ceph nodes

### 4U Dense Storage Server
- 24-60+ drive bays
- Highest HDD density per rack unit
- Best for capacity-optimized HDD clusters

### JBOD (Just a Bunch of Disks)
- Disk enclosure without compute
- Pairs with a head node
- Maximum storage density, complex management

## Step 1 - Calculate Rack Unit Budget

```bash
# Available rack space: 42U rack
RACK_UNITS=42
# Reserve: 2U for top-of-rack switch, 2U for patch panels
AVAILABLE=$((RACK_UNITS - 4))
echo "Available for servers: ${AVAILABLE}U"

# For 100 TB usable with 12 TB HDDs and 3x replication:
# Raw needed: 300 TB
# Disks needed: 300 / 12 = 25 disks
# With 36 drives per 4U server: 1 server handles all disks in 4U
# With 12 drives per 2U server: need 3 servers x 2U = 6U
```

## Step 2 - Compare Disk Density

```text
Form Factor | Drive Bays | Rack Units | Drives/RU
------------|-----------|------------|----------
1U (LFF)    | 4          | 1          | 4
2U (LFF)    | 12-24      | 2          | 6-12
4U (LFF)    | 24-60      | 4          | 6-15
4U Dense    | 36-60      | 4          | 9-15
JBOD 4U     | 60-84      | 4          | 15-21
```

For HDD-dense clusters: 4U dense storage servers offer the best rack space efficiency.

## Step 3 - Consider Cabling and Maintenance

```text
1U/2U pros:
- Standard cabling
- Easier individual drive replacement
- Better airflow per drive

4U dense pros:
- Fewer servers to manage
- Lower per-drive cost at scale
- Single server handles more OSDs

4U dense cons:
- Single server failure loses many OSDs
- Requires careful CRUSH rule design
- Hot-swap may be harder in high-density configs
```

## Step 4 - CPU and RAM Slot Availability

Check that the form factor supports your RAM requirements:

```bash
# For 12 HDDs per server at 4 GB RAM per OSD:
# OSD RAM = 48 GB
# OS + system = 16 GB
# Total minimum = 64 GB
# Recommend = 128 GB for headroom

# Verify server supports enough DIMM slots for 128 GB
# Most 2U servers: 8-16 DIMM slots
# 16 x 16 GB = 256 GB max
```

## Step 5 - Network Port Considerations

Dense servers may have limited PCIe slots for NICs:

```bash
# Requirements per Ceph node:
# - 2 ports for public network (bonded)
# - 2 ports for cluster network (bonded)
# Total: 4 x 10/25 GbE ports minimum

# Options:
# 1. Dual-port 25 GbE (run both networks on same card, separate VLAN)
# 2. Quad-port 10 GbE card
# 3. OCP 3.0 mezzanine NICs for density
```

## Step 6 - Power and Cooling Per Form Factor

```text
Form Factor | Typical TDP | Drives Included
------------|-------------|----------------
1U (4 HDD)  | 200-300W   | 4 x 3.5" HDD
2U (12 HDD) | 400-500W   | 12 x 3.5" HDD
4U (24 HDD) | 600-800W   | 24 x 3.5" HDD
4U (60 HDD) | 1200-1500W | 60 x 3.5" HDD
```

Ensure your PDU and cooling can handle the density you choose.

## Recommended Choices

```yaml
use_case: "Capacity-optimized HDD cluster"
recommendation: "4U dense storage server (24-36 drives)"
rationale: "Best density/manageability balance"

use_case: "Performance NVMe cluster"
recommendation: "2U server (8-12 NVMe slots)"
rationale: "NVMe doesn't require drive density"

use_case: "Mixed workload / moderate size"
recommendation: "2U server (12-24 drives)"
rationale: "Flexible, standard components, good manageability"
```

## Summary

Server form factor selection balances disk density, manageability, power efficiency, and cost. For HDD-dominated Ceph clusters prioritizing raw capacity, 4U dense storage servers maximize drives per rack unit. For NVMe or mixed workloads, 2U servers offer flexibility and simpler maintenance. Always verify that your chosen form factor supports sufficient RAM slots and PCIe lanes for Ceph's memory and network requirements.
