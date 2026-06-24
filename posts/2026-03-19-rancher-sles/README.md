# How to Install Rancher on SLES (SUSE Linux Enterprise Server)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, SLE, Docker, Kubernetes, Installation

Description: A complete guide to installing Rancher on SUSE Linux Enterprise Server 15 using Docker, including subscription management and enterprise configuration.

SUSE Linux Enterprise Server (SLES) is an enterprise-grade Linux distribution designed for mission-critical workloads. Since SUSE acquired Rancher Labs, SLES has become the premier platform for running Rancher in enterprise environments. This guide walks you through installing Rancher on SLES 15 SP5 or later by using Rancher's single-container Docker deployment for development or testing.

## Prerequisites

Before you begin, ensure you have:

- A server running SLES 15 SP5 or later with at least 4 GB RAM and 2 CPU cores
- An active SLES subscription for package access
- Root or sudo access
- A static IP address or DNS name
- Internet access (or a local SMT/RMT mirror)

## Step 1: Register the System

Ensure your SLES system is registered with SUSE Customer Center:

```bash
sudo SUSEConnect --status
```

If not registered:

```bash
sudo SUSEConnect -r YOUR_REGISTRATION_CODE -e your@email.com
```

Activate the required modules:

```bash
sudo SUSEConnect -p sle-module-containers/15.5/x86_64
```

The Containers Module provides Docker and container-related tools.

## Step 2: Update the System

```bash
sudo zypper refresh
sudo zypper update -y
```

## Step 3: Disable Swap

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

## Step 4: Install Docker

With the Containers Module activated, install Docker:

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

SLES uses `firewalld`. For a Docker-hosted Rancher server, open `80/tcp` and `443/tcp`:

```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

When Rancher manages hosted or imported clusters, the Rancher server also needs outbound access to their Kubernetes API servers on `6443/tcp`.

Alternatively, using SuSEfirewall2 on older SLES installations:

```bash
sudo yast2 firewall
```

## Step 6: Configure Kernel Modules

```bash
cat <<EOF | sudo tee /etc/modules-load.d/rancher.conf
br_netfilter
overlay
EOF

sudo modprobe br_netfilter
sudo modprobe overlay
```

Set sysctl parameters:

```bash
cat <<EOF | sudo tee /etc/sysctl.d/99-rancher.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system
```

## Step 7: Configure AppArmor

SLES uses AppArmor for mandatory access control. Verify its status:

```bash
sudo systemctl status apparmor
sudo aa-status
```

Docker containers running in privileged mode (as Rancher requires) should work without AppArmor modifications. If you encounter issues:

```bash
# Check for AppArmor denials

sudo dmesg | grep -i apparmor

# Set Docker profiles to complain mode if needed
sudo aa-complain /etc/apparmor.d/*docker*
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
  },
  "storage-driver": "overlay2"
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

```bash
docker logs rancher 2>&1 | grep "Bootstrap Password:"
```

## Step 12: Access the Rancher UI

Navigate to `https://<your-server-ip>` in your browser. Accept the self-signed certificate warning and enter the bootstrap password.

Complete the setup:

1. Set a new admin password
2. Configure the Rancher server URL
3. Accept the terms and conditions

## SLES Enterprise Considerations

**SUSE support**: Your SLES subscription covers SLES. Rancher support is provided through a separate SUSE Rancher Prime subscription, with support cases managed through the SUSE Customer Center.

**RKE2 integration**: SUSE recommends using RKE2 (Rancher Kubernetes Engine 2) for downstream clusters. RKE2 provides FIPS enablement and is designed for security-sensitive environments:

```bash
# RKE2 can be provisioned directly from the Rancher UI
# No additional installation needed on the Rancher server
```

**SUSE Manager integration**: If you use SUSE Manager for system management, Rancher can work alongside it. SUSE Manager handles OS-level patching while Rancher manages the Kubernetes layer.

**High availability**: For production SLES environments, deploy Rancher on a multi-node Kubernetes cluster using Helm instead of Docker. This provides better resilience and aligns with Rancher's supported production guidance.

**Security compliance**: Certification status is service-pack specific. SLES 15 SP5 provides FIPS 140-3 guidance, but SUSE notes that SLES 15 SP5 itself is not submitted for Common Criteria or NIST FIPS 140-3 certification. When running Rancher on SLES for compliance-sensitive workloads:

```bash
# Check FIPS mode
sudo fips-mode-setup --check

# Verify security modules
sudo aa-status
```

## Backup and Recovery

Create regular backups of your Rancher data:

```bash
docker stop rancher
sudo tar czf /backup/rancher-$(date +%Y%m%d).tar.gz /opt/rancher
docker start rancher
```

For enterprise environments, consider using SUSE's backup solutions or integrating with your existing backup infrastructure.

## Troubleshooting

```bash
# Check Docker service
sudo systemctl status docker
sudo journalctl -u docker --tail 50

# View Rancher logs
docker logs rancher --tail 100

# Check subscription status
sudo SUSEConnect --status

# Check AppArmor
sudo aa-status
sudo dmesg | grep -i apparmor

# Check firewall
sudo firewall-cmd --list-all

# Check resources
free -h
df -h
```

## Conclusion

You have successfully installed Rancher on SUSE Linux Enterprise Server. SLES integrates well with the broader SUSE ecosystem and provides enterprise features for the host operating system, while Rancher support is available through SUSE Rancher Prime. For production deployments, use a supported Helm installation on Kubernetes instead of the single-container Docker method shown here.
