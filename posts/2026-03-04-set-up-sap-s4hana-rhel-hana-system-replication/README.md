# How to Set Up SAP S/4HANA on RHEL with HANA System Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP, S/4HANA, HANA System Replication, High Availability, Linux

Description: Configure SAP HANA System Replication on RHEL for S/4HANA deployments to provide high availability and disaster recovery capabilities.

---

SAP HANA System Replication (HSR) maintains a synchronized copy of your HANA database on a secondary server. Combined with Pacemaker clustering on RHEL, this provides automated failover for SAP S/4HANA environments.

## Prerequisites

Both RHEL servers must be prepared for SAP HANA (see the preparation guide) with HANA already installed. A supported fencing (STONITH) device must be configured for the Pacemaker cluster, SAP HANA automatic startup must be disabled so the cluster can manage the instances, and the HANA system replication HA/DR provider hook must be enabled before the cluster manages HANA.

```bash
# Verify HANA is installed on both nodes

su - hdbadm -c "HDB info"

# Verify RHEL SAP repositories are enabled
sudo subscription-manager repos --list-enabled | grep sap
```

## Step 1: Configure the Primary Node

On the primary HANA server:

```bash
# Switch to the HANA admin user
su - hdbadm

# Enable system replication on the primary
hdbnsutil -sr_enable --name=primary_site

# Verify replication status
hdbnsutil -sr_state
```

## Step 2: Register the Secondary Node

Stop HANA on the secondary and register it with the primary:

```bash
# On the secondary node, switch to HANA admin
su - hdbadm

# Stop HANA on the secondary
HDB stop

# Register this node as a secondary
hdbnsutil -sr_register \
  --name=secondary_site \
  --remoteHost=hana01 \
  --remoteInstance=00 \
  --replicationMode=sync \
  --operationMode=logreplay

# Start HANA on the secondary
HDB start
```

## Step 3: Verify Replication Status

```bash
# On the primary node, check replication status
su - hdbadm
python /usr/sap/HDB/HDB00/exe/python_support/systemReplicationStatus.py

# Expected output shows ACTIVE replication status
# with replication mode: SYNC
```

## Step 4: Configure Pacemaker for Automated Failover

Install the HA cluster packages:

```bash
# On both nodes
sudo dnf install -y pacemaker pcs fence-agents-all \
  sap-hana-ha

# Enable and start pcsd
sudo systemctl enable --now pcsd

# Set the hacluster password
sudo passwd hacluster
```

Configure the cluster:

```bash
# Authenticate nodes
sudo pcs host auth hana01 hana02 -u hacluster

# Create the cluster
sudo pcs cluster setup hana-ha --start hana01 hana02
sudo pcs cluster enable --all

# Configure resource defaults
sudo pcs resource defaults update resource-stickiness=1000
sudo pcs resource defaults update migration-threshold=5000
```

## Step 5: Create HANA Cluster Resources

```bash
# Configure the SAPHanaTopology resource
sudo pcs resource create rsc_SAPHanaTop_HDB_HDB00 \
  ocf:heartbeat:SAPHanaTopology \
  SID=HDB \
  InstanceNumber=00 \
  op start timeout=600 \
  op stop timeout=300 \
  op monitor interval=30 timeout=300 \
  clone cln_SAPHanaTop_HDB_HDB00

sudo pcs resource update cln_SAPHanaTop_HDB_HDB00 \
  meta clone-node-max=1 interleave=true

# Configure the SAPHanaController resource
sudo pcs resource create rsc_SAPHanaCon_HDB_HDB00 \
  ocf:heartbeat:SAPHanaController \
  SID=HDB \
  InstanceNumber=00 \
  PREFER_SITE_TAKEOVER=true \
  DUPLICATE_PRIMARY_TIMEOUT=7200 \
  AUTOMATED_REGISTER=false \
  op stop timeout=3600 \
  op monitor interval=59 role=Promoted timeout=700 \
  op monitor interval=61 role=Unpromoted timeout=700 \
  meta priority=100 \
  promotable cln_SAPHanaCon_HDB_HDB00

sudo pcs resource update cln_SAPHanaCon_HDB_HDB00 \
  meta clone-node-max=1 interleave=true

# Start topology before the HANA controller
sudo pcs constraint order cln_SAPHanaTop_HDB_HDB00 \
  then cln_SAPHanaCon_HDB_HDB00 symmetrical=false

# Configure a virtual IP for clients; replace values for your network
sudo pcs resource create rsc_vip_HDB_HDB00_primary \
  ocf:heartbeat:IPaddr2 ip=192.168.0.15 cidr_netmask=24 nic=eth0

# Keep the virtual IP on the promoted HANA site
sudo pcs constraint colocation add rsc_vip_HDB_HDB00_primary \
  with promoted cln_SAPHanaCon_HDB_HDB00 2000
```

Verify the cluster status:

```bash
sudo pcs status
```
