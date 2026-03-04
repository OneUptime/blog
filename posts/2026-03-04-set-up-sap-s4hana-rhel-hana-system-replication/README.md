# How to Set Up SAP S/4HANA on RHEL with HANA System Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP, S/4HANA, HANA System Replication, High Availability, Linux

Description: Configure SAP HANA System Replication on RHEL for S/4HANA deployments to provide high availability and disaster recovery capabilities.

---

SAP HANA System Replication (HSR) maintains a synchronized copy of your HANA database on a secondary server. Combined with Pacemaker clustering on RHEL, this provides automated failover for SAP S/4HANA environments.

## Prerequisites

Both RHEL servers must be prepared for SAP HANA (see the preparation guide) with HANA already installed.

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
  resource-agents-sap-hana

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
sudo pcs cluster setup hana-ha hana01 hana02

# Start the cluster
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Step 5: Create HANA Cluster Resources

```bash
# Configure the SAPHanaTopology resource
sudo pcs resource create SAPHanaTopology_HDB_00 SAPHanaTopology \
  SID=HDB InstanceNumber=00 \
  op start timeout=600 \
  op stop timeout=300 \
  op monitor interval=10 timeout=600 \
  clone clone-max=2 clone-node-max=1 interleave=true

# Configure the SAPHana resource
sudo pcs resource create SAPHana_HDB_00 SAPHana \
  SID=HDB InstanceNumber=00 \
  PREFER_SITE_TAKEOVER=true \
  AUTOMATED_REGISTER=true \
  DUPLICATE_PRIMARY_TIMEOUT=7200 \
  op start timeout=3600 \
  op stop timeout=3600 \
  op monitor interval=61 role=Slave timeout=700 \
  op monitor interval=59 role=Master timeout=700 \
  promotable notify=true clone-max=2 clone-node-max=1 interleave=true
```

Verify the cluster status:

```bash
sudo pcs status
```
