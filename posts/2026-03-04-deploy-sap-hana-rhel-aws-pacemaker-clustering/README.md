# How to Deploy SAP HANA on RHEL in AWS with Pacemaker Clustering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP HANA, AWS, Pacemaker, High Availability, Cloud, Linux

Description: Deploy a highly available SAP HANA cluster on RHEL in AWS using Pacemaker with AWS-specific fencing and overlay IP management.

---

Running SAP HANA with high availability on RHEL in AWS requires cloud-specific adaptations for fencing (STONITH) and virtual IP management. AWS uses overlay IP addresses and EC2 API-based fencing instead of traditional methods.

## AWS Infrastructure Prerequisites

Set up the required AWS resources:

```bash
# Create an overlay IP address for the HANA virtual IP

# This is configured as a route table entry that points the overlay IP
# to the active HANA node's network interface.

# Tag EC2 instances for the cluster
aws ec2 create-tags --resources i-0abc123 \
  --tags Key=pacemaker-cluster,Value=hana-ha

# Create an IAM role with permissions for fencing and IP management
# Required permissions:
# ec2:DescribeInstances
# ec2:DescribeTags
# ec2:StartInstances
# ec2:StopInstances
# ec2:ReplaceRoute
# ec2:DescribeRouteTables
```

## Installing Cluster Packages

On both RHEL EC2 instances:

```bash
# Enable SAP and HA repositories
sudo subscription-manager repos \
  --enable rhel-9-for-x86_64-sap-solutions-rpms \
  --enable rhel-9-for-x86_64-highavailability-rpms

# Install HA and SAP packages
sudo dnf install -y pacemaker pcs \
  corosync chrony resource-agents \
  resource-agents-cloud \
  fence-agents-aws \
  resource-agents-sap-hana \
  aws-cli
```

## Configuring AWS Fencing

```bash
# Set up STONITH using the AWS fence agent
sudo pcs stonith create rsc_fence_aws fence_aws \
  pcmk_host_map="hana01:i-0abc123def456;hana02:i-0def456ghi789" \
  region=us-east-1 \
  skip_os_shutdown=true \
  pcmk_delay_max=10 \
  pcmk_reboot_timeout=600 \
  pcmk_reboot_retries=4 \
  op start interval=0 timeout=600 \
  op stop interval=0 timeout=180 \
  op monitor interval=300 timeout=60
```

## Configuring the Overlay IP Resource

```bash
# Use the aws-vpc-move-ip resource agent for the virtual IP
sudo pcs resource create hana_vip ocf:heartbeat:aws-vpc-move-ip \
  ip=10.0.1.200 \
  routing_table=rtb-0123456789abcdef \
  interface=eth0 \
  op start interval=0 timeout=180 \
  op stop interval=0 timeout=180 \
  op monitor interval=60 timeout=60
```

## Creating HANA HA Resources

```bash
# Create the SAPHanaTopology resource
sudo pcs resource create SAPHanaTopology_HDB_00 ocf:heartbeat:SAPHanaTopology \
  SID=HDB InstanceNumber=00 \
  op start interval=0 timeout=600 \
  op stop interval=0 timeout=300 \
  op monitor interval=10 timeout=600 \
  clone clone-max=2 clone-node-max=1 interleave=true

# Create the SAPHana resource
sudo pcs resource create SAPHana_HDB_00 ocf:heartbeat:SAPHana \
  SID=HDB InstanceNumber=00 \
  PREFER_SITE_TAKEOVER=true \
  AUTOMATED_REGISTER=true \
  DUPLICATE_PRIMARY_TIMEOUT=7200 \
  op start interval=0 timeout=3600 \
  op stop interval=0 timeout=3600 \
  op promote interval=0 timeout=3600 \
  op monitor interval=60 role=Promoted timeout=700 \
  op monitor interval=61 role=Unpromoted timeout=700 \
  promotable notify=true clone-max=2 clone-node-max=1 interleave=true \
  meta priority=100

# Start SAPHana after SAPHanaTopology
sudo pcs constraint order start SAPHanaTopology_HDB_00-clone then \
  SAPHana_HDB_00-clone symmetrical=false

# Colocate the VIP with the HANA primary
sudo pcs constraint colocation add hana_vip with \
  promoted SAPHana_HDB_00-clone 2000
sudo pcs constraint order promote SAPHana_HDB_00-clone then start hana_vip
```

## Verification

```bash
sudo pcs status
sudo pcs constraint show
```
