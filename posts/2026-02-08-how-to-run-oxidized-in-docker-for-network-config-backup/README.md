# How to Run Oxidized in Docker for Network Config Backup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Oxidized, Network Backup, Configuration Management, Git, Network Automation

Description: Deploy Oxidized in Docker to automatically back up network device configurations with Git versioning and change tracking.

---

Losing a network device configuration is one of those events that can turn a minor hardware failure into a major outage. Oxidized solves this problem by automatically connecting to your network devices, pulling their configurations, and storing them in a Git repository. Every configuration change gets committed with a timestamp, giving you a complete audit trail and the ability to roll back to any previous version.

Oxidized supports over 130 device types out of the box, including Cisco IOS, JunOS, Arista EOS, FortiOS, Palo Alto PAN-OS, MikroTik RouterOS, and many more. Running it in Docker keeps the installation clean and makes it easy to manage alongside your other infrastructure tools.

## How Oxidized Works

Oxidized runs on a schedule, typically every few hours. For each device in its inventory, it connects via SSH or Telnet, runs the appropriate commands to dump the configuration, and compares the output against the last known version. If anything changed, it commits the new configuration to a Git repository.

```mermaid
graph LR
    A[Oxidized] -->|SSH/Telnet| B[Router]
    A -->|SSH/Telnet| C[Switch]
    A -->|SSH/Telnet| D[Firewall]
    A --> E[Git Repository]
    E --> F[Local Git]
    E --> G[GitLab/GitHub]
    A --> H[Web UI]
    A --> I[REST API]
```

## Quick Start

Get Oxidized running with a minimal setup.

```bash
# Create directories for Oxidized configuration and data
mkdir -p /opt/oxidized/{config,output}

# Start Oxidized with default settings
docker run -d \
  --name oxidized \
  -p 8888:8888 \
  -v /opt/oxidized/config:/home/oxidized/.config/oxidized \
  -v /opt/oxidized/output:/home/oxidized/.config/oxidized/output \
  oxidized/oxidized:latest
```

## Docker Compose Setup

A production deployment benefits from Docker Compose with proper configuration management.

```yaml
# docker-compose.yml - Oxidized network config backup
# Includes the backup engine, web UI, and Git storage
version: "3.8"

services:
  oxidized:
    image: oxidized/oxidized:latest
    container_name: oxidized
    restart: unless-stopped
    ports:
      - "8888:8888"    # Web UI and REST API
    volumes:
      - ./config:/home/oxidized/.config/oxidized
      - oxidized-output:/home/oxidized/.config/oxidized/output
    environment:
      - CONFIG_RELOAD_INTERVAL=600
    networks:
      - oxidized-net

volumes:
  oxidized-output:

networks:
  oxidized-net:
    driver: bridge
```

## Configuration File

Oxidized uses a YAML configuration file. Create this as `config/config` (no extension).

```yaml
# config - Main Oxidized configuration file
# Controls how devices are accessed and where configs are stored

# How often to check for new configurations (in seconds)
# 3600 = every hour
interval: 3600

# Use syslog for logging
use_syslog: false
log: /home/oxidized/.config/oxidized/oxidized.log

# Debug mode (set to false in production)
debug: false

# Number of concurrent device connections
threads: 10

# Connection timeout in seconds
timeout: 30

# Number of retries on failure
retries: 3

# Default credentials for device access
username: backup_user
password: backup_password

# Prompt detection (regex patterns for device prompts)
# Most devices are detected automatically by the model

# Device inventory source - flat file
source:
  default: csv
  csv:
    file: /home/oxidized/.config/oxidized/router.db
    delimiter: ":"
    map:
      name: 0
      model: 1
      username: 2
      password: 3
    gpg: false

# Where to store the backed-up configurations
output:
  default: git
  git:
    user: "Oxidized"
    email: "oxidized@example.com"
    repo: /home/oxidized/.config/oxidized/output/configs.git

# REST API and web interface
rest: 0.0.0.0:8888

# Optional: push configs to a remote Git repository
# hooks:
#   push_to_remote:
#     type: githubrepo
#     events: [post_store]
#     remote_repo: "git@github.com:yourorg/network-configs.git"
#     publickey: /home/oxidized/.ssh/id_rsa.pub
#     privatekey: /home/oxidized/.ssh/id_rsa

# Model-specific configuration overrides
model_map:
  cisco: ios
  juniper: junos
  arista: eos
```

## Device Inventory

Create the device inventory file that tells Oxidized which devices to back up.

```bash
# router.db - Device inventory for Oxidized
# Format: hostname:model:username:password
# Each line represents one device to back up

# Cisco devices
core-router.example.com:ios:admin:cisco123
dist-switch-01.example.com:ios:admin:cisco123
dist-switch-02.example.com:ios:admin:cisco123
access-sw-floor1.example.com:ios:admin:cisco123
access-sw-floor2.example.com:ios:admin:cisco123

# Juniper devices
edge-router-01.example.com:junos:admin:juniper123
edge-router-02.example.com:junos:admin:juniper123

# Arista switches
spine-01.example.com:eos:admin:arista123
leaf-01.example.com:eos:admin:arista123
leaf-02.example.com:eos:admin:arista123

# Palo Alto firewalls
fw-primary.example.com:panos:admin:palo123
fw-secondary.example.com:panos:admin:palo123

# FortiGate firewalls
fortigate-01.example.com:fortios:admin:forti123

# MikroTik routers
branch-router.example.com:routeros:admin:mikrotik123
```

## Using a Database Source

For larger environments, pull the device inventory from a database or NetBox.

```yaml
# config - Using HTTP source (works with NetBox, phpIPAM, etc.)
source:
  default: http
  http:
    url: http://netbox.example.com/api/dcim/devices/?status=active&has_primary_ip=true
    scheme: https
    secure: false
    map:
      name: name
      model: platform.slug
      group: site.slug
    headers:
      Authorization: "Token YOUR_NETBOX_API_TOKEN"
    read_timeout: 120
    pagination: true
```

## Starting and Verifying Backups

```bash
# Start the Oxidized container
docker compose up -d

# Watch the logs to see backup progress
docker compose logs -f oxidized

# Trigger an immediate backup of all devices via the API
curl -X PUT http://localhost:8888/reload

# Trigger a backup of a specific device
curl -X PUT http://localhost:8888/node/next/core-router.example.com

# Check the status of all nodes
curl -s http://localhost:8888/nodes | python3 -m json.tool

# View a specific device's configuration
curl http://localhost:8888/node/fetch/core-router.example.com
```

## Browsing Configuration History

Since Oxidized stores configurations in Git, you can use standard Git commands to browse the history.

```bash
# Enter the Git repository directory
docker exec -it oxidized bash -c "cd /home/oxidized/.config/oxidized/output/configs.git && git log --oneline -20"

# View the configuration diff for a specific device
docker exec -it oxidized bash -c "cd /home/oxidized/.config/oxidized/output/configs.git && git log --oneline core-router.example.com"

# See what changed in the last commit for a device
docker exec -it oxidized bash -c "cd /home/oxidized/.config/oxidized/output/configs.git && git diff HEAD~1 HEAD -- core-router.example.com"

# Show the full configuration from a specific date
docker exec -it oxidized bash -c "cd /home/oxidized/.config/oxidized/output/configs.git && git show 'HEAD@{2026-02-01}:core-router.example.com'"
```

## Pushing to a Remote Repository

Keep an offsite copy of all configurations by pushing to a remote Git server.

```yaml
# Add to the Oxidized config file
hooks:
  push_to_remote:
    type: githubrepo
    events: [post_store]
    remote_repo: "git@gitlab.example.com:network/configs.git"
    publickey: /home/oxidized/.ssh/id_rsa.pub
    privatekey: /home/oxidized/.ssh/id_rsa
```

```bash
# Generate SSH keys for Git authentication
docker exec -it oxidized ssh-keygen -t ed25519 -N "" -f /home/oxidized/.ssh/id_rsa

# Display the public key to add to your Git server
docker exec -it oxidized cat /home/oxidized/.ssh/id_rsa.pub
```

## Setting Up Alerts

Get notified when configurations change or when backups fail.

```yaml
# Add webhook hooks to the Oxidized configuration
hooks:
  config_changed:
    type: exec
    events: [post_store]
    cmd: "/home/oxidized/.config/oxidized/notify.sh"
    async: true
    timeout: 30
```

```bash
#!/bin/bash
# notify.sh - Send an alert when a device configuration changes
# Called by Oxidized after storing a new configuration

OX_NODE_NAME=$OX_NODE_NAME
OX_NODE_FROM=$OX_NODE_FROM
OX_NODE_MSG=$OX_NODE_MSG
OX_EVENT=$OX_EVENT

# Send a Slack notification
curl -s -X POST "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"Network config change detected on ${OX_NODE_NAME}\",
    \"attachments\": [{
      \"color\": \"warning\",
      \"fields\": [
        {\"title\": \"Device\", \"value\": \"${OX_NODE_NAME}\", \"short\": true},
        {\"title\": \"Event\", \"value\": \"${OX_EVENT}\", \"short\": true}
      ]
    }]
  }"
```

## Securing Credentials

Avoid storing plaintext passwords in the inventory file. Use SSH keys or a credential vault.

```bash
# Generate an SSH key pair for device authentication
ssh-keygen -t ed25519 -N "" -f ./config/device_key

# Mount the key into the container
# Add to docker-compose.yml volumes:
# - ./config/device_key:/home/oxidized/.ssh/device_key:ro
```

Update the device inventory to reference SSH keys instead of passwords.

```yaml
# In the Oxidized config, set SSH key authentication
vars:
  ssh_keys: /home/oxidized/.ssh/device_key
```

## Monitoring Backup Health

Track backup success rates to catch issues like expired credentials or unreachable devices.

```bash
# Check which devices failed their last backup
curl -s http://localhost:8888/nodes | python3 -c "
import sys, json
nodes = json.load(sys.stdin)
for node in nodes:
    if node.get('last', {}).get('status') != 'success':
        print(f\"FAILED: {node['name']} - {node.get('last', {}).get('status', 'unknown')}\")"
```

## Production Tips

For production Oxidized deployments, create a dedicated read-only user on each network device specifically for configuration backups. Use SSH keys instead of passwords wherever possible. Run backups at least every 4 hours, or more frequently if your change management process requires it. Monitor backup success rates and alert on failures using OneUptime or similar tools. Keep the remote Git repository in a different location from your primary infrastructure for disaster recovery.

Oxidized in Docker provides automated, version-controlled backups of your entire network configuration. When a device fails or a bad change needs to be rolled back, you have the exact configuration ready to restore, along with a full history of every change that was ever made.
