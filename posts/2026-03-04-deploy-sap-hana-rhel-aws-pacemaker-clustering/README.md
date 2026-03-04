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
# This is configured as a secondary private IP or an overlay route

# Tag EC2 instances for the cluster
aws ec2 create-tags --resources i-0abc123 \
  --tags Key=pacemaker-cluster,Value=hana-ha

# Create an IAM role with permissions for fencing and IP management
# Required permissions:
# ec2:DescribeInstances
# ec2:StartInstances
# ec2:StopInstances
# ec2:RebootInstances
# ec2:DescribeInstanceStatus
# ec2:AssignPrivateIpAddresses
# ec2:UnassignPrivateIpAddresses
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
  fence-agents-aws \
  resource-agents-sap-hana \
  aws-cli
```

## Configuring AWS Fencing

```bash
# Set up STONITH using the AWS fence agent
sudo pcs stonith create fence-node1 fence_aws \
  region=us-east-1 \
  plug=i-0abc123def456 \
  profile=default \
  pcmk_host_map="hana01:i-0abc123def456" \
  power_timeout=300 \
  op monitor interval=60

sudo pcs stonith create fence-node2 fence_aws \
  region=us-east-1 \
  plug=i-0def456ghi789 \
  profile=default \
  pcmk_host_map="hana02:i-0def456ghi789" \
  power_timeout=300 \
  op monitor interval=60

# Ensure each node's fence agent is constrained to the other node
sudo pcs constraint location fence-node1 avoids hana01
sudo pcs constraint location fence-node2 avoids hana02
```

## Configuring the Overlay IP Resource

```bash
# Use the aws-vpc-move-ip resource agent for the virtual IP
sudo pcs resource create hana_vip aws-vpc-move-ip \
  ip=10.0.1.200 \
  interface=eth0 \
  routing_table=rtb-0123456789abcdef \
  op monitor interval=10 timeout=30
```

## Creating HANA HA Resources

```bash
# Create the SAPHanaTopology resource
sudo pcs resource create SAPHanaTopology_HDB_00 SAPHanaTopology \
  SID=HDB InstanceNumber=00 \
  op start timeout=600 \
  op stop timeout=300 \
  op monitor interval=10 timeout=600 \
  clone clone-max=2 clone-node-max=1 interleave=true

# Create the SAPHana resource
sudo pcs resource create SAPHana_HDB_00 SAPHana \
  SID=HDB InstanceNumber=00 \
  PREFER_SITE_TAKEOVER=true \
  AUTOMATED_REGISTER=true \
  DUPLICATE_PRIMARY_TIMEOUT=7200 \
  op start timeout=3600 \
  op stop timeout=3600 \
  promotable notify=true clone-max=2 clone-node-max=1

# Colocate the VIP with the HANA primary
sudo pcs constraint colocation add hana_vip with \
  Promoted SAPHana_HDB_00-clone 4000
sudo pcs constraint order promote SAPHana_HDB_00-clone then start hana_vip
```

## Verification

```bash
sudo pcs status
sudo pcs constraint show
```
