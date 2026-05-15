# How to Install SAP NetWeaver on RHEL with High Availability (ENSA2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP, NetWeaver, ENSA2, High Availability, Pacemaker, Linux

Description: Configure SAP NetWeaver with ENSA2 (Enqueue Server 2) and Pacemaker on RHEL for a highly available ASCS and ERS cluster setup.

---

ENSA2 (Enqueue Server Replication 2) is the modern high availability architecture for the SAP ASCS (ABAP SAP Central Services) instance. On RHEL, Pacemaker manages the ASCS and ERS (Enqueue Replication Server) for automatic failover.

## Prerequisites

Prepare two RHEL nodes for SAP:

```bash
# Install SAP preparation roles on both nodes

sudo dnf install -y ansible-core rhel-system-roles-sap rhel-system-roles

# Run the SAP NetWeaver preparation role
# (via Ansible playbook - see SAP preparation guide)

# Install HA packages on both nodes
sudo dnf install -y pacemaker pcs fence-agents-all resource-agents-sap
```

## Setting Up Shared Filesystems

SAP HA setups require shared filesystems for SAP directories:

```bash
# Mount NFS shares for SAP (on both nodes)
# /etc/fstab entries
sudo mkdir -p /sapmnt /usr/sap/trans
cat >> /etc/fstab << 'NFS'
nfs-server:/sapmnt         /sapmnt         nfs4  defaults  0 0
nfs-server:/usr/sap/trans  /usr/sap/trans  nfs4  defaults  0 0
NFS

sudo systemctl daemon-reload
sudo mount -a
```

## Installing SAP ASCS and ERS

Run the SAP installer (SWPM) on each node:

```bash
# On Node 1: Install ASCS instance
# Run SWPM with the ASCS installation option
# Instance number: 00
# Hostname: sap-ascs (virtual hostname)

# On Node 2: Install ERS instance
# Run SWPM with the ERS installation option
# Instance number: 10
# Hostname: sap-ers (virtual hostname)
```

## Configuring the Pacemaker Cluster

Set up the cluster:

```bash
# On both nodes: set hacluster password
sudo passwd hacluster

# On both nodes: enable the pcs daemon
sudo systemctl enable --now pcsd.service

# Authenticate nodes
sudo pcs host auth node1 node2 -u hacluster

# Create the cluster
sudo pcs cluster setup sap-nw-ha --start node1 node2
sudo pcs cluster enable --all

# Configure and test fencing/STONITH before adding production resources
# (choose the fence agent and parameters for your platform)
```

## Creating SAP Cluster Resources

```bash
# Create the ASCS resource group
sudo pcs resource create ascs_fs Filesystem \
  device="nfs-server:/usr/sap/NW1/ASCS00" \
  directory="/usr/sap/NW1/ASCS00" \
  fstype=nfs \
  force_unmount=safe \
  --group g-ascs \
  op start interval=0 timeout=60 \
  op stop interval=0 timeout=120 \
  op monitor interval=200 timeout=40

sudo pcs resource create ascs_ip IPaddr2 \
  ip=10.0.1.100 cidr_netmask=24 \
  --group g-ascs

sudo pcs resource create ascs_inst SAPInstance \
  InstanceName="NW1_ASCS00_sap-ascs" \
  START_PROFILE="/sapmnt/NW1/profile/NW1_ASCS00_sap-ascs" \
  AUTOMATIC_RECOVER=false \
  meta resource-stickiness=5000 \
  --group g-ascs \
  op monitor interval=20 on-fail=restart timeout=60 \
  op start interval=0 timeout=600 \
  op stop interval=0 timeout=600

sudo pcs resource meta g-ascs resource-stickiness=3000

# Create the ERS resource group
sudo pcs resource create ers_fs Filesystem \
  device="nfs-server:/usr/sap/NW1/ERS10" \
  directory="/usr/sap/NW1/ERS10" \
  fstype=nfs \
  force_unmount=safe \
  --group g-ers \
  op start interval=0 timeout=60 \
  op stop interval=0 timeout=120 \
  op monitor interval=200 timeout=40

sudo pcs resource create ers_ip IPaddr2 \
  ip=10.0.1.101 cidr_netmask=24 \
  --group g-ers

sudo pcs resource create ers_inst SAPInstance \
  InstanceName="NW1_ERS10_sap-ers" \
  START_PROFILE="/sapmnt/NW1/profile/NW1_ERS10_sap-ers" \
  AUTOMATIC_RECOVER=false \
  IS_ERS=true \
  --group g-ers \
  op monitor interval=20 on-fail=restart timeout=60 \
  op start interval=0 timeout=600 \
  op stop interval=0 timeout=600

# Colocation: ASCS and ERS should prefer different nodes
sudo pcs constraint colocation add g-ers with g-ascs -5000

# Order: After ASCS failover, ERS follows to the other node
sudo pcs constraint order start g-ascs then stop g-ers symmetrical=false kind=Optional
```

Verify the cluster:

```bash
sudo pcs status
```
