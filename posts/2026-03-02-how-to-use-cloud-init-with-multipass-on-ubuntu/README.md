# How to Use cloud-init with Multipass on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Multipass, Cloud-init, Virtualization

Description: A practical guide to using cloud-init configurations with Multipass on Ubuntu to provision local virtual machines with custom software, users, and settings.

---

Multipass is Canonical's lightweight VM manager for Ubuntu. It spins up Ubuntu VMs quickly using cloud images and supports cloud-init for customizing those VMs at launch time. This combination gives you a local development and testing environment that closely mirrors what you'd do on a real cloud provider, without needing an AWS or Azure account.

## Installing Multipass

```bash
# Install Multipass via snap (recommended)
sudo snap install multipass

# Verify installation
multipass version

# Check system requirements are met
multipass info --all
```

Multipass uses the best available hypervisor for your platform - KVM on Linux, HyperKit on macOS, Hyper-V on Windows. On Ubuntu, it uses KVM by default.

## Basic Multipass Usage Without cloud-init

Before adding cloud-init, understand the basics:

```bash
# Launch a default Ubuntu instance
multipass launch --name myvm

# List running instances
multipass list

# Shell into an instance
multipass shell myvm

# Run a command in an instance
multipass exec myvm -- df -h

# Stop an instance
multipass stop myvm

# Start an instance
multipass start myvm

# Delete an instance
multipass delete myvm
multipass purge   # permanently remove deleted instances

# See available Ubuntu images
multipass find
```

## Passing cloud-init Configuration

Use the `--cloud-init` flag to pass a cloud-config file at launch time:

```bash
# Create a basic cloud-init config
cat > init.yaml << 'EOF'
#cloud-config

# Install packages
packages:
  - nginx
  - curl
  - git
  - htop

# Enable package updates
package_update: true
package_upgrade: true

# Create a user
users:
  - name: developer
    groups: [sudo]
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL

# Run commands after package installation
runcmd:
  - systemctl enable --now nginx
  - echo "Setup complete" > /etc/motd

EOF

# Launch with the cloud-init config
multipass launch --name devvm --cloud-init init.yaml

# Monitor progress
multipass exec devvm -- tail -f /var/log/cloud-init-output.log
```

## Practical Cloud-init Examples for Multipass

### Development Environment

```yaml
#cloud-config
# cloud-init config for a Node.js development VM

packages:
  - git
  - curl
  - build-essential

package_update: true

runcmd:
  # Install Node.js via NodeSource
  - curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  - apt-get install -y nodejs

  # Install global npm packages
  - npm install -g typescript ts-node nodemon

  # Install Docker
  - curl -fsSL https://get.docker.com | sh
  - usermod -aG docker ubuntu

write_files:
  - path: /home/ubuntu/.bashrc_custom
    content: |
      # Custom aliases
      alias ll='ls -alh'
      alias gs='git status'
      alias gc='git commit'
    owner: ubuntu:ubuntu

  - path: /etc/motd
    content: |
      Node.js Development VM
      Node: $(node --version)
      npm: $(npm --version)
```

### Database Server

```yaml
#cloud-config
# PostgreSQL server setup

packages:
  - postgresql
  - postgresql-contrib
  - python3-psycopg2

package_update: true

runcmd:
  # Configure PostgreSQL to accept local connections
  - systemctl enable --now postgresql

  # Create a development database and user
  - |
    sudo -u postgres psql << SQL
    CREATE USER devuser WITH PASSWORD 'devpassword';
    CREATE DATABASE devdb OWNER devuser;
    GRANT ALL PRIVILEGES ON DATABASE devdb TO devuser;
    SQL

  # Allow password authentication for local connections
  - sed -i "s/local   all             all                                     peer/local   all             all                                     md5/" /etc/postgresql/*/main/pg_hba.conf
  - systemctl restart postgresql

write_files:
  - path: /etc/postgresql/14/main/conf.d/custom.conf
    content: |
      # Allow connections from host network
      listen_addresses = '*'
      max_connections = 100
```

### Web Server with SSL

```yaml
#cloud-config
packages:
  - nginx
  - certbot
  - python3-certbot-nginx

package_update: true

write_files:
  - path: /etc/nginx/sites-available/myapp
    content: |
      server {
          listen 80;
          server_name _;

          location / {
              proxy_pass http://localhost:3000;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
          }
      }

runcmd:
  - rm -f /etc/nginx/sites-enabled/default
  - ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
  - nginx -t
  - systemctl enable --now nginx
```

## Specifying VM Resources

Multipass lets you control CPU, memory, and disk size:

```bash
# Launch with specific resources
multipass launch \
    --name webapp \
    --cpus 2 \
    --memory 4G \
    --disk 20G \
    --cloud-init init.yaml

# Specify Ubuntu version
multipass launch 22.04 \
    --name focal-vm \
    --cloud-init init.yaml

# Use a specific LTS version
multipass launch lts \
    --name lts-vm \
    --cloud-init init.yaml
```

## Checking cloud-init Progress

cloud-init runs asynchronously after Multipass launches the VM. The `multipass launch` command returns once the VM is up, but cloud-init may still be running.

```bash
# Wait for cloud-init to complete
multipass exec myvm -- cloud-init status --wait

# Watch the output log in real time
multipass exec myvm -- sudo tail -f /var/log/cloud-init-output.log

# Check final status
multipass exec myvm -- cloud-init status --long

# Look for errors
multipass exec myvm -- sudo grep -i error /var/log/cloud-init.log
```

## Mounting Host Directories

Combine cloud-init with Multipass mounts for a productive development workflow:

```bash
# Mount a local directory into the VM
multipass mount ~/projects/myapp myvm:/home/ubuntu/myapp

# The mount is persistent - it stays after restarts
multipass info myvm | grep Mount

# Unmount
multipass umount myvm:/home/ubuntu/myapp
```

Use cloud-init to set up the development environment and mounts to share code:

```bash
# Launch with dev environment setup
multipass launch \
    --name devvm \
    --cpus 2 \
    --memory 4G \
    --cloud-init dev-init.yaml

# Mount the project directory after launch
multipass mount ~/projects myvm:/home/ubuntu/projects
```

## Using cloud-init to Configure Networking

```yaml
#cloud-config
# Note: Multipass manages networking, but you can add extra config

# Set timezone
timezone: America/New_York

# Configure NTP
ntp:
  enabled: true
  servers:
    - 0.ubuntu.pool.ntp.org
    - 1.ubuntu.pool.ntp.org

# Set the hostname
hostname: my-dev-server
```

## Reusing cloud-init Configs Across Instances

Store your cloud-init configs in a git repository and reuse them:

```bash
# Directory structure
mkdir -p ~/multipass-configs
cd ~/multipass-configs

# Create config files
cat > nodejs-dev.yaml << 'EOF'
#cloud-config
packages: [git, build-essential, curl]
runcmd:
  - curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  - apt-get install -y nodejs
EOF

cat > python-dev.yaml << 'EOF'
#cloud-config
packages: [git, python3, python3-pip, python3-venv]
runcmd:
  - pip3 install virtualenv black isort pytest
EOF

# Launch different environments from saved configs
multipass launch --name node-vm --cloud-init ~/multipass-configs/nodejs-dev.yaml
multipass launch --name python-vm --cloud-init ~/multipass-configs/python-dev.yaml
```

## Debugging Failed cloud-init in Multipass

```bash
# Get into the VM even if cloud-init failed
multipass shell myvm

# Check what failed
sudo cloud-init status --long
sudo cat /var/log/cloud-init-output.log
sudo journalctl -u cloud-final.service

# Re-run cloud-init (useful for testing)
sudo cloud-init clean --logs
sudo cloud-init init
```

## Cleaning Up

```bash
# Stop and delete a VM
multipass stop myvm
multipass delete myvm

# Remove all deleted VMs permanently
multipass purge

# Delete all VMs at once
multipass delete --all
multipass purge
```

Multipass with cloud-init provides a fast, reproducible way to spin up Ubuntu VMs that mirror your cloud infrastructure. Keeping your cloud-init configs in version control means anyone on the team can recreate the exact same development environment in a few minutes.
