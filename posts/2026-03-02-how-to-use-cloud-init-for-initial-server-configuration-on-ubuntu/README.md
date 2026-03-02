# How to Use cloud-init for Initial Server Configuration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, cloud-init, Automation, DevOps, Cloud

Description: Use cloud-init on Ubuntu to automate first-boot server configuration including users, SSH keys, packages, and custom scripts across cloud and on-premise environments.

---

Cloud-init is the standard for automating initial server configuration at first boot. When you launch an Ubuntu instance on AWS, Azure, GCP, or any OpenStack environment, cloud-init runs before you can even log in. It reads configuration from a `user-data` document you provide at instance launch time, then sets up users, installs packages, configures networking, and runs arbitrary scripts.

Even outside of cloud environments, cloud-init works with on-premise virtualization platforms like VMware, KVM, and Proxmox, making it the right tool for automating server bootstrapping regardless of where your workloads run.

## How cloud-init Works

When an Ubuntu instance boots for the first time, cloud-init:

1. Detects the datasource (AWS metadata service, Azure IMDS, config drive, etc.)
2. Downloads and parses the user-data document
3. Executes configuration modules in order (users, packages, files, commands)
4. Records the result in `/var/log/cloud-init.log` and `/var/log/cloud-init-output.log`

It only runs on the first boot (based on `/var/lib/cloud/instance/` state). Subsequent reboots skip cloud-init unless you clear the state.

## User-Data Format

Cloud-init accepts several formats. The most common is cloud-config YAML, which must start with `#cloud-config`:

```yaml
#cloud-config
# This is a cloud-config document - starts with #cloud-config on the first line
# Whitespace and case matter in YAML
```

## Creating Users and SSH Keys

```yaml
#cloud-config

users:
  - name: deploy
    groups:
      - sudo
      - docker
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2EAAAA... user@workstation
      - ssh-ed25519 AAAAC3NzaC1lZDI1... user@laptop

  - name: monitoring
    groups: []
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1... monitoring@prometheus

# Disable root login
disable_root: true

# Disable password authentication for SSH
ssh_pwauth: false
```

## Installing Packages

```yaml
#cloud-config

# Update apt cache before installing
package_update: true

# Upgrade existing packages on first boot
package_upgrade: true

# Install specific packages
packages:
  - vim
  - curl
  - wget
  - htop
  - git
  - jq
  - unzip
  - fail2ban
  - chrony
  - ufw
  - docker.io
  - python3-pip
```

## Writing Files

```yaml
#cloud-config

write_files:
  # Configure sshd
  - path: /etc/ssh/sshd_config.d/hardening.conf
    owner: root:root
    permissions: '0644'
    content: |
      # Security hardening applied via cloud-init
      PermitRootLogin no
      PasswordAuthentication no
      PubkeyAuthentication yes
      MaxAuthTries 3
      AllowAgentForwarding no
      X11Forwarding no
      ClientAliveInterval 300
      ClientAliveCountMax 2

  # Sysctl tuning
  - path: /etc/sysctl.d/99-cloud-init.conf
    owner: root:root
    permissions: '0644'
    content: |
      # Network performance tuning
      net.core.somaxconn = 65535
      net.ipv4.tcp_max_syn_backlog = 8192
      net.ipv4.ip_forward = 0
      net.ipv4.conf.all.accept_redirects = 0
      net.ipv4.conf.all.send_redirects = 0
      vm.swappiness = 10

  # Application configuration
  - path: /etc/app/config.yaml
    owner: deploy:deploy
    permissions: '0640'
    content: |
      database:
        host: db.internal.example.com
        port: 5432
      cache:
        host: redis.internal.example.com
        port: 6379
```

## Running Commands

```yaml
#cloud-config

# runcmd runs commands after all other modules complete
# Commands run as root
runcmd:
  # Apply sysctl settings immediately
  - sysctl --system

  # Configure firewall
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp
  - ufw allow 443/tcp
  - ufw --force enable

  # Enable and start services
  - systemctl enable --now chrony
  - systemctl enable --now fail2ban

  # Add Docker repository and configure
  - usermod -aG docker deploy
  - systemctl enable --now docker

  # Download and run application setup
  - curl -sSL https://internal.example.com/setup.sh | bash

  # Set hostname to match tags (on AWS this pulls from metadata)
  - hostnamectl set-hostname $(curl -s http://169.254.169.254/latest/meta-data/tags/instance/Name 2>/dev/null || hostname)
```

## Using bootcmd for Early Boot Commands

`bootcmd` runs on every boot (not just first), before other cloud-init modules, and before packages are installed. Use it sparingly for low-level operations:

```yaml
#cloud-config

bootcmd:
  # Mount a dedicated partition before filesystem setup
  - [ cloud-init-per, once, format-data-disk, mkfs.xfs, /dev/xvdb ]
  - [ cloud-init-per, once, mount-data-disk, mkdir, -p, /data ]

  # The 'once' argument means this only runs on first boot despite bootcmd's every-boot nature
```

## Full Production Example

Here's a complete user-data that bootstraps a web application server:

```yaml
#cloud-config

# Metadata
hostname: webserver-prod-01
fqdn: webserver-prod-01.example.com
manage_etc_hosts: true

# Users
users:
  - name: deploy
    groups: [sudo, docker, www-data]
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1... ops@jump-server

# Disable root and password login
disable_root: true
ssh_pwauth: false

# Package management
package_update: true
package_upgrade: true

packages:
  - nginx
  - docker.io
  - docker-compose
  - fail2ban
  - chrony
  - ufw
  - logrotate
  - awscli

# Write configuration files
write_files:
  - path: /etc/nginx/sites-available/app
    content: |
      server {
          listen 80;
          server_name _;
          location / {
              proxy_pass http://127.0.0.1:3000;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
          }
      }
    permissions: '0644'

  - path: /etc/fail2ban/jail.local
    content: |
      [sshd]
      enabled = true
      maxretry = 5
      bantime = 3600
    permissions: '0644'

# Post-install commands
runcmd:
  # Firewall setup
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw --force enable

  # Enable nginx
  - ln -sf /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
  - rm -f /etc/nginx/sites-enabled/default
  - systemctl enable --now nginx

  # Docker and services
  - usermod -aG docker deploy
  - systemctl enable --now docker
  - systemctl enable --now fail2ban
  - systemctl enable --now chrony

  # Signal completion to a monitoring endpoint
  - 'curl -s -X POST https://deploy.example.com/webhook/server-ready -d "{\"host\":\"$(hostname)\"}"'
```

## Testing cloud-init Locally

Before deploying to production instances, test your user-data:

```bash
# Install cloud-init on a test VM
sudo apt install cloud-init -y

# Validate your user-data syntax
sudo cloud-init schema --config-file user-data.yaml

# Run cloud-init manually with a specific user-data file
sudo cloud-init --file user-data.yaml init

# Test specific modules
sudo cloud-init single --name users_groups
sudo cloud-init single --name packages

# Check what would run
sudo cloud-init devel schema --annotate --config-file user-data.yaml
```

## Debugging cloud-init Issues

```bash
# View full cloud-init log
sudo cat /var/log/cloud-init.log

# View command output from runcmd/bootcmd
sudo cat /var/log/cloud-init-output.log

# Check cloud-init status
cloud-init status --long

# See what datasource was detected
cloud-init query datasource

# Re-run cloud-init for testing (clears previous state)
sudo cloud-init clean --logs
sudo cloud-init init
sudo cloud-init modules --mode config
sudo cloud-init modules --mode final

# List all cloud-init phases
cloud-init analyze show
cloud-init analyze blame  # Shows which steps took longest
```

## Multi-Part User-Data

For complex deployments combining shell scripts with cloud-config:

```
Content-Type: multipart/mixed; boundary="BOUNDARY"
MIME-Version: 1.0

--BOUNDARY
Content-Type: text/cloud-config; charset="us-ascii"
MIME-Version: 1.0

#cloud-config
packages:
  - nginx

--BOUNDARY
Content-Type: text/x-shellscript; charset="us-ascii"
MIME-Version: 1.0

#!/bin/bash
# This shell script runs after the cloud-config section
echo "Custom deployment script running"
/usr/local/bin/deploy-app.sh

--BOUNDARY--
```

Cloud-init is the foundation of reproducible infrastructure. Combining it with your infrastructure-as-code tooling (Terraform, Pulumi) means every server starts in a known, documented state rather than being configured interactively after the fact.
