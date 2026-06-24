# How to Install Rancher on openSUSE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, openSUSE, Docker, Kubernetes, Installation

Description: A step-by-step guide to installing Rancher on openSUSE Leap using Docker, including zypper package management and system configuration.

openSUSE is the community distribution from SUSE and has a natural affinity with Rancher since SUSE acquired Rancher Labs. openSUSE Leap provides a stable, enterprise-aligned distribution that shares its codebase with SUSE Linux Enterprise Server. This guide covers installing Rancher on openSUSE Leap 15.5 or later using Docker for testing and development. For production use, Rancher recommends installing on a high-availability Kubernetes cluster instead of a single Docker container.

## Prerequisites

Before you begin, ensure you have:

- A server running openSUSE Leap 15.5 or later with at least 4 GB RAM and 2 CPU cores
- Root or sudo access
- A static IP address or DNS name
- Internet access for downloading packages

## Step 1: Update the System

Update all packages using zypper:

```bash
sudo zypper refresh
sudo zypper update -y
```

## Step 2: Review Swap Settings

For a single-node Rancher Docker install, Rancher does not require swap to be disabled. If you later use this host as a Kubernetes node, follow that Kubernetes distribution's swap requirements.

## Step 3: Install Required Dependencies

```bash
sudo zypper install -y \
  curl \
  wget \
  tar \
  gzip \
  iptables
```

## Step 4: Install Docker

openSUSE provides Docker in its official repositories, and Rancher only needs the Docker Engine package for this install:

```bash
sudo zypper install -y docker
```

Enable and start Docker:

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

Add your user to the Docker group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Verify Docker:

```bash
docker --version
docker run hello-world
```

## Step 5: Configure the Firewall

openSUSE uses `firewalld` by default. Open the published Rancher ports:

```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

Verify the rules:

```bash
sudo firewall-cmd --list-all
```

## Step 6: Review Kernel Settings

A single-node Rancher Docker install does not require extra `br_netfilter`, `overlay`, or Kubernetes-specific sysctl tuning on the host. If you later run K3s or RKE2 on this machine, configure those kernel modules and sysctl settings according to that distribution's documentation.

## Step 7: Review AppArmor

openSUSE uses AppArmor by default. Rancher does not require AppArmor to be disabled or set to complain mode, but you can check its status:

```bash
sudo systemctl status apparmor
sudo aa-status
```

## Step 8: Configure Docker Logging

```bash
sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

## Step 9: Create Persistent Storage

```bash
sudo mkdir -p /opt/rancher
```

## Step 10: Run Rancher

Deploy Rancher using Docker:

```bash
docker run -d \
  --name rancher \
  --restart=unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v /opt/rancher:/var/lib/rancher \
  --privileged \
  rancher/rancher:latest
```

## Step 11: Get the Bootstrap Password

Wait about a minute, then:

```bash
docker logs rancher 2>&1 | grep "Bootstrap Password:"
```

## Step 12: Access the Rancher UI

Navigate to `https://<your-server-ip>` in your browser. Accept the self-signed certificate warning and enter the bootstrap password.

Complete the setup:

1. Set a new admin password
2. Configure the Rancher server URL
3. Accept the terms and conditions

## openSUSE Specific Considerations

**SUSE ecosystem integration**: Since Rancher is a SUSE product, openSUSE provides excellent compatibility. You can also use RKE2 (Rancher Kubernetes Engine) for provisioning downstream clusters, which is SUSE's hardened Kubernetes distribution.

**Btrfs file system**: openSUSE often uses Btrfs as the default file system. Docker can run on Btrfs-backed systems, and `overlay2` is generally preferred when supported. Check the current Docker storage configuration with:

```bash
docker info | grep -E 'Storage Driver|Backing Filesystem'
```

**YaST integration**: You can use YaST for some configuration tasks:

```bash
# Open firewall configuration
sudo yast2 firewall

# Open network configuration
sudo yast2 lan
```

**Transactional updates**: If using openSUSE MicroOS (a variant designed for containers), use transactional-update instead of zypper:

```bash
# Only for MicroOS
# sudo transactional-update pkg install docker
```

## Updating Rancher

To update Rancher to a newer version:

```bash
docker stop rancher
docker rm rancher
docker pull rancher/rancher:latest

docker run -d \
  --name rancher \
  --restart=unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v /opt/rancher:/var/lib/rancher \
  --privileged \
  rancher/rancher:latest
```

## Troubleshooting

```bash
# Check Docker service
sudo systemctl status docker
sudo journalctl -u docker --tail 50

# View Rancher logs
docker logs rancher --tail 100

# Check AppArmor denials
sudo dmesg | grep -i apparmor

# Check firewall
sudo firewall-cmd --list-all

# Check resources
free -h
df -h
```

## Conclusion

You have successfully installed Rancher on openSUSE Leap for a testing or development environment. Given that Rancher is part of the SUSE family, openSUSE provides one of the most natural platforms for trying Rancher. For production use, install Rancher on a supported high-availability Kubernetes cluster instead of a single Docker container.
