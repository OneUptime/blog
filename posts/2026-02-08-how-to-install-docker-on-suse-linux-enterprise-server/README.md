# How to Install Docker on SUSE Linux Enterprise Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, SUSE, SLES, Linux, Installation, DevOps, Containers, Enterprise

Description: How to install and configure Docker on SUSE Linux Enterprise Server (SLES), including SUSEConnect module activation and enterprise-specific setup steps.

---

SUSE Linux Enterprise Server (SLES) is a major player in enterprise Linux environments, particularly in SAP deployments and traditional data centers. SLES ships Docker through its Containers Module, making installation straightforward once the module is activated. This guide covers Docker installation on SLES 15 SP4 and later.

## Prerequisites

- A SLES 15 SP4+ system with an active SUSE subscription
- Root or sudo access
- An internet connection (or access to a SUSE Package Hub mirror)
- The SUSEConnect tool for module activation

## Step 1: Activate the Containers Module

SLES organizes software into modules. Docker lives in the Containers Module, which must be activated before you can install it.

```bash
# Activate the Containers Module
sudo SUSEConnect -p sle-module-containers/15.4/x86_64
```

Replace `15.4` with your actual SP version. You can check your version with `cat /etc/os-release`.

Verify the module is active.

```bash
# List active modules
sudo SUSEConnect --list-extensions | grep -i container
```

You should see the Containers Module listed as `Activated`.

## Step 2: Update the System

Refresh and update the package repository.

```bash
# Refresh repositories and apply updates
sudo zypper refresh
sudo zypper update -y
```

## Step 3: Install Docker

With the Containers Module active, Docker is available through zypper.

```bash
# Install Docker
sudo zypper install -y docker docker-compose
```

SLES provides Docker through SUSE's own packaging, which includes compatibility patches and support from SUSE.

## Step 4: Start and Enable Docker

```bash
# Start the Docker daemon
sudo systemctl start docker

# Enable Docker to start at boot
sudo systemctl enable docker
```

Verify the service.

```bash
# Check Docker status
sudo systemctl status docker
```

## Step 5: Verify the Installation

```bash
# Run the test container
sudo docker run hello-world
```

## Step 6: Configure Non-Root Access

```bash
# Create the docker group (may already exist)
sudo groupadd docker

# Add your user to the docker group
sudo usermod -aG docker $USER
```

Log out and back in for the change to take effect.

```bash
# Verify non-root access
docker info
```

## Understanding SLES Docker vs Docker CE

SLES packages its own version of Docker, which may differ from Docker CE (Community Edition) in version number and available features. SUSE's Docker package receives backported security fixes and is covered under the SLES support contract.

Key differences:

- **Version**: SLES Docker may be behind Docker CE by one or two minor versions.
- **Support**: SUSE provides enterprise support for their Docker package.
- **Compatibility**: SLES Docker is tested specifically against SLES kernel versions.

If you need the absolute latest Docker CE, you can install it from Docker's repository instead, but you lose SUSE support coverage.

```bash
# Optional: Add Docker CE repository for the latest version
sudo zypper addrepo https://download.docker.com/linux/sles/docker-ce.repo
sudo zypper refresh
sudo zypper install -y docker-ce docker-ce-cli containerd.io
```

## Configuring the Docker Daemon

Create a daemon configuration file optimized for enterprise use.

```bash
# Create the Docker daemon configuration
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "exec-opts": ["native.cgroupdriver=systemd"],
  "live-restore": true,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 32768
    }
  }
}
EOF
```

The `live-restore` option keeps containers running during Docker daemon restarts, which is important for production environments.

Apply the changes.

```bash
# Reload daemon configuration and restart Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## Storage Driver Configuration

SLES supports several filesystems. The recommended storage driver depends on your filesystem.

| Filesystem | Recommended Driver |
|-----------|-------------------|
| XFS       | overlay2          |
| ext4      | overlay2          |
| Btrfs     | btrfs             |

Check your filesystem.

```bash
# Determine the filesystem of the Docker data directory
df -Th /var/lib/docker
```

For Btrfs (common on SLES):

```bash
# Configure Docker for Btrfs
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "storage-driver": "btrfs"
}
EOF

sudo systemctl restart docker
```

For XFS or ext4, `overlay2` is the default and optimal choice.

## Configuring Docker with SUSE Firewall

SLES uses SuSEfirewall2 or firewalld depending on the version. For firewalld:

```bash
# Trust the Docker bridge interface
sudo firewall-cmd --permanent --zone=trusted --add-interface=docker0
sudo firewall-cmd --reload
```

For SuSEfirewall2 (older SLES versions), edit `/etc/sysconfig/SuSEfirewall2` and add `docker0` to the `FW_DEV_INT` variable.

## Working with SUSE Container Registry

SUSE provides its own container registry at `registry.suse.com` with images optimized for SLES.

```bash
# Pull a SLES-based container image
docker pull registry.suse.com/suse/sle15:latest

# Run a SLES 15 container
docker run -it registry.suse.com/suse/sle15:latest /bin/bash
```

These images are particularly useful if you need to build containers that match your host OS for compatibility reasons.

## Setting Up a Private Registry

Enterprise environments often need a private registry. Run one locally.

```bash
# Run a local Docker registry
docker run -d \
  --name registry \
  --restart always \
  -p 5000:5000 \
  -v /opt/registry-data:/var/lib/registry \
  registry:2
```

Tag and push an image to it.

```bash
# Tag a local image for the private registry
docker tag my-app:latest localhost:5000/my-app:latest

# Push to the private registry
docker push localhost:5000/my-app:latest
```

## Configuring HTTP Proxy

Many enterprise SLES environments sit behind a proxy. Configure Docker to use it.

```bash
# Create the Docker service drop-in directory
sudo mkdir -p /etc/systemd/system/docker.service.d

# Create the proxy configuration
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf <<'EOF'
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:3128"
Environment="HTTPS_PROXY=http://proxy.example.com:3128"
Environment="NO_PROXY=localhost,127.0.0.1,registry.suse.com,.example.com"
EOF

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart docker
```

Verify the proxy settings.

```bash
# Check that Docker sees the proxy configuration
docker info | grep -i proxy
```

## Monitoring and Logging

For enterprise monitoring, consider shipping Docker metrics to your existing monitoring stack.

```bash
# Enable Docker metrics endpoint
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "metrics-addr": "0.0.0.0:9323",
  "experimental": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  },
  "storage-driver": "overlay2"
}
EOF

sudo systemctl restart docker
```

The metrics endpoint at port 9323 exposes Prometheus-compatible metrics.

## Troubleshooting

### SUSEConnect fails to activate the Containers Module

Verify your registration status.

```bash
# Check SLES registration
sudo SUSEConnect --status-text
```

If the system is not registered, register it first with `sudo SUSEConnect -r <registration-code>`.

### "overlay" mount not supported

Your kernel may not have the overlay module loaded.

```bash
# Load the overlay kernel module
sudo modprobe overlay

# Make it persistent
echo "overlay" | sudo tee /etc/modules-load.d/overlay.conf
```

### Docker containers cannot reach the internet

Check IP forwarding.

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-docker.conf
sudo sysctl --system
```

## Summary

SLES provides a clean path to Docker through its Containers Module. Once activated, installation is a single zypper command. The enterprise-specific considerations, such as proxy configuration, SUSE's own container registry, and compatibility with SUSE's support contracts, make it a strong choice for organizations already invested in the SUSE ecosystem. Whether you use SUSE's packaged Docker or opt for Docker CE, the combination of SLES stability and Docker flexibility serves enterprise workloads well.
