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

Limit memory for the shared secondary host:

```ini
# /hana/shared/PRD/global/hdb/custom/config/global.ini
[memorymanager]
global_allocation_limit = <size_in_mb_for_prd_secondary>

[system_replication]
preload_column_tables = false

# /hana/shared/QAS/global/hdb/custom/config/global.ini
[memorymanager]
global_allocation_limit = <size_in_mb_for_qas>
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

# Add a resource for the non-production HANA instance
sudo pcs resource create SAPInstance_QAS_HDB01 SAPInstance \
  InstanceName=QAS_HDB01_hana02 \
  START_PROFILE=/usr/sap/QAS/SYS/profile/QAS_HDB01_hana02 \
  MONITOR_SERVICES="hdbindexserver|hdbnameserver" \
  op start timeout=3600 \
  op stop timeout=3600 \
  op monitor interval=120 timeout=700

# Create constraints: QAS must run on the secondary node only
sudo pcs constraint location SAPInstance_QAS_HDB01 prefers hana02=INFINITY
sudo pcs constraint location SAPInstance_QAS_HDB01 avoids hana01=INFINITY

# Create constraints: QAS must stop before PRD takes over on the secondary
sudo pcs constraint colocation add SAPInstance_QAS_HDB01 with \
  promoted SAPHana_PRD_00-clone -INFINITY
sudo pcs constraint order stop SAPInstance_QAS_HDB01 then \
  promote SAPHana_PRD_00-clone
```

## Configuring Cost-Optimized HANA Parameters

Do not rely on an unmanaged Pacemaker hook script for the takeover path. The Pacemaker ordering and anti-colocation constraints stop QAS before the production HANA resource is promoted on the secondary node.

```bash
# Verify that the production secondary is configured for reduced memory use
su - prdadm -c "grep -E 'global_allocation_limit|preload_column_tables' \
  /hana/shared/PRD/global/hdb/custom/config/global.ini"

# Verify that QAS has a memory cap on the shared host
su - qasadm -c "grep global_allocation_limit \
  /hana/shared/QAS/global/hdb/custom/config/global.ini"
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
