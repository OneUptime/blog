# How to Calculate Total Cost of Ownership for Ceph Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cost, TCO, Storage, Planning

Description: A practical guide to calculating the total cost of ownership for a Ceph cluster, covering hardware, power, people, and software licensing components.

---

## TCO Components for Ceph

Total cost of ownership for Ceph goes beyond raw drive costs. A complete TCO model includes hardware acquisition, power and cooling, rack space, network infrastructure, personnel, and software support contracts.

## Hardware Costs

Calculate the upfront hardware cost per TB of usable capacity. For a 3x replication cluster with 12 TB HDD nodes:

```bash
# Example: 10 nodes x $8,000 each = $80,000 hardware
# Raw capacity: 10 nodes x 12 drives x 4 TB = 480 TB raw
# Usable (3x replication): 480 / 3 = 160 TB usable
# Cost per raw TB: $80,000 / 480 = ~$167/TB raw
# Cost per usable TB: $80,000 / 160 = ~$500/TB usable
```

## Power and Cooling

Estimate annual power costs using server TDP and local electricity rates:

```bash
# Each node: 200W idle, 300W peak
# 10 nodes average: 250W x 10 = 2,500W = 2.5 kW
# Annual: 2.5 kW x 8,760 hours = 21,900 kWh
# At $0.10/kWh: $2,190/year
# Add 30% for cooling overhead: ~$2,847/year
```

## Staff and Operational Costs

Ceph requires dedicated expertise. Estimate FTE cost for your team:

```bash
# Junior Ceph admin: ~$90,000/year fully loaded
# Senior Ceph engineer: ~$150,000/year fully loaded
# Small cluster (< 50 nodes): 0.5 FTE = ~$75,000/year
# Large cluster (200+ nodes): 1.5 FTE = ~$225,000/year
```

## Building a 5-Year TCO Spreadsheet

A simple 5-year model in a structured format:

```yaml
year_1:
  hardware: 80000
  network: 15000
  power_cooling: 2847
  staff: 75000
  support_contract: 0
  total: 172847

year_2_5_annual:
  hardware_refresh: 5000
  power_cooling: 2847
  staff: 75000
  total_per_year: 82847

five_year_tco: 504235
usable_tb: 160
cost_per_tb_per_year: 630
```

## Using Ceph's Capacity Data for Ongoing Costs

Track actual utilization to refine projections:

```bash
# Check current utilization
ceph df detail

# Get per-pool usage
ceph osd df tree

# Export metrics for cost modeling
ceph report | python3 -c "
import json, sys
r = json.load(sys.stdin)
used = r['pgmap']['bytes_used'] / (1024**4)
avail = r['pgmap']['bytes_avail'] / (1024**4)
print(f'Used: {used:.1f} TB, Available: {avail:.1f} TB')
"
```

## Comparing Depreciation Models

Apply straight-line depreciation over a 5-year hardware lifecycle:

```bash
# Hardware: $80,000 over 5 years = $16,000/year
# Network gear: $15,000 over 5 years = $3,000/year
# Annual depreciation: $19,000
```

## Total 5-Year Summary

```bash
# Hardware + network (upfront): $95,000
# Annual ops (power + staff): ~$78,000
# 5-year ops total: $390,000
# 5-year TCO: $485,000
# Amortized: ~$97,000/year for 160 TB usable
# Cost per TB per year: ~$606
```

## Summary

Ceph TCO analysis must account for all cost centers - hardware, power, cooling, networking, personnel, and support. By modeling these over a 5-year horizon and comparing against usable capacity, you get a realistic per-TB cost that enables fair comparisons with cloud storage alternatives.
