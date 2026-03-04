# How to Install Docker on Ubuntu (The Right Way)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Docker, Containers, DevOps

Description: Install Docker on Ubuntu the right way using the official repository, post-install configuration, and optional rootless mode for enhanced security.

---

Docker has become the de facto standard for containerization in modern software development. Whether you are deploying microservices, setting up a development environment, or running production workloads, Docker provides a consistent and portable way to package and run applications. However, installing Docker on Ubuntu is not as straightforward as running `apt install docker`. In this comprehensive guide, we will walk through the proper way to install Docker on Ubuntu, including repository setup, post-installation steps, and the increasingly important rootless mode for enhanced security.

## Why Not Use Snap or Default APT Packages?

Before we dive into the installation process, it is crucial to understand why we avoid certain installation methods that might seem convenient at first glance.

### The Snap Problem

Ubuntu ships Docker as a Snap package, and while Snaps offer certain advantages like automatic updates and sandboxing, they come with significant drawbacks for Docker:

1. **Performance Overhead**: Snap packages run in a confined environment with additional abstraction layers, which can impact container performance.

2. **File System Access Issues**: Snaps have strict confinement policies that can cause problems when Docker needs to access files outside the Snap sandbox. This often manifests as permission denied errors when mounting volumes.

3. **Networking Complications**: The Snap version of Docker may have networking issues, especially in complex setups involving custom networks or host networking mode.

4. **Delayed Updates**: Snap packages may not receive updates as quickly as the official Docker repository, leaving you without the latest features and security patches.

### The Default APT Package Problem

The `docker.io` package available in Ubuntu's default repositories is often outdated:

1. **Version Lag**: Ubuntu repositories typically contain older Docker versions that may lack recent features, performance improvements, and security fixes.

2. **Missing Components**: The default package may not include all Docker components like Docker Compose v2, BuildKit, or the latest CLI plugins.

3. **Inconsistent Updates**: Security patches may take longer to reach the Ubuntu repositories compared to Docker's official repository.

## Prerequisites

Before installing Docker, ensure your system meets the following requirements:

- Ubuntu 20.04 (Focal Fossa), 22.04 (Jammy Jellyfish), 24.04 (Noble Numbat), or later
- 64-bit version of Ubuntu
- Sudo privileges
- Internet connection for downloading packages

Let us first verify your Ubuntu version and architecture:

```bash
# Check your Ubuntu version
lsb_release -a

# Verify you are running a 64-bit system
uname -m
# Expected output: x86_64 (for AMD64) or aarch64 (for ARM64)
```

## Step 1: Remove Old Docker Installations

If you have any previous Docker installations (from Snap, APT, or manual installation), remove them first to avoid conflicts:

```bash
# Stop Docker services if running
sudo systemctl stop docker.socket docker.service 2>/dev/null || true

# Remove Snap version of Docker if installed
sudo snap remove docker 2>/dev/null || true

# Remove old Docker packages from APT
# This removes docker.io, docker-compose, docker-doc, and related packages
sudo apt-get remove -y docker docker-engine docker.io containerd runc docker-compose docker-doc podman-docker 2>/dev/null || true

# Remove any leftover Docker data (optional - skip if you want to preserve volumes)
# WARNING: This will delete all your existing containers, images, and volumes
# sudo rm -rf /var/lib/docker /var/lib/containerd

# Clean up APT cache
sudo apt-get autoremove -y
sudo apt-get autoclean
```

## Step 2: Install Required Dependencies

Docker requires certain packages to set up its repository over HTTPS:

```bash
# Update the package index
sudo apt-get update

# Install packages required for repository setup
# ca-certificates: For SSL/TLS certificate verification
# curl: For downloading files from the internet
# gnupg: For handling GPG keys used to verify package authenticity
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg
```

## Step 3: Add Docker's Official GPG Key

Docker packages are cryptographically signed to ensure authenticity. We need to add Docker's official GPG key to verify package signatures:

```bash
# Create the directory for APT keyrings if it does not exist
# This is the recommended location for storing third-party GPG keys
sudo install -m 0755 -d /etc/apt/keyrings

# Download and install Docker's official GPG key
# The key is stored in a dearmored binary format for security
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Ensure the key file has appropriate read permissions
# This allows APT to read the key during package verification
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

## Step 4: Set Up the Docker Repository

Now we add the official Docker repository to our APT sources:

```bash
# Add the Docker repository to APT sources
# This command automatically detects your Ubuntu version and architecture
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Verify the repository was added correctly
cat /etc/apt/sources.list.d/docker.list
```

The repository configuration includes:

- **arch**: Automatically detected system architecture (amd64, arm64, etc.)
- **signed-by**: Path to the GPG key for package verification
- **VERSION_CODENAME**: Your Ubuntu release codename (focal, jammy, noble, etc.)
- **stable**: The stable release channel (you can also use "test" or "nightly" for experimental features)

## Step 5: Install Docker Engine

With the repository configured, we can now install Docker Engine and its components:

```bash
# Update the package index to include the new Docker repository
sudo apt-get update

# Install Docker Engine, CLI, containerd, and plugins
# docker-ce: Docker Engine (Community Edition)
# docker-ce-cli: Docker command-line interface
# containerd.io: Container runtime
# docker-buildx-plugin: BuildKit-based build system
# docker-compose-plugin: Docker Compose v2
sudo apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
```

### Understanding the Installed Components

- **docker-ce (Docker Engine)**: The core Docker daemon that runs and manages containers
- **docker-ce-cli**: The command-line tool for interacting with Docker
- **containerd.io**: The industry-standard container runtime that Docker uses internally
- **docker-buildx-plugin**: An extended build system with support for multi-platform builds, caching, and more
- **docker-compose-plugin**: The new Docker Compose v2, integrated as a Docker CLI plugin

## Step 6: Verify the Installation

Let us verify that Docker was installed correctly:

```bash
# Check Docker version
docker --version

# Check Docker Compose version (v2 syntax)
docker compose version

# Verify Docker Engine is running
sudo systemctl status docker

# Run the hello-world container to verify everything works
sudo docker run hello-world
```

If the hello-world container runs successfully, you should see a message confirming that Docker is installed correctly.

## Step 7: Post-Installation Configuration

### Adding Your User to the Docker Group

By default, Docker commands require sudo privileges. To run Docker commands without sudo, add your user to the docker group:

```bash
# Create the docker group (it may already exist)
sudo groupadd docker 2>/dev/null || true

# Add your current user to the docker group
sudo usermod -aG docker $USER

# Apply the new group membership without logging out
# Option 1: Start a new shell with the updated groups
newgrp docker

# Option 2: Log out and log back in for changes to take effect system-wide
# This is the recommended approach for a permanent solution
```

After adding yourself to the docker group, verify you can run Docker without sudo:

```bash
# Test Docker without sudo
docker run hello-world

# Verify group membership
groups
# You should see 'docker' in the list of groups
```

**Security Note**: Adding a user to the docker group grants them root-equivalent privileges on the host system. Docker containers can be used to escalate privileges, so only add trusted users to this group. For enhanced security, consider using rootless mode (covered later in this guide).

### Configuring Docker to Start on Boot

Enable Docker to start automatically when the system boots:

```bash
# Enable Docker daemon to start on boot
sudo systemctl enable docker.service
sudo systemctl enable containerd.service

# Verify the services are enabled
sudo systemctl is-enabled docker
sudo systemctl is-enabled containerd
```

If you want to disable automatic startup (for example, on a development machine):

```bash
# Disable automatic startup
sudo systemctl disable docker.service
sudo systemctl disable containerd.service
```

## Step 8: Configuring the Docker Daemon

Docker's behavior can be customized through the daemon configuration file. This is where you set logging options, storage drivers, network settings, and more.

### Creating the Daemon Configuration File

```bash
# Create or edit the Docker daemon configuration file
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-address-pools": [
    {
      "base": "172.17.0.0/16",
      "size": 24
    }
  ],
  "features": {
    "buildkit": true
  }
}
EOF
```

### Understanding the Configuration Options

Let us break down each configuration option:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

**Logging Configuration**: By default, Docker keeps all container logs indefinitely, which can fill up your disk. This configuration limits log files to 10MB each and keeps only 3 rotated files per container.

```json
{
  "storage-driver": "overlay2"
}
```

**Storage Driver**: The overlay2 driver is the recommended storage driver for modern Linux kernels. It provides good performance and efficient use of disk space.

```json
{
  "live-restore": true
}
```

**Live Restore**: This option allows containers to keep running even when the Docker daemon is stopped or restarted. This is crucial for minimizing downtime during Docker updates.

```json
{
  "default-address-pools": [
    {
      "base": "172.17.0.0/16",
      "size": 24
    }
  ]
}
```

**Network Address Pools**: Customize the IP address ranges Docker uses for container networks. This is useful to avoid conflicts with your existing network infrastructure.

```json
{
  "features": {
    "buildkit": true
  }
}
```

**BuildKit**: Enables BuildKit by default for all builds. BuildKit provides improved build performance, better caching, and advanced features like secret mounting.

### Applying the Configuration

After modifying the daemon configuration, restart Docker to apply changes:

```bash
# Reload the systemd configuration
sudo systemctl daemon-reload

# Restart Docker
sudo systemctl restart docker

# Verify Docker is running with the new configuration
docker info

# Check specific settings
docker info | grep "Storage Driver"
docker info | grep "Logging Driver"
docker info | grep "Live Restore"
```

### Additional Daemon Configuration Options

Here are some additional configuration options you might consider:

```bash
# Extended daemon.json with more options
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-address-pools": [
    {
      "base": "172.17.0.0/16",
      "size": 24
    }
  ],
  "features": {
    "buildkit": true
  },
  "dns": ["8.8.8.8", "8.8.4.4"],
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  },
  "registry-mirrors": [],
  "insecure-registries": [],
  "debug": false,
  "experimental": false
}
EOF
```

**Additional Options Explained**:

- **dns**: Custom DNS servers for containers (useful when default DNS does not work)
- **default-ulimits**: Set default resource limits for containers (nofile = max open files)
- **registry-mirrors**: Add registry mirrors for faster image pulls
- **insecure-registries**: Allow connections to registries without TLS (use with caution)
- **debug**: Enable debug mode for troubleshooting
- **experimental**: Enable experimental features

## Step 9: Setting Up Rootless Mode

Rootless mode allows running the Docker daemon and containers without root privileges. This significantly improves security by limiting the potential damage from container escapes or daemon vulnerabilities.

### Why Use Rootless Mode?

1. **Enhanced Security**: Even if an attacker escapes a container, they will only have the privileges of an unprivileged user
2. **Compliance**: Some security policies require running services without root privileges
3. **Multi-tenant Environments**: Each user can run their own Docker daemon without affecting others
4. **Defense in Depth**: Adds an additional layer of security to your container infrastructure

### Prerequisites for Rootless Mode

Before setting up rootless mode, install the required packages and configure system settings:

```bash
# Install uidmap package for user namespace support
sudo apt-get install -y uidmap

# Verify subuid and subgid are configured for your user
# These files define the range of subordinate UIDs/GIDs available to your user
grep $USER /etc/subuid
grep $USER /etc/subgid

# If the above commands return empty, add entries manually
# This allocates 65536 subordinate UIDs/GIDs starting from 100000
echo "$USER:100000:65536" | sudo tee -a /etc/subuid
echo "$USER:100000:65536" | sudo tee -a /etc/subgid
```

### Configure System Settings for Rootless Mode

```bash
# Enable unprivileged user namespaces if not already enabled
# This is required for rootless containers to work
echo "kernel.unprivileged_userns_clone = 1" | sudo tee /etc/sysctl.d/99-docker-rootless.conf
sudo sysctl --system

# Increase the number of inotify instances and watches
# Required for containers that use file system notifications
echo "fs.inotify.max_user_instances = 256" | sudo tee -a /etc/sysctl.d/99-docker-rootless.conf
echo "fs.inotify.max_user_watches = 65536" | sudo tee -a /etc/sysctl.d/99-docker-rootless.conf
sudo sysctl --system
```

### Install Rootless Docker

If you already have Docker installed in rootful mode, you can install rootless mode alongside it:

```bash
# Stop the system Docker daemon (if running in rootful mode)
# This prevents conflicts during rootless setup
sudo systemctl stop docker docker.socket

# Run the rootless setup script
# This will install the rootless Docker daemon for your user
dockerd-rootless-setuptool.sh install

# The script will output instructions for setting environment variables
# Add these to your shell profile (e.g., ~/.bashrc or ~/.zshrc)
echo 'export PATH=/usr/bin:$PATH' >> ~/.bashrc
echo 'export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock' >> ~/.bashrc

# Apply the changes
source ~/.bashrc
```

### Start and Enable Rootless Docker

```bash
# Start the rootless Docker daemon
systemctl --user start docker

# Enable rootless Docker to start on login
systemctl --user enable docker

# Enable lingering so the daemon runs even when you are not logged in
sudo loginctl enable-linger $USER

# Verify the rootless daemon is running
systemctl --user status docker

# Test the rootless installation
docker run hello-world
```

### Rootless Mode Limitations

Be aware of the following limitations when using rootless mode:

1. **Port Binding**: Binding to ports below 1024 requires additional configuration:

```bash
# Option 1: Use sysctl to allow unprivileged port binding
echo "net.ipv4.ip_unprivileged_port_start=0" | sudo tee -a /etc/sysctl.d/99-docker-rootless.conf
sudo sysctl --system

# Option 2: Use port forwarding from a higher port
# Map container port 80 to host port 8080
docker run -p 8080:80 nginx
```

2. **Cgroup v2**: Rootless mode works best with cgroup v2. Verify your system:

```bash
# Check if cgroup v2 is enabled
mount | grep cgroup

# If you see "cgroup2" in the output, cgroup v2 is enabled
# Ubuntu 22.04+ uses cgroup v2 by default
```

3. **Network Performance**: Rootless networking uses slirp4netns by default, which may be slower. For better performance, consider using rootlesskit with VPNKit:

```bash
# Install vpnkit for better network performance (optional)
sudo apt-get install -y vpnkit
```

4. **Storage Limitations**: Some advanced storage features may not be available in rootless mode

### Switching Between Rootful and Rootless Mode

You can switch between rootful and rootless Docker by changing the DOCKER_HOST environment variable:

```bash
# Use rootless Docker (user's Docker daemon)
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock

# Use rootful Docker (system Docker daemon)
export DOCKER_HOST=unix:///var/run/docker.sock

# Or unset to use the default (usually rootful if docker group is configured)
unset DOCKER_HOST
```

## Step 10: Advanced Verification and Testing

Let us perform comprehensive tests to ensure Docker is working correctly:

```bash
# Test 1: Verify Docker Engine version and details
docker version

# Test 2: Display system-wide Docker information
docker info

# Test 3: Run a more comprehensive test container
docker run --rm -it alpine:latest sh -c "echo 'Container networking works!' && wget -q -O- http://example.com | head -5"

# Test 4: Test volume mounting
echo "Hello from host" > /tmp/docker-test.txt
docker run --rm -v /tmp/docker-test.txt:/test.txt:ro alpine cat /test.txt

# Test 5: Test Docker Compose
mkdir -p /tmp/docker-compose-test
cat > /tmp/docker-compose-test/compose.yaml <<EOF
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
  db:
    image: alpine
    command: sleep infinity
EOF

# Start the services
cd /tmp/docker-compose-test
docker compose up -d

# Check the running services
docker compose ps

# Test the nginx server
curl -s http://localhost:8080 | head -5

# Clean up
docker compose down
rm -rf /tmp/docker-compose-test /tmp/docker-test.txt

# Test 6: Test BuildKit
mkdir -p /tmp/buildkit-test
cat > /tmp/buildkit-test/Dockerfile <<EOF
# syntax=docker/dockerfile:1
FROM alpine:latest
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache curl
CMD ["curl", "--version"]
EOF

docker build -t buildkit-test /tmp/buildkit-test
docker run --rm buildkit-test
docker rmi buildkit-test
rm -rf /tmp/buildkit-test
```

## Step 11: Configure Firewall Rules (Optional)

If you are using UFW (Uncomplicated Firewall), you may need to configure it to work with Docker:

```bash
# Check UFW status
sudo ufw status

# Allow Docker to manage iptables (recommended)
# Docker automatically manages firewall rules for published ports
# However, if you need to restrict access, you can configure UFW

# Allow SSH (always do this before enabling UFW!)
sudo ufw allow ssh

# Allow specific ports for Docker containers
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# If Docker bypasses UFW (which it does by default), you may need
# to modify the Docker daemon settings to respect UFW rules
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "iptables": true
}
EOF

# For more control over Docker and UFW, consider using the DOCKER-USER chain
# This chain is processed before Docker's rules
# Example: Block all external access to Docker containers except from specific IP
# sudo iptables -I DOCKER-USER -i eth0 ! -s 10.0.0.0/8 -j DROP
```

## Step 12: Setting Up Docker Logging Best Practices

Proper logging configuration is essential for production environments:

```bash
# Configure JSON file logging with rotation (already in daemon.json)
# This prevents logs from consuming all disk space

# View container logs
docker logs <container_id>

# View logs with timestamps
docker logs -t <container_id>

# Follow log output in real-time
docker logs -f <container_id>

# View only the last 100 lines
docker logs --tail 100 <container_id>

# View logs since a specific time
docker logs --since 2h <container_id>

# For centralized logging, consider using a logging driver
# Example: Configure syslog driver in daemon.json
# {
#   "log-driver": "syslog",
#   "log-opts": {
#     "syslog-address": "udp://logs.example.com:514",
#     "syslog-facility": "daemon"
#   }
# }
```

## Troubleshooting Common Issues

### Issue 1: Permission Denied When Connecting to Docker Socket

```bash
# Error: Got permission denied while trying to connect to the Docker daemon socket

# Solution: Add your user to the docker group
sudo usermod -aG docker $USER

# Apply changes immediately
newgrp docker

# Or log out and log back in
```

### Issue 2: Docker Service Fails to Start

```bash
# Check Docker service status and logs
sudo systemctl status docker
sudo journalctl -u docker.service -n 50

# Common causes:
# 1. Invalid daemon.json - validate JSON syntax
sudo cat /etc/docker/daemon.json | python3 -m json.tool

# 2. Port conflict - check if another service uses the port
sudo netstat -tulpn | grep 2375

# 3. Storage driver issues - check disk space and permissions
df -h /var/lib/docker
```

### Issue 3: Network Connectivity Issues in Containers

```bash
# Check Docker network settings
docker network ls
docker network inspect bridge

# Test DNS resolution in a container
docker run --rm alpine nslookup google.com

# If DNS fails, try adding DNS servers to daemon.json
# {
#   "dns": ["8.8.8.8", "8.8.4.4"]
# }

# Restart Docker after changing daemon.json
sudo systemctl restart docker
```

### Issue 4: Containers Cannot Access the Internet

```bash
# Check if IP forwarding is enabled
sysctl net.ipv4.ip_forward

# Enable IP forwarding if disabled
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-docker-forward.conf
sudo sysctl --system

# Check iptables rules
sudo iptables -L -n -v

# Verify Docker's iptables integration
docker info | grep "iptables"
```

### Issue 5: Disk Space Issues

```bash
# Check Docker disk usage
docker system df

# Remove unused data (images, containers, volumes, networks)
docker system prune -a

# Remove only dangling images
docker image prune

# Remove stopped containers
docker container prune

# Remove unused volumes (careful - this deletes data!)
docker volume prune

# Set up automatic cleanup via cron
# Run daily at 3 AM to remove images older than 24 hours
# (crontab -l 2>/dev/null; echo "0 3 * * * docker image prune -a --filter 'until=24h' -f") | crontab -
```

## Security Best Practices

### 1. Keep Docker Updated

```bash
# Update Docker regularly
sudo apt-get update
sudo apt-get upgrade docker-ce docker-ce-cli containerd.io

# Check for security advisories
# Visit: https://docs.docker.com/engine/security/
```

### 2. Use Docker Content Trust

```bash
# Enable Docker Content Trust for image verification
export DOCKER_CONTENT_TRUST=1

# Add to your shell profile for persistence
echo 'export DOCKER_CONTENT_TRUST=1' >> ~/.bashrc
```

### 3. Run Containers with Least Privilege

```bash
# Run containers as non-root user
docker run --user 1000:1000 alpine whoami

# Drop all capabilities and add only what is needed
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE nginx

# Use read-only file systems when possible
docker run --read-only alpine cat /etc/os-release

# Limit resources
docker run --memory 256m --cpus 0.5 alpine stress --cpu 1
```

### 4. Scan Images for Vulnerabilities

```bash
# Use Docker Scout for vulnerability scanning
docker scout cves <image_name>

# Or use other tools like Trivy
# Install Trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Scan an image
trivy image nginx:latest
```

## Conclusion

You have now installed Docker on Ubuntu the right way using the official Docker repository. This installation method ensures you always have access to the latest features, security patches, and performance improvements.

Key points covered in this guide:

1. **Why to avoid Snap and default APT packages**: Performance, compatibility, and update issues
2. **Official repository setup**: Using Docker's GPG key and repository for authenticated packages
3. **Complete Docker installation**: Docker Engine, CLI, containerd, BuildKit, and Compose v2
4. **Post-installation configuration**: User groups, automatic startup, and daemon settings
5. **Daemon configuration**: Logging, storage, networking, and performance tuning
6. **Rootless mode**: Enhanced security by running Docker without root privileges
7. **Verification and testing**: Comprehensive tests to ensure proper operation
8. **Troubleshooting**: Solutions to common issues
9. **Security best practices**: Keeping your Docker installation secure

With Docker properly installed and configured, you are ready to start containerizing your applications. Remember to keep Docker updated, follow security best practices, and consider using rootless mode for enhanced security in sensitive environments.

## Additional Resources

- [Official Docker Documentation](https://docs.docker.com/)
- [Docker Engine Installation on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Post-installation Steps](https://docs.docker.com/engine/install/linux-postinstall/)
- [Docker Rootless Mode](https://docs.docker.com/engine/security/rootless/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [BuildKit Documentation](https://docs.docker.com/build/buildkit/)

Happy containerizing!
