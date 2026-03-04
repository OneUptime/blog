# How to Configure a Cost-Optimized SAP S/4HANA HA Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP, S/4HANA, High Availability, Cost Optimization, Linux

Description: Set up a cost-optimized SAP S/4HANA HA cluster on RHEL where the secondary node runs non-production SAP workloads alongside HANA System Replication.

---

A cost-optimized SAP HA configuration runs a non-production SAP system (such as QA or Dev) on the secondary HANA node alongside the system replication. This reduces hardware costs while maintaining high availability for the production system.

## Architecture Overview

- **Node 1 (Primary):** Production SAP HANA (SID: PRD)
- **Node 2 (Secondary):** HANA System Replication target for PRD + Non-production HANA (SID: QAS)

During failover, the non-production HANA instance on Node 2 is stopped to free resources for the production workload.

## Prerequisites

```bash
# Both nodes must have sufficient memory
# Production HANA: e.g., 256 GB
# QAS HANA on secondary: e.g., 64 GB
# Total on secondary: 320 GB minimum

# Verify memory
free -g

# Ensure SAP HANA is installed for both SIDs on the secondary
su - prdadm -c "HDB info"
su - qasadm -c "HDB info"
```

## Setting Up HANA System Replication

On the primary node:

```bash
# Enable system replication for PRD
su - prdadm
hdbnsutil -sr_enable --name=site1
```

On the secondary node:

```bash
# Stop production HANA and register as secondary
su - prdadm
HDB stop
hdbnsutil -sr_register \
  --name=site2 \
  --remoteHost=hana01 \
  --remoteInstance=00 \
  --replicationMode=sync \
  --operationMode=logreplay
HDB start

# Start the QAS instance (runs alongside replication)
su - qasadm
HDB start
```

## Configuring Pacemaker for Cost-Optimized Setup

The key difference is adding a resource for the QAS instance that must stop on failover:

```bash
# Create the standard HANA HA resources (topology and SAPHana)
# ... (same as standard HA setup)

# Add a resource for the non-production HANA
sudo pcs resource create SAPHana_QAS SAPHana \
  SID=QAS InstanceNumber=01 \
  op start timeout=3600 \
  op stop timeout=3600 \
  op monitor interval=120 timeout=700

# Create a constraint: QAS must run on the secondary node only
sudo pcs constraint location SAPHana_QAS prefers hana02=100

# Create a constraint: QAS must stop before PRD takes over on the secondary
sudo pcs constraint order stop SAPHana_QAS then \
  promote SAPHana_PRD_00-clone
```

## Configuring the Pre-Takeover Hook

Create a hook script that stops QAS before failover:

```bash
# /usr/share/pacemaker/sap/pre_takeover_hook.sh
#!/bin/bash
# This script runs before HANA takeover
# It stops the non-production instance to free memory

LOG="/var/log/sap-takeover-hook.log"
echo "$(date) Pre-takeover: Stopping QAS instance" >> "$LOG"

su - qasadm -c "HDB stop" >> "$LOG" 2>&1

echo "$(date) QAS stopped, proceeding with takeover" >> "$LOG"
exit 0
```

```bash
sudo chmod 755 /usr/share/pacemaker/sap/pre_takeover_hook.sh
```

## Verifying the Setup

```bash
# Check cluster status
sudo pcs status

# Verify both HANA instances on the secondary
su - prdadm -c "hdbnsutil -sr_state"
su - qasadm -c "HDB info"
```

This configuration lets you use the secondary server for non-production workloads during normal operation, reducing your overall hardware investment.
