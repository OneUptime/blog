# How to Deploy RHEL on Alibaba Cloud ECS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Alibaba Cloud, ECS, Cloud, Linux

Description: Deploy and configure RHEL on Alibaba Cloud Elastic Compute Service (ECS) with proper security, storage, and monitoring setup.

---

Alibaba Cloud ECS supports RHEL as a paid public image. This guide covers launching and configuring a RHEL ECS instance with proper security groups, cloud disk storage, and CloudMonitor integration.

## Step 1: Create an ECS Instance

```bash
# Using Alibaba Cloud CLI

aliyun ecs RunInstances \
  --RegionId us-east-1 \
  --ImageId <rhel-9-image-id> \
  --InstanceType ecs.g7.large \
  --SecurityGroupId sg-xxxxx \
  --VSwitchId vsw-xxxxx \
  --InstanceName rhel9-server \
  --SystemDisk.Category cloud_essd \
  --SystemDisk.Size 50 \
  --InternetMaxBandwidthOut 5 \
  --KeyPairName my-keypair
```

## Step 2: Configure the Instance

```bash
# SSH into the instance
ssh root@<public-ip>

# Update the system
dnf update -y

# Configure the hostname
hostnamectl set-hostname rhel9-alibaba.example.com

# Enable and configure firewalld
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

## Step 3: Attach Cloud Disks

```bash
# Create and attach a data disk
aliyun ecs CreateDisk \
  --RegionId us-east-1 \
  --ZoneId us-east-1a \
  --DiskCategory cloud_essd \
  --Size 200

# Use the DiskId returned by CreateDisk
aliyun ecs AttachDisk \
  --RegionId us-east-1 \
  --InstanceId i-xxxxx \
  --DiskId d-xxxxx

# On the instance, partition and format
sudo parted /dev/vdb mklabel gpt
sudo parted -a optimal /dev/vdb mkpart primary xfs 0% 100%
sudo mkfs.xfs /dev/vdb1
sudo mkdir -p /data
echo '/dev/vdb1 /data xfs defaults 0 0' | sudo tee -a /etc/fstab
sudo mount -a
```

## Step 4: Install CloudMonitor Agent

```bash
# Install the Alibaba Cloud CloudMonitor agent
# Run from a machine with Alibaba Cloud CLI credentials
aliyun cms InstallMonitoringAgent \
  --RegionId us-east-1 \
  --InstanceIds '["i-xxxxx"]' \
  --Force true

# Verify the agent is running on the instance
ps aux | grep argusagent | grep -v grep
```

## Step 5: Configure Security Best Practices

```bash
# Harden SSH
printf 'PermitRootLogin no\nPasswordAuthentication no\n' | sudo tee /etc/ssh/sshd_config.d/99-hardening.conf
sudo sshd -t
sudo systemctl restart sshd

# Enable automatic updates
sudo dnf install -y dnf-automatic
sudo sed -i 's/apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf
sudo systemctl enable --now dnf-automatic-install.timer
```

## Conclusion

RHEL on Alibaba Cloud ECS provides a familiar Linux environment with integration into Alibaba Cloud services. CloudMonitor gives you visibility into instance performance, while ESSD cloud disks provide high-performance storage. For enterprise deployments, take advantage of Alibaba Cloud's VPC, security groups, and RAM (Resource Access Management) for access control.
