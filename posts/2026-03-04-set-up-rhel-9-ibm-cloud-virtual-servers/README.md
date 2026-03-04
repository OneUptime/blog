# How to Set Up RHEL for IBM Cloud Virtual Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IBM Cloud, Virtual Servers, Cloud, Linux

Description: Deploy and configure RHEL on IBM Cloud Virtual Servers for VPC with networking, storage, and monitoring integration.

---

IBM Cloud provides RHEL as a stock image for Virtual Servers for VPC (Virtual Private Cloud). This guide covers deploying and configuring RHEL instances on IBM Cloud with proper security and monitoring.

## Step 1: Create a Virtual Server Instance

```bash
# Using IBM Cloud CLI
ibmcloud login

# Create a VPC (if not existing)
ibmcloud is vpc-create rhel9-vpc

# Create a subnet
ibmcloud is subnet-create rhel9-subnet rhel9-vpc \
  --zone us-south-1 \
  --ipv4-cidr-block 10.240.0.0/24

# Find the RHEL image
ibmcloud is images --visibility public | grep -i "red-hat.*9"

# Create the instance
ibmcloud is instance-create rhel9-server \
  rhel9-vpc \
  us-south-1 \
  bx2-4x16 \
  rhel9-subnet \
  --image-id $RHEL9_IMAGE_ID \
  --keys $SSH_KEY_ID
```

## Step 2: Configure the Instance

```bash
# SSH into the instance using the floating IP
ssh root@<floating-ip>

# Update the system
dnf update -y

# Set the hostname
hostnamectl set-hostname rhel9-server.example.com

# Configure firewall
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

## Step 3: Attach and Configure Block Storage

```bash
# Create a block storage volume
ibmcloud is volume-create rhel9-data \
  general-purpose \
  us-south-1 \
  --capacity 500

# Attach to the instance
ibmcloud is instance-volume-attachment-add \
  rhel9-server \
  rhel9-data \
  --auto-delete true

# On the instance, format and mount
sudo mkfs.xfs /dev/vdd
sudo mkdir -p /data
echo '/dev/vdd /data xfs defaults 0 0' | sudo tee -a /etc/fstab
sudo mount -a
```

## Step 4: Set Up IBM Cloud Monitoring

```bash
# Install the monitoring agent (Sysdig)
curl -sL https://ibm.biz/install-sysdig-agent | sudo bash -s -- \
  --access_key YOUR_ACCESS_KEY \
  --collector ingest.us-south.monitoring.cloud.ibm.com \
  --collector_port 6443 \
  --tags "os:rhel9,env:production"
```

## Step 5: Configure Security Groups

```bash
# Add security group rules
ibmcloud is security-group-rule-add $SG_ID inbound tcp \
  --port-min 443 --port-max 443 --remote 0.0.0.0/0

ibmcloud is security-group-rule-add $SG_ID inbound tcp \
  --port-min 22 --port-max 22 --remote 10.0.0.0/8
```

## Conclusion

RHEL on IBM Cloud Virtual Servers for VPC integrates with IBM Cloud's networking, storage, and monitoring services. The VPC architecture provides network isolation, and block storage volumes give you flexible, high-performance storage. Use IBM Cloud Monitoring (powered by Sysdig) for comprehensive observability of your RHEL workloads.
