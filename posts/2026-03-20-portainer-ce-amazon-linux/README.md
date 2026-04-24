# How to Install Portainer CE on Amazon Linux with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Amazon-linux, AWS, Docker, Installation

Description: A guide to installing Portainer Community Edition on Amazon Linux 2 and Amazon Linux 2023 with Docker for AWS EC2 deployments.

## Overview

Amazon Linux is the default EC2 instance OS for many AWS users. This guide covers installing Docker and Portainer CE on both Amazon Linux 2 and Amazon Linux 2023, which are optimized for AWS environments.

## Prerequisites

- Amazon Linux 2 or Amazon Linux 2023 EC2 instance
- t3.small or larger (minimum 2GB RAM)
- Security group with inbound port 9443 open (from your IP), and port 8000 only if you plan to use Edge Agents
- SSM Session Manager or SSH access

## EC2 Security Group Configuration

Before installation, configure your EC2 security group to allow Portainer access:

```text
AWS Console → EC2 → Security Groups → Your SG → Inbound Rules

Add rules:
- Type: Custom TCP, Port: 9443, Source: Your IP/32 (or 0.0.0.0/0 for testing only)
- Type: Custom TCP, Port: 8000, Source: Your IP/32 (optional, only for Edge Agents)
```

## Step 1: Update System

```bash
# Amazon Linux 2

sudo yum update -y

# Amazon Linux 2023
sudo dnf update -y
```

## Step 2: Install Docker

### Amazon Linux 2

```bash
# Install Docker from Amazon's extras library
sudo amazon-linux-extras install docker -y

# Start and enable Docker
sudo systemctl enable --now docker

# Add ec2-user to docker group
sudo usermod -aG docker ec2-user
newgrp docker
```

### Amazon Linux 2023

```bash
# Docker is available directly in AL2023
sudo dnf install -y docker

# Start and enable Docker
sudo systemctl enable --now docker

# Add ec2-user to docker group
sudo usermod -aG docker ec2-user
newgrp docker
```

## Step 3: Verify Docker

```bash
# Verify installation
docker --version
docker run hello-world
```

## Step 4: Deploy Portainer CE

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer CE
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Verify deployment
docker ps | grep portainer
```

## Step 5: Access Portainer via EC2

```bash
# Get the EC2 public IP using IMDSv2
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_IP=$(curl -s -H "X-aws-ec2-metadata-token: ${TOKEN}" \
  http://169.254.169.254/latest/meta-data/public-ipv4)
echo "Portainer URL: https://${INSTANCE_IP}:9443"
```

Navigate to the URL in your browser and complete the initial setup.

## Optional: Use AWS Application Load Balancer

For production deployments, route traffic through an ALB:

```text
ALB Listener (HTTPS/443) → Target Group (HTTP/9000, with --http-enabled) → EC2 Instance
```

```bash
# Restart Portainer with HTTP enabled for an ALB target group on port 9000
docker stop portainer && docker rm portainer
docker run -d \
  -p 8000:8000 \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --http-enabled
```

## Monitoring Portainer with CloudWatch

Attach an IAM role with the `CloudWatchAgentServerPolicy` policy to the instance before starting the agent.

```bash
# Install CloudWatch agent
sudo yum install -y amazon-cloudwatch-agent

# Configure Portainer log forwarding to CloudWatch
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/lib/docker/containers/*/*-json.log",
            "log_group_name": "portainer",
            "log_stream_name": "{instance_id}/portainer"
          }
        ]
      }
    }
  }
}
EOF

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

## Conclusion

Installing Portainer CE on Amazon Linux is straightforward with the additional context of AWS security groups and EC2 instance metadata. The Amazon Linux 2023 package manager makes Docker installation even simpler. For production AWS deployments, pair Portainer with an Application Load Balancer for SSL termination and use CloudWatch for log aggregation.
