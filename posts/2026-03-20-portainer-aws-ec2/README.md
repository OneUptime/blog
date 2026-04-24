# How to Deploy Portainer on AWS EC2 - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, AWS, EC2, Docker, Cloud, Self-Hosted, DevOps

Description: Deploy Portainer on an AWS EC2 instance with proper security group configuration, IAM roles, and optional EBS volume for production-ready container management.

## Introduction

Running Portainer on AWS EC2 gives you a scalable container management platform in the cloud. With proper security group configuration and optional integration with AWS services like ECR, you can manage Docker containers on EC2 with the same interface you use locally. This guide covers deployment, security, and AWS-specific integrations.

## Prerequisites

- AWS account with EC2 access
- AWS CLI configured (optional but helpful)
- Basic AWS EC2 knowledge

## Step 1: Launch an EC2 Instance

### Recommended Instance

For Portainer and a small number of managed containers:
- **Instance type**: `t3.medium` (2 vCPU, 4GB RAM) minimum
- **AMI**: Ubuntu Server 24.04 LTS (64-bit)
- **Storage**: 20GB GP3 EBS volume (root) + optional 50GB data volume
- **VPC**: Use your existing VPC or create a new one

### Launch via AWS Console

1. Navigate to **EC2 > Launch Instance**
2. Select **Ubuntu Server 24.04 LTS**
3. Choose instance type `t3.medium`
4. Configure network: select your VPC and public subnet
5. Enable **Auto-assign public IP** (or use Elastic IP for production)
6. Set storage: 20GB GP3 root volume
7. Create or select a key pair

## Step 2: Configure Security Group

Create a security group named `portainer-sg`:

| Type | Protocol | Port | Source |
|------|---------|------|--------|
| SSH | TCP | 22 | Your IP |
| Custom TCP | TCP | 9000 | Your IP (or VPN range) - optional for legacy HTTP only |
| Custom TCP | TCP | 9443 | Your IP (or VPN range) |
| HTTP | TCP | 80 | 0.0.0.0/0 (if running public services) |
| HTTPS | TCP | 443 | 0.0.0.0/0 (if running public services) |

**Important**: Never open Portainer ports to `0.0.0.0/0` in production. Restrict access to your IP or VPN.

### Via AWS CLI

```bash
# Create security group

aws ec2 create-security-group \
    --group-name portainer-sg \
    --description "Portainer container management" \
    --vpc-id vpc-xxxxxxxx

# Get your public IP
MY_IP=$(curl -s https://checkip.amazonaws.com)

# Allow SSH and Portainer HTTPS from your IP only
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxx \
    --protocol tcp --port 22 --cidr ${MY_IP}/32

aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxx \
    --protocol tcp --port 9443 --cidr ${MY_IP}/32

# Optional: allow Portainer HTTP on 9000 only if you need legacy access
# aws ec2 authorize-security-group-ingress \
#     --group-id sg-xxxxxxxx \
#     --protocol tcp --port 9000 --cidr ${MY_IP}/32
```

## Step 3: Connect and Install Docker

```bash
# SSH to EC2 instance
ssh -i ~/.ssh/your-key.pem ubuntu@<ec2-public-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker from Docker's official apt repository
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

# Optional: allow the ubuntu user to run Docker without sudo
sudo usermod -aG docker ubuntu
```

Log out and back in (or run `newgrp docker`) before using `docker` without `sudo`.

## Step 4: Attach and Mount Data Volume (Optional)

For production, use a separate EBS volume for Docker data:

```bash
# Check available block devices and identify the actual EBS device path
lsblk -o NAME,SERIAL,SIZE,FSTYPE,MOUNTPOINT

# On Nitro-based instances, attached EBS volumes usually appear as /dev/nvme*n1
# Replace /dev/nvme1n1 with the correct device from the lsblk output
sudo mkfs.ext4 /dev/nvme1n1

# Mount it
sudo mkdir -p /data
sudo mount /dev/nvme1n1 /data

# Persist the mount using the filesystem UUID
UUID=$(sudo blkid -s UUID -o value /dev/nvme1n1)
echo "UUID=${UUID} /data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab

# Point Docker to the new volume
sudo mkdir -p /data/docker
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "data-root": "/data/docker",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker
```

## Step 5: Deploy Portainer

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer
docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

Add `-p 9000:9000` only if you need legacy HTTP access.

## Step 6: Configure Systems Manager

For more secure access without keeping SSH open to the internet:

```bash
# In most cases, AWS-provided Ubuntu AMIs already include SSM Agent
sudo snap list amazon-ssm-agent >/dev/null 2>&1 || sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent
sudo snap services amazon-ssm-agent

# Attach IAM role with AmazonSSMManagedInstanceCore policy to EC2
```

## Step 7: Integrate with Amazon ECR

In Portainer, add your ECR registry:

1. Navigate to **Registries > Add registry**
2. Select **AWS ECR**
3. URL: `<account-id>.dkr.ecr.<region>.amazonaws.com`
4. Enter the AWS region plus an access key ID and secret access key for an IAM user that can access the registry
5. For full registry management in Portainer, the recommended AWS policy is `AmazonEC2ContainerRegistryFullAccess`

## Step 8: Assign an Elastic IP

For production, assign an Elastic IP so the public address does not change after a stop/start cycle:

```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Associate with EC2 instance
aws ec2 associate-address \
    --instance-id i-xxxxxxxxxxxxxxxxx \
    --allocation-id eipalloc-xxxxxxxxxxxxxxxxx
```

## Conclusion

Portainer on AWS EC2 provides a familiar container management interface for cloud-based workloads. By restricting security group access to specific IPs and using EBS volumes for data persistence, you create a secure and reliable setup. The AWS ECR integration allows you to deploy private container images directly from the Portainer UI.
