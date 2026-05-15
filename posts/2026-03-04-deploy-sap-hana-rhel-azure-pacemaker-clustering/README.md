# How to Deploy SAP HANA on RHEL in Azure with Pacemaker Clustering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP HANA, Azure, Pacemaker, High Availability, Cloud, Linux

Description: Deploy a highly available SAP HANA cluster on RHEL in Azure using Pacemaker with Azure-specific fencing agents and load balancer integration.

---

SAP HANA high availability on RHEL in Azure uses Pacemaker with Azure-specific fence agents and an Azure Load Balancer for virtual IP management. This setup provides automated failover with cloud-native integration.

## Azure Infrastructure

Required Azure resources:
- Two VMs in an availability set or across availability zones
- An Azure Load Balancer (Standard SKU) with a health probe
- A managed identity or service principal for fencing

## Installing Cluster Components

On both RHEL VMs:

```bash
# Enable required repositories

sudo subscription-manager repos \
  --enable rhel-9-for-x86_64-sap-solutions-rpms \
  --enable rhel-9-for-x86_64-highavailability-rpms

# Install packages
sudo dnf install -y pacemaker pcs \
  fence-agents-azure-arm \
  resource-agents-cloud \
  resource-agents-sap-hana
```

## Configuring Azure Fencing

```bash
# Prepare pcsd and authenticate the nodes
sudo systemctl enable --now pcsd.service
sudo passwd hacluster
sudo pcs host auth hana01 hana02 -u hacluster

# Create the cluster
sudo pcs cluster setup hana-ha hana01 hana02
sudo pcs cluster start --all
sudo pcs cluster enable --all

# Configure Azure fence agent using managed identity
sudo pcs stonith create fence-node1 fence_azure_arm \
  msi=true \
  resourceGroup="sap-rg" \
  subscriptionId="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  pcmk_host_map="hana01:hana01;hana02:hana02" \
  power_timeout=240 \
  pcmk_reboot_timeout=900 \
  pcmk_monitor_timeout=120 \
  pcmk_monitor_retries=4 \
  pcmk_action_limit=3 \
  meta failure-timeout=120s \
  op monitor interval=3600

# Set fence topology
sudo pcs property set stonith-enabled=true
sudo pcs property set stonith-timeout=900
```

## Configuring the Azure Load Balancer Resource

Azure does not support floating IPs directly. Use a load balancer with a health probe:

```bash
# Create the health probe resource
# The load balancer checks port 62503 to determine which node is active
sudo pcs resource create hana_healthcheck azure-lb \
  port=62503 \
  op monitor interval=10 timeout=20

# Create the virtual IP resource
sudo pcs resource create hana_vip IPaddr2 \
  ip=10.0.1.200 \
  cidr_netmask=24 \
  op monitor interval=10 timeout=20

# Group the health check and VIP together
sudo pcs resource group add g-hana-vip hana_healthcheck hana_vip
```

## Creating HANA HA Resources

```bash
# SAPHanaTopology clone
sudo pcs resource create SAPHanaTopology_HDB_00 SAPHanaTopology \
  SID=HDB InstanceNumber=00 \
  op start timeout=600 \
  op stop timeout=300 \
  op monitor interval=10 timeout=600 \
  clone clone-max=2 clone-node-max=1 interleave=true

# SAPHana promotable clone
sudo pcs resource create SAPHana_HDB_00 SAPHana \
  SID=HDB InstanceNumber=00 \
  PREFER_SITE_TAKEOVER=true \
  AUTOMATED_REGISTER=false \
  DUPLICATE_PRIMARY_TIMEOUT=7200 \
  op start timeout=3600 \
  op stop timeout=3600 \
  op monitor interval=61 role="Secondary" timeout=700 \
  op monitor interval=59 role="Primary" timeout=700 \
  op promote timeout=3600 \
  op demote timeout=3600 \
  promotable notify=true clone-max=2 clone-node-max=1

# Constraints
sudo pcs constraint colocation add g-hana-vip with \
  master SAPHana_HDB_00-clone 4000
sudo pcs constraint order SAPHanaTopology_HDB_00-clone then \
  SAPHana_HDB_00-clone symmetrical=false
```

## Testing Failover

```bash
# Check cluster status
sudo pcs status

# Simulate a failover by stopping HANA on the primary
su - hdbadm -c "HDB stop"

# Monitor the cluster reaction
watch sudo pcs status
```
