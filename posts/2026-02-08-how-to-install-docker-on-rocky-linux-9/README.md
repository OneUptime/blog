# How to Install Docker on Rocky Linux 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Rocky Linux, Linux, Installation, DevOps, Containers, RHEL, Enterprise Linux

Description: Complete guide to installing Docker Engine on Rocky Linux 9 with repository configuration, SELinux handling, and production-ready setup tips.

---

Rocky Linux 9 was created as a community-driven replacement for CentOS after Red Hat shifted CentOS to the Stream model. It provides binary compatibility with RHEL 9, making it a popular choice for enterprise workloads. Docker runs well on Rocky Linux 9, but the installation requires a few extra steps because the distribution ships with Podman instead.

## Prerequisites

- A Rocky Linux 9 system (minimal or full install)
- A user with `sudo` privileges
- An internet connection
- At least 2 GB of RAM (4 GB recommended for running multiple containers)

## Step 1: Remove Conflicting Packages

Rocky Linux 9 includes Podman, Buildah, and related container tools by default. These conflict with Docker and must be removed.

```bash
# Remove Podman, Buildah, and any old Docker packages
sudo dnf remove -y podman buildah docker docker-client docker-client-latest \
  docker-common docker-latest docker-latest-logrotate \
  docker-logrotate docker-engine
```

If you need Podman later, you can reinstall it, but running both Docker and Podman simultaneously can cause unexpected behavior.

## Step 2: Install Required Utilities

Install `yum-utils` to get the `yum-config-manager` command.

```bash
# Install yum-utils for repository management
sudo dnf install -y yum-utils
```

## Step 3: Add Docker's Official Repository

Docker maintains a CentOS-based RPM repository that works perfectly on Rocky Linux 9.

```bash
# Add the Docker CE stable repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

Verify that the repository was added.

```bash
# List repositories and filter for Docker
dnf repolist | grep docker
```

You should see `docker-ce-stable` listed.

## Step 4: Install Docker Engine

Install Docker along with its CLI, containerd, and plugins.

```bash
# Install the full Docker Engine stack
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

If you see a GPG key prompt, verify the fingerprint and accept it. Rocky Linux 9 may also ask you to import the Docker GPG key for the first time.

## Step 5: Start and Enable Docker

Start the Docker daemon and configure it to launch at boot.

```bash
# Start Docker immediately
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker
```

Confirm Docker is running.

```bash
# Check the Docker service status
systemctl is-active docker
```

This should print `active`.

## Step 6: Test the Installation

Run the hello-world image to verify everything is functional.

```bash
# Verify Docker with the hello-world container
sudo docker run hello-world
```

A successful run means the Docker daemon, CLI, and networking are all working correctly.

## Step 7: Add Your User to the Docker Group

Avoid typing `sudo` for every Docker command.

```bash
# Create the docker group if it does not exist
sudo groupadd docker

# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply the group change in the current session
newgrp docker
```

Test by running a container without `sudo`.

```bash
# Run a container as a regular user
docker ps
```

## Working with SELinux

Rocky Linux 9 runs SELinux in enforcing mode. Docker is compatible with SELinux, but bind mounts require special handling.

When mounting a host directory into a container, use the `:z` or `:Z` suffix.

```bash
# Mount with shared SELinux label (multiple containers can access)
docker run -v /data/app:/app:z myimage

# Mount with private SELinux label (only this container can access)
docker run -v /data/app:/app:Z myimage
```

If you encounter "permission denied" errors inside containers, check that the `container-selinux` package is installed.

```bash
# Install container-selinux if missing
sudo dnf install -y container-selinux
```

Never disable SELinux entirely just to make Docker work. The `:z` and `:Z` flags solve the vast majority of permission issues.

## Configuring the Docker Daemon

Create a daemon.json file to customize Docker's behavior.

```bash
# Create a production-ready daemon configuration
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "default-address-pools": [
    {"base": "172.80.0.0/16", "size": 24}
  ]
}
EOF
```

Apply the changes.

```bash
# Reload systemd and restart Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

The `default-address-pools` setting helps avoid IP address conflicts if your host network uses the 172.17.x.x range that Docker uses by default.

## Firewall Configuration

Rocky Linux 9 uses `firewalld`. Docker modifies iptables directly, so you may need to trust the Docker bridge interface.

```bash
# Add the docker0 interface to the trusted zone
sudo firewall-cmd --permanent --zone=trusted --add-interface=docker0
sudo firewall-cmd --reload
```

To expose a specific container port externally:

```bash
# Allow port 80 through the firewall
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

## Setting Up Docker Compose

Docker Compose v2 was installed as a plugin in Step 4. Verify it works.

```bash
# Check the Docker Compose version
docker compose version
```

Create a simple test to confirm Compose works end-to-end.

```bash
# Create a test directory
mkdir -p ~/compose-test && cd ~/compose-test

# Create a minimal compose file
cat <<'EOF' > docker-compose.yml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
EOF

# Start the service
docker compose up -d

# Verify it is running
docker compose ps

# Clean up
docker compose down
```

## Monitoring Docker Resources

Keep an eye on disk usage to prevent your system from running out of space.

```bash
# Show Docker disk usage broken down by images, containers, and volumes
docker system df

# For verbose output showing individual items
docker system df -v
```

Clean up unused resources periodically.

```bash
# Remove all stopped containers, unused networks, dangling images, and build cache
docker system prune -f

# Also remove unused volumes (use with caution)
docker system prune -f --volumes
```

## Troubleshooting

### Package conflicts with runc

Rocky Linux ships its own version of `runc`. If `dnf` reports a conflict, use the `--allowerasing` flag.

```bash
# Force installation, allowing conflicting packages to be replaced
sudo dnf install -y --allowerasing docker-ce docker-ce-cli containerd.io
```

### Docker daemon fails to start

Inspect the system journal.

```bash
# View Docker daemon logs
sudo journalctl -u docker --no-pager -n 50
```

A common issue is a malformed `daemon.json` file. Validate it with `python3 -m json.tool /etc/docker/daemon.json`.

### Containers cannot reach the internet

Check if IP forwarding is enabled.

```bash
# Verify IP forwarding is active
sysctl net.ipv4.ip_forward
```

If it returns `0`, enable it.

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Make it persistent across reboots
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-docker.conf
sudo sysctl --system
```

## Summary

Docker integrates smoothly with Rocky Linux 9 once you remove conflicting Podman packages and add Docker's RPM repository. SELinux support works well with the `:z` volume flag, and the systemd cgroup driver keeps Docker in harmony with the rest of the system. Rocky Linux 9's RHEL compatibility ensures enterprise-grade stability for your containerized workloads.
