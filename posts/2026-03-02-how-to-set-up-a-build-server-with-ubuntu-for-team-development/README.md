# How to Set Up a Build Server with Ubuntu for Team Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CI/CD, DevOps, Build Server, Team Development

Description: Configure a dedicated Ubuntu build server for team development with shared build tools, user management, resource limits, and integration with common CI/CD platforms.

---

A dedicated build server centralizes compilation, testing, and artifact production away from developer workstations. This eliminates the classic "works on my machine" problem, gives you a consistent environment for all builds, and keeps CI/CD agents from competing with developers for laptop resources. Setting one up well on Ubuntu involves more than just installing compilers - you need user isolation, resource management, caching strategies, and monitoring.

## System Requirements and Initial Setup

For a team of 5-20 developers, a reasonable starting spec is:
- 8-16 CPU cores (builds are CPU-intensive)
- 32-64 GB RAM
- Fast SSD storage (500GB+) for build caches
- 1Gbps network interface

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install essential build tools
sudo apt install -y \
  build-essential \
  git \
  curl \
  wget \
  unzip \
  jq \
  htop \
  iotop \
  tmux \
  vim

# Set the hostname to something descriptive
sudo hostnamectl set-hostname build-server-01

# Configure the timezone
sudo timedatectl set-timezone UTC
```

## User and Group Management

Build servers typically have multiple users: CI agents, developers with SSH access, and service accounts.

```bash
# Create a dedicated group for build users
sudo groupadd builders

# Create a service account for CI/CD agents (no login shell)
sudo useradd -r -m -s /usr/sbin/nologin -g builders ci-agent
sudo mkdir -p /home/ci-agent/.ssh
sudo chmod 700 /home/ci-agent/.ssh

# Create accounts for developers (give them their own build directories)
sudo useradd -m -s /bin/bash -g builders devuser1
sudo useradd -m -s /bin/bash -g builders devuser2

# Set up SSH key for developer
sudo -u devuser1 mkdir -p /home/devuser1/.ssh
# Add their public key
echo "ssh-ed25519 AAAA... developer@workstation" | \
  sudo tee -a /home/devuser1/.ssh/authorized_keys
sudo chmod 700 /home/devuser1/.ssh
sudo chmod 600 /home/devuser1/.ssh/authorized_keys
sudo chown -R devuser1:builders /home/devuser1/.ssh

# Restrict SSH to key-based auth only
sudo nano /etc/ssh/sshd_config
```

Important SSH settings for the build server:
```text
PasswordAuthentication no
PubkeyAuthentication yes
AllowGroups builders sudo
MaxSessions 10
# Limit concurrent SSH connections per user
MaxStartups 10:30:60
```

```bash
sudo systemctl restart sshd
```

## Installing Build Tools

A real build server needs multiple language runtimes and build tools available system-wide.

### Java and JVM Languages

```bash
# Install multiple Java versions (common in enterprise environments)
sudo apt install -y openjdk-17-jdk openjdk-21-jdk

# Install Maven and Gradle
sudo apt install -y maven

# Install Gradle via SDKMAN for easier version management
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install gradle

# Make SDKMAN available system-wide for CI agent
sudo ln -s /usr/lib/jvm/java-21-openjdk-amd64 /usr/local/java
echo 'export JAVA_HOME=/usr/local/java' | sudo tee /etc/profile.d/java.sh
echo 'export PATH=$JAVA_HOME/bin:$PATH' | sudo tee -a /etc/profile.d/java.sh
```

### Node.js

```bash
# Install Node Version Manager (nvm) for the CI agent
sudo -u ci-agent bash -c 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash'
sudo -u ci-agent bash -c 'source /home/ci-agent/.nvm/nvm.sh && nvm install --lts'

# Or install a system-wide Node.js from NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash
sudo apt install -y nodejs

# Install pnpm and yarn globally
sudo npm install -g pnpm yarn
```

### Python

```bash
# Install Python with development headers
sudo apt install -y python3 python3-pip python3-venv python3-dev

# Install pyenv for managing multiple Python versions
# (install as ci-agent user)
sudo -u ci-agent bash -c 'curl https://pyenv.run | bash'

# Make Python tools available system-wide
sudo pip3 install virtualenv tox pytest
```

### Go

```bash
# Download and install Go
GO_VERSION="1.22.5"
wget "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz"
sudo tar -C /usr/local -xzf "go${GO_VERSION}.linux-amd64.tar.gz"
rm "go${GO_VERSION}.linux-amd64.tar.gz"

# Add to system PATH
echo 'export PATH=$PATH:/usr/local/go/bin' | sudo tee /etc/profile.d/go.sh
echo 'export GOPATH=/opt/go' | sudo tee -a /etc/profile.d/go.sh
sudo mkdir -p /opt/go
sudo chmod 777 /opt/go
```

### Docker

```bash
# Install Docker for containerized builds
sudo apt install -y docker.io

# Add CI agent to docker group
sudo usermod -aG docker ci-agent

# Enable Docker
sudo systemctl enable --now docker
```

## Setting Up Build Caches

Build caches dramatically reduce build times. Set up shared cache directories that build tools can use.

```bash
# Create shared cache directory
sudo mkdir -p /opt/build-cache/{maven,gradle,npm,pip,go,docker}
sudo chown -R root:builders /opt/build-cache
sudo chmod -R 775 /opt/build-cache

# Create a tmpfs for fast temporary build directories
# Add to /etc/fstab:
echo "tmpfs /tmp/build tmpfs rw,nosuid,nodev,size=8G 0 0" | sudo tee -a /etc/fstab
sudo mkdir -p /tmp/build
sudo mount /tmp/build

# Configure Maven to use shared cache
sudo mkdir -p /etc/maven
cat | sudo tee /etc/maven/settings.xml << 'EOF'
<settings>
  <localRepository>/opt/build-cache/maven</localRepository>
</settings>
EOF

# Configure Gradle to use shared cache (via environment variable)
echo 'export GRADLE_USER_HOME=/opt/build-cache/gradle' | sudo tee /etc/profile.d/gradle.sh

# Configure npm to use shared cache
echo 'export NPM_CONFIG_CACHE=/opt/build-cache/npm' | sudo tee /etc/profile.d/npm.sh

# Configure pip to use shared cache
echo 'export PIP_CACHE_DIR=/opt/build-cache/pip' | sudo tee /etc/profile.d/pip.sh
```

## Resource Limits and cgroups

Prevent runaway builds from consuming all server resources.

```bash
# Install cgroup utilities
sudo apt install -y cgroup-tools

# Set resource limits for the builders group via /etc/security/limits.conf
sudo nano /etc/security/limits.conf
```

Add these limits:
```text
# Limits for build users
@builders   soft   nproc    200
@builders   hard   nproc    500
@builders   soft   nofile   65536
@builders   hard   nofile   65536
@builders   soft   stack    65536
@builders   hard   stack    unlimited
# Prevent a single build from using more than 24 cores
@builders   soft   cpu      1440     # 24 hours CPU time limit
```

### Using systemd Slices for Resource Control

```bash
# Create a systemd slice for build jobs
sudo nano /etc/systemd/system/builds.slice
```

```ini
[Unit]
Description=Build Jobs Slice
DefaultDependencies=no
Before=slices.target

[Slice]
# Limit total CPU and memory usage for all build jobs
CPUQuota=400%       # Allow up to 4 CPU cores worth of time
MemoryHigh=24G      # Start throttling at 24GB
MemoryMax=28G       # Hard limit at 28GB
TasksMax=500        # Limit number of processes
```

```bash
sudo systemctl daemon-reload
sudo systemctl start builds.slice
```

## Setting Up Build Workspaces

Each project should have its own workspace directory:

```bash
# Create workspace structure
sudo mkdir -p /opt/workspaces
sudo chown root:builders /opt/workspaces
sudo chmod 2775 /opt/workspaces  # setgid bit so new files inherit group

# Create project-specific workspaces
sudo mkdir -p /opt/workspaces/{project-a,project-b,project-c}
sudo chown -R ci-agent:builders /opt/workspaces

# Script to clean old workspace artifacts (run as cron job)
cat | sudo tee /usr/local/bin/clean-workspaces.sh << 'EOF'
#!/bin/bash
# Clean build artifacts older than 7 days
find /opt/workspaces -name "target" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null
find /opt/workspaces -name "node_modules" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null
find /opt/workspaces -name ".gradle" -type d -mtime +30 -exec rm -rf {} + 2>/dev/null
echo "Workspace cleanup completed at $(date)"
EOF
sudo chmod +x /usr/local/bin/clean-workspaces.sh

# Schedule cleanup as a cron job
echo "0 2 * * * root /usr/local/bin/clean-workspaces.sh >> /var/log/workspace-cleanup.log 2>&1" | \
  sudo tee /etc/cron.d/workspace-cleanup
```

## Artifact Storage

Build artifacts (JARs, binaries, Docker images) need somewhere to land.

```bash
# Create artifact storage directory
sudo mkdir -p /opt/artifacts
sudo chown root:builders /opt/artifacts
sudo chmod 2775 /opt/artifacts

# Serve artifacts via Nginx (simple HTTP artifact server)
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/artifacts
```

```nginx
# Simple artifact server - read-only access to build outputs
server {
    listen 8090;
    server_name build-server-01.internal;

    root /opt/artifacts;
    autoindex on;  # Enable directory listing
    autoindex_exact_size off;
    autoindex_localtime on;

    # Only allow internal network access
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    allow 192.168.0.0/16;
    deny all;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/artifacts /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Monitoring Build Server Health

```bash
# Install monitoring tools
sudo apt install -y prometheus-node-exporter

# Enable node exporter
sudo systemctl enable --now prometheus-node-exporter

# Monitor disk usage on important paths
cat | sudo tee /usr/local/bin/check-build-server.sh << 'EOF'
#!/bin/bash
echo "=== Build Server Health Check ==="
echo "Date: $(date)"
echo ""
echo "--- CPU Load ---"
uptime

echo ""
echo "--- Memory Usage ---"
free -h

echo ""
echo "--- Disk Usage ---"
df -h /opt/build-cache /opt/workspaces /opt/artifacts /tmp/build

echo ""
echo "--- Active Build Processes ---"
ps aux | grep -E "(java|node|python|go|gradle|mvn)" | grep -v grep | wc -l
echo " active build processes"

echo ""
echo "--- Docker ---"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
EOF
sudo chmod +x /usr/local/bin/check-build-server.sh
```

## Summary

A well-configured Ubuntu build server is a significant productivity multiplier for development teams. The key components are: centralized toolchain installations with version management, shared caches to avoid redundant downloads, resource limits to prevent builds from starving each other, and organized workspace directories per project. Pair this infrastructure with any CI/CD system - Jenkins, Woodpecker, GitLab Runner - and you have a solid foundation for team builds that scale with your project load.
