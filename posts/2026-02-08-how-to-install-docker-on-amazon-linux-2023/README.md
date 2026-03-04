# How to Install Docker on Amazon Linux 2023

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Amazon Linux, AWS, Installation, DevOps, Containers, Cloud, EC2

Description: A practical guide to installing Docker Engine on Amazon Linux 2023, with steps tailored for EC2 instances and AWS-specific considerations.

---

Amazon Linux 2023 (AL2023) is the latest generation of Amazon's Linux distribution, designed specifically for AWS workloads. It is based on Fedora and uses `dnf` as its package manager. While AWS encourages ECS and Fargate for container orchestration, plenty of use cases call for running Docker directly on an EC2 instance. This guide covers everything you need to get Docker running on AL2023.

## Prerequisites

- An Amazon Linux 2023 EC2 instance (or local VM)
- SSH access with a user that has `sudo` privileges (the default `ec2-user` works)
- A security group that allows outbound HTTPS traffic (for pulling images)

## Step 1: Update the System

Start with a full system update.

```bash
# Update all packages to the latest versions
sudo dnf update -y
```

AL2023 is a versioned distribution with deterministic updates, but it is still good practice to start fresh.

## Step 2: Install Docker

Docker is available in the default AL2023 package repository. No need to add external repos.

```bash
# Install Docker from the AL2023 default repository
sudo dnf install -y docker
```

This installs the Docker Engine, CLI, and containerd. The version may be slightly behind Docker's official releases because Amazon packages and tests it for compatibility.

## Step 3: Start and Enable Docker

Start the Docker service and enable it at boot.

```bash
# Start the Docker daemon
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker
```

Verify the service is running.

```bash
# Check Docker service status
sudo systemctl status docker
```

You should see `active (running)` in the output.

## Step 4: Add Your User to the Docker Group

The default `ec2-user` does not have Docker permissions. Fix that by adding it to the `docker` group.

```bash
# Add ec2-user (or your current user) to the docker group
sudo usermod -aG docker $USER
```

You need to start a new shell session for this to take effect. Either log out and SSH back in, or run:

```bash
# Apply the group change in the current session
newgrp docker
```

Verify by running Docker without sudo.

```bash
# Test Docker access without sudo
docker info
```

## Step 5: Verify the Installation

Run the hello-world container.

```bash
# Test Docker with hello-world
docker run hello-world
```

If you see the greeting message, Docker is working.

## Step 6: Install Docker Compose

AL2023 does not include Docker Compose by default. Install it as a plugin.

```bash
# Create the CLI plugins directory
mkdir -p ~/.docker/cli-plugins

# Download the Docker Compose plugin
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o ~/.docker/cli-plugins/docker-compose

# Make it executable
chmod +x ~/.docker/cli-plugins/docker-compose

# Verify installation
docker compose version
```

This gives you `docker compose` as a subcommand of the Docker CLI.

## Configuring Docker for Production on EC2

When running Docker in production on AWS, several configuration options improve reliability and observability.

### Log Driver Configuration

Ship container logs to CloudWatch instead of storing them on disk.

```bash
# Configure Docker to use the awslogs driver by default
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "awslogs",
  "log-opts": {
    "awslogs-region": "us-east-1",
    "awslogs-group": "/docker/containers",
    "awslogs-create-group": "true"
  }
}
EOF

# Restart Docker
sudo systemctl restart docker
```

Make sure your EC2 instance's IAM role has permissions to write to CloudWatch Logs. The required policy actions are `logs:CreateLogGroup`, `logs:CreateLogStream`, and `logs:PutLogEvents`.

If you prefer local logging with rotation, use this configuration instead.

```bash
# Configure local JSON logging with rotation
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  },
  "storage-driver": "overlay2"
}
EOF

sudo systemctl restart docker
```

### Storage Considerations

EC2 instances often use EBS volumes. For Docker workloads, consider attaching a dedicated EBS volume for `/var/lib/docker` to isolate container data from the root volume.

```bash
# Format and mount a dedicated EBS volume for Docker data
# Assuming the volume is attached as /dev/xvdf
sudo mkfs.xfs /dev/xvdf
sudo mkdir -p /var/lib/docker
sudo mount /dev/xvdf /var/lib/docker

# Add to /etc/fstab for persistence across reboots
echo "/dev/xvdf /var/lib/docker xfs defaults 0 0" | sudo tee -a /etc/fstab
```

If Docker was already running with data on the root volume, stop Docker first, copy the data, then mount the new volume.

```bash
# Stop Docker before moving its data directory
sudo systemctl stop docker

# Copy existing Docker data to the new volume
sudo rsync -aP /var/lib/docker/ /mnt/new-volume/docker/
sudo mount /dev/xvdf /var/lib/docker

# Start Docker again
sudo systemctl start docker
```

## Networking on EC2

### Security Groups

Docker exposes container ports on the host. Your EC2 security group must allow inbound traffic on those ports.

For example, if you run `docker run -p 8080:80 nginx`, your security group needs to allow inbound TCP traffic on port 8080.

### Using AWS VPC DNS

Containers on AL2023 typically inherit the host's DNS settings, which point to the VPC DNS resolver (the `.2` address of your VPC CIDR). This usually works without any extra configuration. If containers have DNS issues, explicitly set DNS in the daemon config.

```bash
# Set DNS servers for containers
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "dns": ["169.254.169.253"]
}
EOF

sudo systemctl restart docker
```

The `169.254.169.253` address is the Amazon DNS server available in all VPCs.

## Working with ECR (Elastic Container Registry)

If you use AWS ECR to store your container images, authenticate Docker with ECR.

```bash
# Log in to your ECR registry
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

Replace `123456789012` with your AWS account ID. The authentication token is valid for 12 hours.

Pull an image from ECR.

```bash
# Pull an image from your ECR repository
docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

For automated environments, use the Amazon ECR credential helper to avoid manual login.

```bash
# Install the ECR credential helper
sudo dnf install -y amazon-ecr-credential-helper

# Configure Docker to use the helper
mkdir -p ~/.docker
cat <<'EOF' > ~/.docker/config.json
{
  "credHelpers": {
    "123456789012.dkr.ecr.us-east-1.amazonaws.com": "ecr-login"
  }
}
EOF
```

## Troubleshooting

### Docker version is older than expected

AL2023 packages Docker independently from Docker Inc. The version in the AL2023 repo may lag behind. If you need the latest version, you can install from Docker's official repository.

```bash
# Add Docker's official CentOS/Fedora repository
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker CE (may conflict with the AL2023 package)
sudo dnf install -y --allowerasing docker-ce docker-ce-cli containerd.io
```

### Instance cannot pull images

Check that the security group allows outbound HTTPS (port 443). Also verify the instance has a route to the internet (either a public IP with an internet gateway, or a NAT gateway for private subnets).

### Docker uses too much disk space

EBS volumes on EC2 can be small by default. Monitor and clean up regularly.

```bash
# Check Docker disk usage
docker system df

# Remove unused images, containers, and networks
docker system prune -af
```

## Summary

Amazon Linux 2023 makes Docker installation simple with a single `dnf install` command. The real value comes from integrating Docker with AWS services: CloudWatch for logging, ECR for image storage, EBS for persistent storage, and IAM for access control. Whether you are running a single container on a small instance or orchestrating dozens of services, this combination gives you a solid, AWS-native Docker environment.
