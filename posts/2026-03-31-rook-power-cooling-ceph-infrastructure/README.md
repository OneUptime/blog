# How to Plan Power and Cooling for Ceph Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Power, Cooling, Infrastructure, Data Center, Hardware

Description: Plan power and cooling for a Rook-Ceph cluster by calculating TDP, PDU requirements, cooling capacity, and considering power efficiency strategies for dense storage deployments.

---

## Overview

Dense storage clusters like Ceph can have significant power and cooling requirements. Underestimating these leads to thermal throttling, premature hardware failures, and unplanned outages. This guide covers calculating and planning power and cooling for production Ceph infrastructure.

## Power Consumption Components

| Component | Typical Power |
|-----------|--------------|
| OSD node (HDD-based) | 400-800W |
| OSD node (NVMe-based) | 300-600W |
| 10 GbE switch | 150-300W |
| 25 GbE switch | 300-600W |
| 100 GbE switch | 800-1500W |

## Step 1 - Calculate Total Power Draw

```bash
#!/bin/bash
# Cluster power calculation
OSD_NODES=6
POWER_PER_NODE=600  # Watts (HDD-dense server)
SWITCH_NODES=2
POWER_PER_SWITCH=300

SERVER_POWER=$((OSD_NODES * POWER_PER_NODE))
SWITCH_POWER=$((SWITCH_NODES * POWER_PER_SWITCH))
TOTAL_POWER=$((SERVER_POWER + SWITCH_POWER))

# Add 20% overhead for peaks and PSU inefficiency
DESIGN_POWER=$(echo "$TOTAL_POWER * 1.2" | bc | cut -d. -f1)

echo "Server power: ${SERVER_POWER}W"
echo "Switch power: ${SWITCH_POWER}W"
echo "Total active: ${TOTAL_POWER}W"
echo "Design capacity needed: ${DESIGN_POWER}W"
echo "Design capacity in kW: $(echo "scale=1; $DESIGN_POWER / 1000" | bc)kW"
```

## Step 2 - PDU and Circuit Requirements

```bash
# For 5040W design power across 2 PDUs (N+1):
# Each PDU must support full load
# 5040W / 208V = 24.2A per PDU
# Use 30A circuits with 80% derating
# 30A * 0.8 = 24A per circuit

# Typical rack PDU: 20-30A @ 208/220V
# At 80% derating, a single 30A circuit is tight: consider higher-rated PDU or 2 circuits

echo "Minimum per PDU: 30A @ 208V"
echo "Use: Dual 30A @ 208V PDUs per rack"
```

## Step 3 - Cooling Requirements

```bash
# Power to cooling conversion
# 1 kW = approximately 3,412 BTU/hr

DESIGN_KW=5  # kW (rounded from 5040W design power)
BTU_PER_HOUR=$((DESIGN_KW * 3412))
TONS_OF_COOLING=$(echo "scale=1; $BTU_PER_HOUR / 12000" | bc)

echo "Cooling needed: ${BTU_PER_HOUR} BTU/hr"
echo "Cooling needed: ${TONS_OF_COOLING} tons of cooling"
```

## Step 4 - Rack-Level Airflow Design

```text
Front-to-back airflow (standard):
- Cold aisle at front of rack
- Hot aisle at rear
- Blanking panels in empty rack units

Typical HDD server: 100-200 CFM airflow
Dense 4U storage: 300-500 CFM airflow
```

For dense Ceph racks:

```bash
# Hot aisle containment helps efficiency
# Target: inlet temperature < 27°C (80°F)
# Target: delta T < 15°C (front to back)

# Monitor inlet temperature:
ipmitool sdr type Temperature | grep -i inlet
```

## Step 5 - Power Redundancy Planning

```yaml
power_redundancy:
  pdu_per_rack: 2  # N+1 redundancy
  psu_per_server: 2  # Dual PSU, each on different PDU
  ups_capacity: "N+1 or 2N for critical clusters"
  generator: "optional for tier-2+ SLA"

redundancy_levels:
  - A_side: "PDU connected to UPS circuit 1"
  - B_side: "PDU connected to UPS circuit 2"
```

## Step 6 - Monitor Power Consumption

```bash
# Check server power draw via IPMI
ipmitool dcmi power reading

# All servers in cluster
for host in osd-node-{1..6}; do
  echo -n "$host: "
  ssh $host "ipmitool dcmi power reading | grep 'Instantaneous'"
done
```

## Step 7 - Power Efficiency Optimization

```bash
# Enable power-efficient CPU governor during low utilization
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
  echo conservative > $cpu
done

# Spin down unused HDDs after idle (careful - Ceph may restart them frequently)
# Not recommended for OSDs - latency impact from spinup
# DO use for dedicated monitoring or infrastructure nodes

# BIOS settings for HDD-dense nodes:
# - Disable unused PCIe slots
# - Set power management to "OS control"
# - Disable wake-on-LAN if not used
```

## Step 8 - Environmental Monitoring

```yaml
# Set up thermal alerts
alerts:
  - inlet_temp_warning: 27C
  - inlet_temp_critical: 35C
  - fan_failure: immediate_alert
  - pdu_current_warning: "85% of rated capacity"
```

## Summary

Power and cooling planning for Ceph infrastructure requires calculating both average and peak power draw, then designing for N+1 redundancy at every level - PDUs, PSUs, and cooling. Dense HDD nodes are power-hungry; a full rack of 4U storage servers can draw 15-20 kW requiring dedicated circuits and precision cooling. Early planning for power capacity prevents costly retrofits when the cluster grows.
