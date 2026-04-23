# How to Install RKE2 on Amazon Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Amazon Linux, AWS, Installation, Rancher

Description: A step-by-step guide to installing RKE2 on Amazon Linux 2 and Amazon Linux 2023 for a production-ready Kubernetes cluster on AWS.

Amazon Linux is AWS's own Linux distribution optimized for running on EC2 instances. While AWS provides managed Kubernetes through EKS, many organizations prefer running RKE2 on Amazon Linux for full control over their Kubernetes configuration, especially when integrating with Rancher for multi-cluster management. This guide covers installing RKE2 on both Amazon Linux 2 and Amazon Linux 2023.

## Prerequisites

- Amazon Linux 2 or Amazon Linux 2023 EC2 instances
- Instance type: m5.xlarge or larger recommended (minimum t3.medium)
- IAM role with EC2 instance profile if using AWS integrations
- Security groups allowing required ports
- SSH access to instances

## Step 1: Configure AWS Security Groups

Before configuring the OS, ensure your EC2 security groups allow the required traffic:

```text
Control Plane Security Group:
- TCP 6443 (Kubernetes API) - from all RKE2 nodes and your IP
- TCP 9345 (RKE2 supervisor/registration) - from all RKE2 nodes
- TCP 2379-2381 (etcd client, peer, and metrics) - between control plane nodes only
- TCP 10250 (Kubelet metrics) - from all RKE2 nodes
- TCP 30000-32767 (NodePort services) - from nodes or clients that need NodePort access
- TCP 9099 (Canal health checks) - between all nodes
- UDP 8472 (Canal VXLAN) - between all nodes
- UDP 51820/51821 (Canal WireGuard IPv4/IPv6, if enabled) - between all nodes

Worker Node Security Group:
- TCP 10250 (Kubelet metrics) - from all RKE2 nodes
- TCP 30000-32767 (NodePort services) - from nodes or clients that need NodePort access
- TCP 9099 (Canal health checks) - between all nodes
- UDP 8472 (Canal VXLAN) - between all nodes
- UDP 51820/51821 (Canal WireGuard IPv4/IPv6, if enabled) - between all nodes
```

## Step 2: Prepare Amazon Linux 2

```bash
# Update all packages

sudo yum update -y

# Install required packages
sudo yum install -y \
  curl \
  wget \
  git \
  conntrack-tools \
  socat \
  nfs-utils \
  iptables

# Disable swap (Amazon Linux typically has no swap by default)
sudo swapoff -a

# Verify
free -h

# Load kernel modules
sudo modprobe overlay
sudo modprobe br_netfilter

cat <<EOF | sudo tee /etc/modules-load.d/rke2.conf
overlay
br_netfilter
EOF

# Configure networking sysctl settings
cat <<EOF | sudo tee /etc/sysctl.d/99-rke2.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

## Step 3: Prepare Amazon Linux 2023

```bash
# Amazon Linux 2023 uses dnf instead of yum
sudo dnf update -y

# Install required packages
sudo dnf install -y \
  curl \
  wget \
  conntrack-tools \
  socat \
  nfs-utils \
  iptables \
  iptables-nft

# AL2023 - disable swap if enabled
sudo swapoff -a

# Load kernel modules (same as AL2)
sudo modprobe overlay
sudo modprobe br_netfilter

cat <<EOF | sudo tee /etc/modules-load.d/rke2.conf
overlay
br_netfilter
EOF

# Configure sysctl
cat <<EOF | sudo tee /etc/sysctl.d/99-rke2.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

## Step 4: Install RKE2

```bash
# Install RKE2 (works on both AL2 and AL2023)
curl -sfL https://get.rke2.io | sudo sh -

# For a specific version:
# curl -sfL https://get.rke2.io | sudo INSTALL_RKE2_VERSION=v1.34.6+rke2r3 sh -

# Verify installation
rke2 --version
```

## Step 5: Configure RKE2 for AWS

```bash
# Create RKE2 configuration with AWS-specific settings
sudo mkdir -p /etc/rancher/rke2/

# Get the AWS instance metadata
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

PRIVATE_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/local-ipv4)

PUBLIC_IP=$(curl -fs -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)

PUBLIC_HOSTNAME=$(curl -fs -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-hostname 2>/dev/null || true)

# Create the RKE2 config
{
  echo "# TLS SANs for the API server"
  echo "tls-san:"
  echo "  - \"${PRIVATE_IP}\""
  if [ -n "$PUBLIC_IP" ]; then
    echo "  - \"${PUBLIC_IP}\""
  fi
  if [ -n "$PUBLIC_HOSTNAME" ]; then
    echo "  - \"${PUBLIC_HOSTNAME}\""
  fi
  cat <<EOF

# Node configuration
node-ip: "${PRIVATE_IP}"

# Enable cloud provider if using AWS Load Balancers
# cloud-provider-name: aws

# Kubeconfig permissions
write-kubeconfig-mode: "0644"
EOF
} | sudo tee /etc/rancher/rke2/config.yaml

echo "Config created for IP: $PRIVATE_IP"
```

## Step 6: Start RKE2 Server

```bash
# Enable and start RKE2
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service

# Monitor startup
sudo journalctl -u rke2-server -f &

# Wait for startup to complete
sleep 60

# Configure kubectl
mkdir -p ~/.kube
sudo cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

echo 'export PATH=$PATH:/var/lib/rancher/rke2/bin' >> ~/.bashrc
source ~/.bashrc

kubectl get nodes
```

## Step 7: Configure Auto Scaling Group Workers (Optional)

```bash
# For ASG-based worker nodes, create a launch template script
cat > user-data.sh << 'USERDATA'
#!/bin/bash
# Install RKE2 agent on new EC2 instances

# Install RKE2 agent
curl -sfL https://get.rke2.io | INSTALL_RKE2_TYPE="agent" sh -

# Get token from AWS SSM Parameter Store
SERVER_TOKEN=$(aws ssm get-parameter \
  --name "/rke2/node-token" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text)

SERVER_IP=$(aws ssm get-parameter \
  --name "/rke2/server-ip" \
  --query "Parameter.Value" \
  --output text)

# Configure agent
mkdir -p /etc/rancher/rke2/
cat > /etc/rancher/rke2/config.yaml << EOF
server: https://${SERVER_IP}:9345
token: ${SERVER_TOKEN}
EOF

# Start agent
systemctl enable rke2-agent.service
systemctl start rke2-agent.service
USERDATA

echo "User data script created for auto-scaling group workers"
```

## Conclusion

Installing RKE2 on Amazon Linux provides a great alternative to EKS for organizations wanting full Kubernetes control on AWS infrastructure. Amazon Linux's tight AWS integration, regular security updates, and optimization for EC2 make it an excellent node OS choice. When combined with Rancher for management, you get a powerful multi-cluster Kubernetes platform. Consider using AWS SSM Parameter Store for storing the RKE2 node token securely when automating node provisioning.
