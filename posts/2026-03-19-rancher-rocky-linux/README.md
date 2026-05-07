# How to Install Rancher on Rocky Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Rocky Linux, Docker, Kubernetes, Installation

Description: A step-by-step guide to installing Rancher on Rocky Linux 9 using Docker, covering system preparation, Docker setup, firewall configuration, and deployment.

Rocky Linux was created as a direct replacement for CentOS Linux after Red Hat shifted CentOS to a rolling release model. It maintains full binary compatibility with RHEL, making it an excellent choice for enterprise workloads including Rancher. This guide covers the complete process of installing Rancher on Rocky Linux 9 for development and testing with Docker.

Rancher's single-node Docker installation is intended for development and testing only, not production.

## Prerequisites

Before you begin, ensure you have:

- A server running Rocky Linux 9 with at least 4 GB RAM and 2 CPU cores
- Root or sudo access
- A static IP address or DNS name
- Internet access for downloading packages and container images

## Step 1: Update the System

Start by updating all packages:

```bash
sudo dnf update -y
```

Reboot if kernel updates were applied:

```bash
sudo reboot
```

## Step 2: Disable Swap

Disable swap for Kubernetes compatibility:

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

## Step 3: Configure SELinux

Install Rancher's SELinux policy package so Rancher can run with SELinux enabled:

```bash
cat <<EOF | sudo tee /etc/yum.repos.d/rancher.repo
[rancher]
name=Rancher
baseurl=https://rpm.rancher.io/rancher/production/centos/9/noarch
enabled=1
gpgcheck=1
gpgkey=https://rpm.rancher.io/public.key
EOF

sudo dnf install -y rancher-selinux
```

## Step 4: Install Required Dependencies

```bash
sudo dnf install -y \
  dnf-plugins-core \
  curl \
  wget \
  tar
```

## Step 5: Add the Docker Repository

Add the official Docker repository for RHEL-compatible systems:

```bash
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
```

## Step 6: Install Docker

Install Docker Engine:

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Enable and start Docker:

```bash
sudo systemctl enable --now docker
```

Verify Docker:

```bash
sudo docker --version
sudo docker run hello-world
```

## Step 7: Configure the Firewall

Rancher's installation requirements note that `firewalld` can conflict with Kubernetes networking plugins, so disable it before starting Rancher:

```bash
sudo systemctl disable --now firewalld
```

## Step 8: Configure Kernel Networking

Apply the sysctl setting Rancher requires for Docker-based installs:

```bash
sudo modprobe br_netfilter
cat <<EOF | sudo tee /etc/sysctl.d/99-rancher.conf
net.bridge.bridge-nf-call-iptables = 1
EOF

sudo sysctl --system
```

## Step 9: Configure Docker Logging

Set up log rotation to prevent excessive disk usage:

```bash
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

## Step 10: Create Persistent Storage

```bash
sudo mkdir -p /opt/rancher
```

## Step 11: Run Rancher

Deploy Rancher using Docker:

```bash
sudo docker run -d \
  --name rancher \
  --restart=unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v /opt/rancher:/var/lib/rancher \
  --privileged \
  rancher/rancher:latest
```

## Step 12: Retrieve the Bootstrap Password

```bash
sudo docker logs rancher 2>&1 | grep "Bootstrap Password:"
```

If the password has not appeared yet, wait another minute and try again.

## Step 13: Access the Rancher UI

Navigate to `https://<your-server-ip>` in your browser. Accept the self-signed certificate warning and enter the bootstrap password.

Complete the setup:

1. Set a new admin password
2. Configure the Rancher server URL
3. Accept the terms and conditions

## Rocky Linux Specific Considerations

**FIPS mode**: If your Rocky Linux server is running with FIPS enabled, verify that the Rancher version you deploy supports your required compliance mode.

**Cockpit**: Rocky Linux often comes with Cockpit installed on port 9090. This does not conflict with Rancher, but be aware of it when managing your server.

**Package compatibility**: Rocky Linux 9 is RHEL-compatible, so the RHEL Docker repository is the appropriate Docker Engine repository for this setup. You can confirm the OS release with:

```bash
cat /etc/os-release | grep -i rocky
```

## Backup and Recovery

Create regular backups:

```bash
sudo mkdir -p /backup
sudo docker stop rancher
sudo tar czf /backup/rancher-backup-$(date +%Y%m%d).tar.gz /opt/rancher
sudo docker start rancher
```

## Troubleshooting

```bash
# Check Docker service

sudo systemctl status docker

# View Rancher container logs
sudo docker logs rancher --tail 100

# Check SELinux denials
sudo ausearch -m avc -ts recent

# Check firewalld status
sudo systemctl status firewalld

# Monitor resources
top -bn1 | head -20
free -h
```

## Conclusion

You have successfully installed Rancher on Rocky Linux 9 for development or testing with Docker. Rocky Linux provides an enterprise-grade, RHEL-compatible platform that is well suited for running Rancher and managing Kubernetes clusters. With its community-driven development and long support lifecycle, Rocky Linux is a reliable foundation for your container management infrastructure.
