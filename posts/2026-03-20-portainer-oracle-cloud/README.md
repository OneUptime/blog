# How to Deploy Portainer on Oracle Cloud Free Tier - Part 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Oracle Cloud, Free Tier, Docker, ARM

Description: Learn how to deploy Portainer on Oracle Cloud Infrastructure's Always Free tier, including the ARM-based Ampere A1 instances that provide up to 4 vCPUs and 24GB RAM for free.

## Oracle Cloud Free Tier Resources

Oracle's Always Free tier includes:
- 2 AMD-based micro VMs (1/8 OCPU, 1GB RAM each)
- **Up to 4 Ampere A1 cores and 24GB RAM** (ARM-based, significantly more powerful)
- 200GB block storage total

The A1 Ampere instances are excellent for Portainer - 4 cores and 24GB RAM is more than most cloud free tiers offer.

## Prerequisites

- Oracle Cloud account (requires credit card for verification, not charged)
- OCI CLI configured, or use the OCI Console

## Step 1: Create an ARM A1 Compute Instance

In the OCI Console:

1. **Compute → Instances → Create Instance**
2. **Image**: Canonical Ubuntu 22.04
3. **Shape**: Change to Ampere → VM.Standard.A1.Flex
   - OCPUs: 4
   - Memory: 24GB
4. Add your SSH public key
5. Under **Networking**: ensure public IP is assigned

## Step 2: Configure Security List

OCI can use either Security Lists or Network Security Groups (NSGs) for firewall rules. This walkthrough uses the subnet's Security List:

1. **Networking → Virtual Cloud Networks → your-vcn → Security Lists → Default**
2. Add Ingress Rules:

```text
Protocol: TCP, Source: 0.0.0.0/0, Port: 22     (SSH)
Protocol: TCP, Source: 0.0.0.0/0, Port: 9443   (Portainer HTTPS)
Protocol: TCP, Source: 0.0.0.0/0, Port: 80     (HTTP)
Protocol: TCP, Source: 0.0.0.0/0, Port: 443    (HTTPS)
```

## Step 3: Configure iptables on the Instance

OCI Ubuntu images use iptables rules on the instance, so open the required ports there as well and avoid changing UFW directly:

```bash
# SSH into the instance

ssh ubuntu@<PUBLIC_IP>

# Allow required ports in iptables
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 9443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Save rules
sudo netfilter-persistent save
```

## Step 4: Install Docker and Portainer

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (ARM64 native)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# Verify the instance architecture
uname -m
# Expected: aarch64

# Install Portainer
docker volume create portainer_data

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 5: Attach Block Volume for Persistent Storage

For larger Docker deployments, use a dedicated block volume. The steps below move Docker data under `/var/lib/docker`; on fresh Docker Engine installs, image and container layers can also use `/var/lib/containerd` unless you reconfigure containerd separately:

1. **Storage → Block Volumes → Create Block Volume** (50GB, free tier)
2. **Attach** to your instance and select a device path such as `/dev/oracleoci/oraclevdb`
3. On the instance:

```bash
# Find the volume
ls /dev/oracleoci/

# Format and mount
sudo mkfs.ext4 /dev/oracleoci/oraclevdb
sudo mkdir /mnt/docker-data
echo '/dev/oracleoci/oraclevdb /mnt/docker-data ext4 defaults,_netdev,nofail 0 2' | sudo tee -a /etc/fstab
sudo mount -a

# Move Docker's /var/lib/docker data root
sudo systemctl stop docker
sudo rsync -avz /var/lib/docker/ /mnt/docker-data/
echo '{"data-root": "/mnt/docker-data"}' | sudo tee /etc/docker/daemon.json
sudo systemctl start docker
```

## What You Can Run for Free

With 4 ARM cores and 24GB RAM on OCI Free Tier:

- Portainer (management UI)
- Multiple application stacks
- Nginx Proxy Manager (reverse proxy)
- A database (PostgreSQL, MySQL)
- Monitoring stack (Prometheus + Grafana)
- A Kubernetes cluster with k3s

## Conclusion

Oracle Cloud Free Tier's A1 Ampere instances are one of the most generous Always Free compute options for running Portainer. Portainer supports ARM64, and many common Docker images publish ARM64 variants. The main friction point is OCI's two-layer firewall model (VCN security rules plus iptables on the instance) - remember to configure both.
