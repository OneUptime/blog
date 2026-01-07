# How to Set Up a Self-Hosted GitHub Actions Runner on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, GitHub Actions, CI/CD, DevOps

Description: Set up a self-hosted GitHub Actions runner on Ubuntu for faster builds, private network access, and custom environments.

---

GitHub Actions has revolutionized continuous integration and continuous deployment (CI/CD) workflows for developers worldwide. While GitHub-hosted runners provide a convenient way to execute workflows, self-hosted runners offer significant advantages in terms of performance, customization, and cost control. This comprehensive guide walks you through setting up, configuring, and managing self-hosted GitHub Actions runners on Ubuntu.

## Why Use Self-Hosted Runners?

Before diving into the setup process, let's understand why you might choose self-hosted runners over GitHub-hosted alternatives.

### Performance Benefits

Self-hosted runners can significantly reduce build times by:

- **Eliminating cold start delays**: GitHub-hosted runners spin up fresh VMs for each job, while self-hosted runners are always ready
- **Leveraging cached dependencies**: Persistent storage means dependencies remain between builds
- **Using higher-spec hardware**: You control the CPU, RAM, and storage specifications
- **Reducing network latency**: Runners in your network have faster access to internal resources

### Cost Optimization

For organizations with high CI/CD usage, self-hosted runners can reduce costs:

- No per-minute billing for workflow execution
- Utilize existing infrastructure and hardware
- Better resource utilization through shared runners
- Predictable monthly costs instead of variable billing

### Custom Environment Control

Self-hosted runners provide complete control over the execution environment:

- Install specific software versions and dependencies
- Access private network resources and databases
- Use specialized hardware (GPUs, custom architectures)
- Maintain consistent environments across all jobs

### Security and Compliance

For organizations with strict security requirements:

- Keep code and artifacts within your network
- Implement custom security policies
- Meet data residency requirements
- Control network access and firewall rules

## Prerequisites

Before setting up your self-hosted runner, ensure you have:

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS (64-bit)
- Administrative (sudo) access to the machine
- GitHub repository, organization, or enterprise admin access
- Stable network connection
- At least 2 GB of RAM and 14 GB of storage space

## Installing the GitHub Actions Runner

### Step 1: Create a Dedicated User

Create a dedicated non-root user to run the GitHub Actions runner service securely.

```bash
# Create a new user for running GitHub Actions
# Using a dedicated user improves security by limiting permissions
sudo useradd -m -s /bin/bash github-runner

# Add the user to the sudo group for administrative tasks if needed
sudo usermod -aG sudo github-runner

# Set a password for the new user
sudo passwd github-runner
```

### Step 2: Prepare the System

Update your system and install required dependencies.

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install essential dependencies required by the runner
# These packages handle networking, SSL, and other core functions
sudo apt install -y \
    curl \
    jq \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3 \
    python3-venv \
    python3-dev \
    libicu-dev
```

### Step 3: Download the Runner Package

Navigate to your GitHub repository or organization settings to get the runner download URL. The following commands show the general process.

```bash
# Switch to the github-runner user
sudo su - github-runner

# Create and navigate to the actions-runner directory
mkdir actions-runner && cd actions-runner

# Download the latest runner package
# Replace the URL with the one from your GitHub settings
# GitHub provides this URL in Settings > Actions > Runners > New self-hosted runner
curl -o actions-runner-linux-x64-2.321.0.tar.gz -L \
    https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz

# Verify the package integrity using SHA256 checksum
# Replace the hash with the one provided by GitHub
echo "ba46ba7ce3a4d7236b16fbe44419fb453bc08f866b24f04d549ec89f1722a29e  actions-runner-linux-x64-2.321.0.tar.gz" | shasum -a 256 -c

# Extract the runner package
tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz
```

### Step 4: Configure the Runner

Register your runner with GitHub using the configuration script.

```bash
# Run the configuration script
# Replace OWNER/REPO with your repository path
# Replace YOUR_TOKEN with the registration token from GitHub
# The token is available in Settings > Actions > Runners > New self-hosted runner
./config.sh --url https://github.com/OWNER/REPO --token YOUR_TOKEN

# During configuration, you'll be prompted for:
# - Runner group (default for repository runners)
# - Runner name (defaults to machine hostname)
# - Runner labels (additional labels for targeting)
# - Work folder (defaults to _work)
```

### Step 5: Test the Runner

Before setting up as a service, test the runner manually.

```bash
# Start the runner interactively to verify it works
# Press Ctrl+C to stop when done testing
./run.sh
```

## Running as a systemd Service

For production use, configure the runner as a systemd service that starts automatically on boot.

### Using the Built-in Service Script

GitHub provides a script to install the runner as a service.

```bash
# Exit to the root user or use sudo
exit

# Navigate to the runner directory
cd /home/github-runner/actions-runner

# Install the service using the provided script
# This creates a systemd service file automatically
sudo ./svc.sh install github-runner

# Start the runner service
sudo ./svc.sh start

# Check the service status
sudo ./svc.sh status
```

### Creating a Custom systemd Service

For more control, create a custom systemd service file.

```bash
# Create a custom systemd service file for the GitHub Actions runner
sudo tee /etc/systemd/system/github-runner.service > /dev/null << 'EOF'
[Unit]
Description=GitHub Actions Runner
After=network.target

[Service]
# Run as the dedicated github-runner user
User=github-runner
Group=github-runner

# Set the working directory to the runner installation
WorkingDirectory=/home/github-runner/actions-runner

# Execute the runner script
ExecStart=/home/github-runner/actions-runner/run.sh

# Restart the service if it fails
Restart=always
RestartSec=10

# Environment variables for the runner
Environment="RUNNER_ALLOW_RUNASROOT=0"

# Security hardening options
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/github-runner/actions-runner

# Resource limits
MemoryMax=4G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
EOF
```

### Managing the systemd Service

```bash
# Reload systemd to recognize the new service file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable github-runner

# Start the service
sudo systemctl start github-runner

# Check the service status
sudo systemctl status github-runner

# View service logs in real-time
sudo journalctl -u github-runner -f

# Stop the service
sudo systemctl stop github-runner

# Restart the service after configuration changes
sudo systemctl restart github-runner
```

## Configuring Runner Groups and Labels

Labels and groups help you target specific runners for different workflows.

### Understanding Runner Labels

Labels allow you to route jobs to specific runners based on their capabilities.

```bash
# During configuration, add custom labels
./config.sh --url https://github.com/OWNER/REPO \
    --token YOUR_TOKEN \
    --labels ubuntu-22.04,docker,gpu,high-memory

# Default labels added automatically:
# - self-hosted
# - Linux
# - X64 (or ARM64 for ARM systems)
```

### Using Labels in Workflows

Target your self-hosted runners using labels in your workflow files.

```yaml
# Example workflow targeting a self-hosted runner with specific labels
# .github/workflows/build.yml
name: Build Application

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    # Target runners with all specified labels
    # The job runs only on runners that have ALL these labels
    runs-on: [self-hosted, Linux, X64, docker]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build application
        run: |
          echo "Running on self-hosted runner"
          echo "Hostname: $(hostname)"
```

### Using Label Expressions

GitHub Actions supports expressions for more flexible runner selection.

```yaml
jobs:
  build:
    # Use any runner that matches the expression
    runs-on:
      group: production-runners
      labels: [self-hosted, Linux]

    steps:
      - name: Checkout
        uses: actions/checkout@v4
```

### Runner Groups (Organization/Enterprise)

For organizations and enterprises, runner groups provide access control.

```bash
# Configure a runner for a specific group
./config.sh --url https://github.com/ORGANIZATION \
    --token YOUR_TOKEN \
    --runnergroup "Production Runners" \
    --labels production,docker

# Runner groups allow you to:
# - Restrict which repositories can use specific runners
# - Set permissions for who can manage runners
# - Organize runners by environment or purpose
```

## Docker Support Configuration

Many CI/CD workflows require Docker for building and testing containerized applications.

### Installing Docker

```bash
# Remove any old Docker installations
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Install prerequisites for Docker repository
sudo apt update
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository to apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and related tools
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Configuring Docker for the Runner

```bash
# Add the github-runner user to the docker group
# This allows the runner to execute Docker commands without sudo
sudo usermod -aG docker github-runner

# Verify Docker installation
sudo -u github-runner docker run hello-world

# If you're using the systemd service, restart it to apply group changes
sudo systemctl restart github-runner
```

### Docker Daemon Configuration

Optimize Docker for CI/CD workloads with custom configuration.

```bash
# Create Docker daemon configuration for CI/CD optimization
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "live-restore": true,
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 65536,
            "Soft": 65536
        }
    },
    "builder": {
        "gc": {
            "enabled": true,
            "defaultKeepStorage": "20GB"
        }
    }
}
EOF

# Restart Docker to apply changes
sudo systemctl restart docker

# Enable Docker to start on boot
sudo systemctl enable docker
```

### Docker Cache Management

Implement cache cleanup to prevent disk space issues.

```bash
# Create a script for Docker cleanup
sudo tee /usr/local/bin/docker-cleanup.sh > /dev/null << 'EOF'
#!/bin/bash
# Docker cleanup script for GitHub Actions runners
# Removes unused containers, images, networks, and build cache

echo "Starting Docker cleanup..."

# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f --filter "until=168h"

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f

# Remove build cache older than 7 days
docker builder prune -a -f --filter "until=168h"

# Display disk usage after cleanup
echo "Docker disk usage after cleanup:"
docker system df

echo "Docker cleanup completed."
EOF

# Make the script executable
sudo chmod +x /usr/local/bin/docker-cleanup.sh

# Create a cron job to run cleanup daily at 3 AM
echo "0 3 * * * root /usr/local/bin/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1" | \
    sudo tee /etc/cron.d/docker-cleanup
```

## Security Considerations

Self-hosted runners require careful security considerations to protect your infrastructure.

### Network Security

```bash
# Configure UFW firewall for the runner
# Allow only necessary outbound connections
sudo apt install -y ufw

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH for management (adjust port if needed)
sudo ufw allow 22/tcp

# Enable the firewall
sudo ufw enable

# Check firewall status
sudo ufw status verbose
```

### Runner Security Hardening

```bash
# Create a security configuration script for the runner
sudo tee /usr/local/bin/harden-runner.sh > /dev/null << 'EOF'
#!/bin/bash
# Security hardening script for GitHub Actions runner

# Restrict access to the runner directory
chmod 750 /home/github-runner/actions-runner
chown -R github-runner:github-runner /home/github-runner/actions-runner

# Ensure the runner doesn't run as root
if [ -f /home/github-runner/actions-runner/.runner ]; then
    owner=$(stat -c '%U' /home/github-runner/actions-runner/.runner)
    if [ "$owner" == "root" ]; then
        echo "ERROR: Runner files owned by root. Fixing..."
        chown -R github-runner:github-runner /home/github-runner/actions-runner
    fi
fi

# Set secure permissions on sensitive files
chmod 600 /home/github-runner/actions-runner/.credentials 2>/dev/null
chmod 600 /home/github-runner/actions-runner/.credentials_rsaparams 2>/dev/null

echo "Security hardening completed."
EOF

sudo chmod +x /usr/local/bin/harden-runner.sh
```

### Repository Security Best Practices

When using self-hosted runners, follow these security guidelines:

```yaml
# Example workflow with security-conscious practices
# .github/workflows/secure-build.yml
name: Secure Build Pipeline

on:
  push:
    branches: [main]
  # Be cautious with pull_request_target as it runs with write permissions
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: [self-hosted, Linux, X64]

    # Set restrictive permissions
    permissions:
      contents: read
      packages: write

    # Set a timeout to prevent runaway jobs
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          # Limit fetch depth for faster clones
          fetch-depth: 1

      - name: Setup environment
        run: |
          # Validate environment before proceeding
          echo "Runner: ${{ runner.name }}"
          echo "OS: ${{ runner.os }}"

      - name: Build with limited permissions
        run: |
          # Run build commands as non-root user
          whoami
          ./build.sh
        env:
          # Avoid exposing secrets in logs
          NODE_ENV: production
```

### Secrets and Environment Variables

Protect sensitive data in your workflows.

```bash
# Create an environment file for runner-specific secrets
# This file should have restricted permissions
sudo tee /home/github-runner/actions-runner/.env > /dev/null << 'EOF'
# Runner environment configuration
# These values are available to all jobs on this runner
RUNNER_ENVIRONMENT=production
INTERNAL_API_ENDPOINT=https://internal.example.com
EOF

# Secure the environment file
sudo chown github-runner:github-runner /home/github-runner/actions-runner/.env
sudo chmod 600 /home/github-runner/actions-runner/.env
```

### Audit Logging

Enable comprehensive logging for security audits.

```bash
# Configure detailed logging for the runner service
sudo mkdir -p /var/log/github-runner

# Create a logrotate configuration for runner logs
sudo tee /etc/logrotate.d/github-runner > /dev/null << 'EOF'
/var/log/github-runner/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 github-runner github-runner
    postrotate
        systemctl reload github-runner > /dev/null 2>&1 || true
    endscript
}
EOF
```

## Auto-Scaling with Multiple Runners

For organizations with variable workloads, auto-scaling runners can optimize resource usage and reduce wait times.

### Setting Up Multiple Static Runners

```bash
# Script to set up multiple runners on a single machine
# Useful for machines with high CPU/memory resources
sudo tee /usr/local/bin/setup-multi-runner.sh > /dev/null << 'EOF'
#!/bin/bash
# Setup multiple GitHub Actions runners on a single machine

set -e

# Configuration
GITHUB_URL="${1:-https://github.com/OWNER/REPO}"
RUNNER_TOKEN="${2}"
NUM_RUNNERS="${3:-4}"
BASE_DIR="/home/github-runner"

if [ -z "$RUNNER_TOKEN" ]; then
    echo "Usage: $0 <github_url> <token> [num_runners]"
    exit 1
fi

for i in $(seq 1 $NUM_RUNNERS); do
    RUNNER_NAME="runner-$(hostname)-$i"
    RUNNER_DIR="$BASE_DIR/actions-runner-$i"

    echo "Setting up $RUNNER_NAME..."

    # Create runner directory
    sudo -u github-runner mkdir -p "$RUNNER_DIR"

    # Extract runner package
    sudo -u github-runner tar xzf "$BASE_DIR/actions-runner-linux-x64-2.321.0.tar.gz" \
        -C "$RUNNER_DIR"

    # Configure the runner
    cd "$RUNNER_DIR"
    sudo -u github-runner ./config.sh \
        --url "$GITHUB_URL" \
        --token "$RUNNER_TOKEN" \
        --name "$RUNNER_NAME" \
        --labels "multi-runner,runner-$i" \
        --unattended

    # Create systemd service for this runner
    sudo tee "/etc/systemd/system/github-runner-$i.service" > /dev/null << INNEREOF
[Unit]
Description=GitHub Actions Runner $i
After=network.target

[Service]
User=github-runner
Group=github-runner
WorkingDirectory=$RUNNER_DIR
ExecStart=$RUNNER_DIR/run.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
INNEREOF

    # Enable and start the service
    sudo systemctl daemon-reload
    sudo systemctl enable "github-runner-$i"
    sudo systemctl start "github-runner-$i"

    echo "$RUNNER_NAME setup complete."
done

echo "All $NUM_RUNNERS runners have been configured."
EOF

sudo chmod +x /usr/local/bin/setup-multi-runner.sh
```

### Dynamic Auto-Scaling with Webhooks

Create a webhook-based auto-scaling solution.

```bash
# Create a simple auto-scaling controller script
sudo tee /usr/local/bin/runner-autoscaler.py > /dev/null << 'EOF'
#!/usr/bin/env python3
"""
GitHub Actions Runner Auto-Scaler
Monitors workflow queue and scales runners dynamically
"""

import os
import sys
import json
import time
import subprocess
import requests
from datetime import datetime

# Configuration from environment variables
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')
GITHUB_ORG = os.environ.get('GITHUB_ORG')
MIN_RUNNERS = int(os.environ.get('MIN_RUNNERS', 1))
MAX_RUNNERS = int(os.environ.get('MAX_RUNNERS', 10))
SCALE_UP_THRESHOLD = int(os.environ.get('SCALE_UP_THRESHOLD', 5))
SCALE_DOWN_THRESHOLD = int(os.environ.get('SCALE_DOWN_THRESHOLD', 0))
CHECK_INTERVAL = int(os.environ.get('CHECK_INTERVAL', 60))

def get_queued_jobs():
    """Get the number of queued workflow jobs"""
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }

    url = f'https://api.github.com/orgs/{GITHUB_ORG}/actions/runners'
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"Error fetching runners: {response.status_code}")
        return 0, 0

    data = response.json()
    total_runners = data.get('total_count', 0)
    busy_runners = sum(1 for r in data.get('runners', []) if r.get('busy', False))

    return total_runners, busy_runners

def get_active_runners():
    """Get count of active runner services"""
    result = subprocess.run(
        ['systemctl', 'list-units', '--type=service', '--state=running',
         '--no-pager', '--no-legend'],
        capture_output=True, text=True
    )

    count = sum(1 for line in result.stdout.split('\n')
                if 'github-runner' in line)
    return count

def scale_up():
    """Start an additional runner"""
    current = get_active_runners()
    if current >= MAX_RUNNERS:
        print(f"Already at max runners ({MAX_RUNNERS})")
        return False

    next_runner = current + 1
    service_name = f'github-runner-{next_runner}'

    subprocess.run(['sudo', 'systemctl', 'start', service_name])
    print(f"Started {service_name}")
    return True

def scale_down():
    """Stop the highest numbered runner"""
    current = get_active_runners()
    if current <= MIN_RUNNERS:
        print(f"Already at min runners ({MIN_RUNNERS})")
        return False

    service_name = f'github-runner-{current}'

    subprocess.run(['sudo', 'systemctl', 'stop', service_name])
    print(f"Stopped {service_name}")
    return True

def main():
    """Main auto-scaling loop"""
    print("GitHub Actions Runner Auto-Scaler Started")
    print(f"Min: {MIN_RUNNERS}, Max: {MAX_RUNNERS}")

    while True:
        try:
            total, busy = get_queued_jobs()
            active = get_active_runners()
            idle = active - busy

            print(f"[{datetime.now()}] Active: {active}, Busy: {busy}, Idle: {idle}")

            # Scale up if all runners are busy and we have queued jobs
            if idle == 0 and busy >= active:
                print("Scaling up: All runners busy")
                scale_up()

            # Scale down if we have too many idle runners
            elif idle > SCALE_DOWN_THRESHOLD and active > MIN_RUNNERS:
                print(f"Scaling down: {idle} idle runners")
                scale_down()

        except Exception as e:
            print(f"Error in auto-scaler: {e}")

        time.sleep(CHECK_INTERVAL)

if __name__ == '__main__':
    main()
EOF

sudo chmod +x /usr/local/bin/runner-autoscaler.py
```

### Container-Based Auto-Scaling

Use Docker containers for ephemeral runners.

```bash
# Dockerfile for ephemeral GitHub Actions runner
sudo tee /home/github-runner/Dockerfile.runner > /dev/null << 'EOF'
FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    git \
    sudo \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Create runner user
RUN useradd -m -s /bin/bash runner && \
    usermod -aG docker runner && \
    echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set working directory
WORKDIR /home/runner

# Download runner
ARG RUNNER_VERSION=2.321.0
RUN curl -o actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz -L \
    https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz && \
    tar xzf actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz && \
    rm actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz && \
    chown -R runner:runner /home/runner

# Install runner dependencies
RUN ./bin/installdependencies.sh

# Switch to runner user
USER runner

# Entrypoint script configures and runs the runner
COPY --chown=runner:runner entrypoint.sh /home/runner/entrypoint.sh
RUN chmod +x /home/runner/entrypoint.sh

ENTRYPOINT ["/home/runner/entrypoint.sh"]
EOF

# Create entrypoint script for the container
sudo tee /home/github-runner/entrypoint.sh > /dev/null << 'EOF'
#!/bin/bash
set -e

# Required environment variables
: "${GITHUB_URL:?GITHUB_URL is required}"
: "${RUNNER_TOKEN:?RUNNER_TOKEN is required}"

# Optional environment variables with defaults
RUNNER_NAME="${RUNNER_NAME:-$(hostname)}"
RUNNER_LABELS="${RUNNER_LABELS:-docker,ephemeral}"
RUNNER_GROUP="${RUNNER_GROUP:-Default}"

# Configure the runner
./config.sh \
    --url "${GITHUB_URL}" \
    --token "${RUNNER_TOKEN}" \
    --name "${RUNNER_NAME}" \
    --labels "${RUNNER_LABELS}" \
    --runnergroup "${RUNNER_GROUP}" \
    --ephemeral \
    --unattended

# Cleanup function
cleanup() {
    echo "Removing runner..."
    ./config.sh remove --token "${RUNNER_TOKEN}" || true
}

trap cleanup EXIT

# Run the runner
./run.sh
EOF

sudo chown github-runner:github-runner /home/github-runner/entrypoint.sh
```

### Docker Compose for Multiple Runners

```yaml
# docker-compose.yml for running multiple ephemeral runners
# Save this in /home/github-runner/docker-compose.yml
version: '3.8'

services:
  runner:
    build:
      context: .
      dockerfile: Dockerfile.runner
    environment:
      - GITHUB_URL=${GITHUB_URL}
      - RUNNER_TOKEN=${RUNNER_TOKEN}
      - RUNNER_LABELS=docker,ephemeral
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '0.5'
          memory: 512M
    restart: unless-stopped
```

## Monitoring and Maintenance

Keep your runners healthy with proper monitoring and maintenance.

### Health Check Script

```bash
# Create a health check script for the runner
sudo tee /usr/local/bin/runner-health-check.sh > /dev/null << 'EOF'
#!/bin/bash
# GitHub Actions Runner Health Check Script

# Configuration
RUNNER_DIR="/home/github-runner/actions-runner"
LOG_FILE="/var/log/github-runner/health-check.log"
ALERT_EMAIL="admin@example.com"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_service() {
    if systemctl is-active --quiet github-runner; then
        log "Service Status: RUNNING"
        return 0
    else
        log "Service Status: STOPPED"
        return 1
    fi
}

check_disk_space() {
    local usage=$(df -h "$RUNNER_DIR" | awk 'NR==2 {print $5}' | tr -d '%')
    if [ "$usage" -gt 85 ]; then
        log "WARNING: Disk usage at ${usage}%"
        return 1
    fi
    log "Disk Usage: ${usage}%"
    return 0
}

check_memory() {
    local available=$(free -m | awk 'NR==2 {print $7}')
    if [ "$available" -lt 500 ]; then
        log "WARNING: Low memory - ${available}MB available"
        return 1
    fi
    log "Available Memory: ${available}MB"
    return 0
}

check_docker() {
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            log "Docker Status: RUNNING"
            return 0
        else
            log "Docker Status: NOT RESPONDING"
            return 1
        fi
    fi
    log "Docker: NOT INSTALLED"
    return 0
}

# Run all checks
log "=== Health Check Started ==="

ERRORS=0
check_service || ((ERRORS++))
check_disk_space || ((ERRORS++))
check_memory || ((ERRORS++))
check_docker || ((ERRORS++))

if [ $ERRORS -gt 0 ]; then
    log "Health Check: FAILED ($ERRORS issues)"
    # Send alert (configure mail or use alternative notification)
    # echo "Runner health check failed" | mail -s "Runner Alert" "$ALERT_EMAIL"
    exit 1
fi

log "Health Check: PASSED"
exit 0
EOF

sudo chmod +x /usr/local/bin/runner-health-check.sh

# Schedule health checks every 5 minutes
echo "*/5 * * * * root /usr/local/bin/runner-health-check.sh" | \
    sudo tee /etc/cron.d/runner-health-check
```

### Updating the Runner

```bash
# Script to update the GitHub Actions runner
sudo tee /usr/local/bin/update-runner.sh > /dev/null << 'EOF'
#!/bin/bash
# Update GitHub Actions Runner to the latest version

set -e

RUNNER_DIR="/home/github-runner/actions-runner"
RUNNER_USER="github-runner"

# Get the latest version from GitHub API
LATEST_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | \
    jq -r '.tag_name' | tr -d 'v')

# Get current version
CURRENT_VERSION=$("$RUNNER_DIR/config.sh" --version 2>/dev/null || echo "0.0.0")

echo "Current version: $CURRENT_VERSION"
echo "Latest version: $LATEST_VERSION"

if [ "$CURRENT_VERSION" == "$LATEST_VERSION" ]; then
    echo "Runner is already up to date."
    exit 0
fi

echo "Updating runner from $CURRENT_VERSION to $LATEST_VERSION..."

# Stop the runner service
sudo systemctl stop github-runner

# Backup current installation
sudo -u "$RUNNER_USER" cp -r "$RUNNER_DIR" "${RUNNER_DIR}.backup"

# Download and extract new version
cd /tmp
curl -o "actions-runner-linux-x64-${LATEST_VERSION}.tar.gz" -L \
    "https://github.com/actions/runner/releases/download/v${LATEST_VERSION}/actions-runner-linux-x64-${LATEST_VERSION}.tar.gz"

sudo -u "$RUNNER_USER" tar xzf "actions-runner-linux-x64-${LATEST_VERSION}.tar.gz" -C "$RUNNER_DIR" --overwrite

# Cleanup
rm "actions-runner-linux-x64-${LATEST_VERSION}.tar.gz"

# Start the runner service
sudo systemctl start github-runner

echo "Runner updated successfully to version $LATEST_VERSION"
EOF

sudo chmod +x /usr/local/bin/update-runner.sh
```

## Troubleshooting Common Issues

### Runner Not Connecting

```bash
# Check runner service status and logs
sudo systemctl status github-runner
sudo journalctl -u github-runner -n 100 --no-pager

# Verify network connectivity to GitHub
curl -I https://github.com
curl -I https://api.github.com

# Check if the runner is properly registered
cat /home/github-runner/actions-runner/.runner
```

### Permission Issues

```bash
# Fix ownership of runner directory
sudo chown -R github-runner:github-runner /home/github-runner/actions-runner

# Fix work directory permissions
sudo chmod -R 755 /home/github-runner/actions-runner/_work

# Check SELinux/AppArmor status (if applicable)
sestatus 2>/dev/null || aa-status 2>/dev/null
```

### Docker Socket Issues

```bash
# Verify Docker socket permissions
ls -la /var/run/docker.sock

# Add runner user to docker group
sudo usermod -aG docker github-runner

# Restart services to apply group changes
sudo systemctl restart docker
sudo systemctl restart github-runner

# Test Docker access as runner user
sudo -u github-runner docker ps
```

### Cleaning Up Failed Runs

```bash
# Remove stale work directories from failed jobs
sudo rm -rf /home/github-runner/actions-runner/_work/_temp/*

# Clean up Docker artifacts
docker system prune -af

# Remove orphaned processes
pkill -u github-runner -f "Runner.Worker"
```

## Conclusion

Setting up self-hosted GitHub Actions runners on Ubuntu provides significant benefits for organizations that need more control, performance, and cost efficiency in their CI/CD pipelines. By following this guide, you have learned how to:

1. Install and configure a GitHub Actions runner on Ubuntu
2. Run the runner as a systemd service for reliability
3. Use labels and groups to organize and target runners
4. Configure Docker support for containerized workflows
5. Implement security best practices to protect your infrastructure
6. Set up auto-scaling to handle variable workloads
7. Monitor and maintain runners for optimal performance

Self-hosted runners are particularly valuable when you need access to private network resources, require specialized hardware, or want to reduce CI/CD costs at scale. With proper configuration and maintenance, they can provide a robust foundation for your development workflow.

Remember to regularly update your runners, monitor their health, and follow security best practices to ensure a secure and efficient CI/CD environment.

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Self-hosted Runner Documentation](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Runner Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Ubuntu Server Documentation](https://ubuntu.com/server/docs)
