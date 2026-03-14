# How to Understand cloud-init and How It Works on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cloud-init, Cloud, Infrastructure

Description: A detailed explanation of cloud-init on Ubuntu - how it bootstraps cloud instances, its execution stages, data sources, and the configuration format it accepts.

---

When you launch an Ubuntu instance on AWS, Azure, GCP, or any cloud platform, the machine boots without manual intervention and comes up configured with your SSH keys, hostname, and any other settings you specified. That process is handled by cloud-init. Understanding how cloud-init works helps you write better user data scripts, debug startup failures, and customize images for your own infrastructure.

## What cloud-init Does

cloud-init is an industry-standard tool for cross-platform cloud instance initialization. On Ubuntu cloud images, it runs during the very first boot (and to a lesser extent on subsequent boots) and performs tasks like:

- Setting the hostname
- Configuring network interfaces
- Injecting SSH public keys into user accounts
- Creating additional users and groups
- Installing packages
- Writing files to disk
- Running arbitrary scripts
- Mounting additional storage
- Sending boot status signals back to the cloud provider

## Installation

Ubuntu cloud images ship with cloud-init pre-installed. On a regular Ubuntu install, you can add it:

```bash
# Install cloud-init
sudo apt update
sudo apt install -y cloud-init

# Check the version
cloud-init --version
```

## Data Sources

cloud-init needs to know where to fetch its configuration from. Different cloud providers expose configuration through different mechanisms, called data sources. Common data sources include:

- **NoCloud** - reads from local files or an ISO (used for VMs and testing)
- **EC2** - AWS instance metadata service at 169.254.169.254
- **Azure** - Azure IMDS and fabric agent
- **GCE** - Google Compute Engine metadata server
- **OpenStack** - OpenStack metadata API
- **OVF** - VMware-style Open Virtualization Format CD-ROM

The data source provides two categories of data:

1. **Instance metadata** - machine-specific info like instance ID, hostname, region
2. **User data** - your configuration scripts and cloud-config files

You can check which data source cloud-init detected:

```bash
# Show the detected data source
cloud-init query ds

# Show all available instance data
cloud-init query --all

# Show a specific field
cloud-init query local-hostname
cloud-init query public_ssh_keys
```

## Execution Stages

cloud-init runs in multiple stages across the boot process. Understanding these stages explains why certain configurations happen at particular times.

### Stage 1: Generator (systemd-generator)

Before systemd targets start, a generator determines whether cloud-init should run and which systemd targets to create. This stage is mostly transparent to users.

### Stage 2: Local (cloud-init-local.service)

Runs before networking is configured. Its job is to configure the network itself. It reads local data sources (like NoCloud from a mounted drive) and writes network configuration that systemd-networkd or netplan will use.

```bash
# Check the status of this stage
systemctl status cloud-init-local.service
```

### Stage 3: Network (cloud-init.service)

Runs after networking is up. This is where cloud-init fetches data from network-based data sources (the AWS metadata service, for example). It processes the `cloud_init_modules` section of the configuration.

```bash
systemctl status cloud-init.service
```

### Stage 4: Config (cloud-config.service)

Runs the `cloud_config_modules` - things like setting the hostname, configuring NTP, installing packages, and managing users.

```bash
systemctl status cloud-config.service
```

### Stage 5: Final (cloud-final.service)

The last stage. Runs user scripts, configuration management tools (Puppet, Chef, Ansible), and any other final configuration. This is where `runcmd` and `bootcmd` directives run.

```bash
systemctl status cloud-final.service
```

## Cloud Config Format

User data passed to cloud-init is typically in the cloud-config format, a YAML structure recognized by the `#cloud-config` header:

```yaml
#cloud-config
# This header is mandatory - cloud-init ignores files without it

# Set the hostname
hostname: myserver
fqdn: myserver.example.com

# Create users
users:
  - name: deploy
    groups: [sudo, docker]
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3Nz... user@laptop

# Install packages
packages:
  - nginx
  - postgresql
  - python3-pip

# Update and upgrade on first boot
package_update: true
package_upgrade: true

# Write files to disk
write_files:
  - path: /etc/nginx/conf.d/myapp.conf
    content: |
      server {
          listen 80;
          server_name example.com;
          location / {
              proxy_pass http://localhost:3000;
          }
      }
    owner: root:root
    permissions: '0644'

# Run commands after everything else
runcmd:
  - systemctl restart nginx
  - systemctl enable nginx
```

## Configuration File Locations

cloud-init reads configuration from multiple places, merged in order:

```bash
# Main cloud-init configuration
cat /etc/cloud/cloud.cfg

# Drop-in configuration directory
ls /etc/cloud/cloud.cfg.d/

# Logs
cat /var/log/cloud-init.log
cat /var/log/cloud-init-output.log

# Instance-specific data (fetched from data source)
ls /run/cloud-init/
ls /var/lib/cloud/instance/
```

The `/var/lib/cloud/` directory stores persistent state between reboots:

```bash
# Instance ID - changes force a re-run
cat /var/lib/cloud/instance/id

# Scripts that ran
ls /var/lib/cloud/instance/scripts/

# User data as received
cat /var/lib/cloud/instance/user-data.txt

# Handlers that processed user data
ls /var/lib/cloud/instance/handlers/
```

## How cloud-init Decides to Run

cloud-init tracks whether it has run for a given instance using the instance ID. On first boot with a new instance ID, it runs all stages. On subsequent boots of the same instance, it skips the per-instance configuration but still runs certain per-boot modules.

```bash
# Show the current instance ID
cloud-init query instance_id

# Force cloud-init to re-run (for testing)
sudo cloud-init clean --logs
sudo cloud-init init
```

Modules are categorized as:
- `always` - runs on every boot
- `once-per-instance` - runs once per unique instance ID
- `once` - runs once total and never again

## Checking cloud-init Status

```bash
# Overall status
cloud-init status

# Detailed status with timing
cloud-init status --long

# Wait for cloud-init to complete (useful in scripts)
cloud-init status --wait
```

The status command is useful in bootstrap scripts that need to wait for cloud-init to finish before proceeding:

```bash
#!/bin/bash
# Wait for cloud-init before continuing
cloud-init status --wait

# Now it's safe to assume cloud-init has finished
echo "cloud-init complete, proceeding with application setup"
```

## Module Configuration

The `/etc/cloud/cloud.cfg` file controls which modules run in each stage:

```yaml
# /etc/cloud/cloud.cfg (excerpt)

cloud_init_modules:
  - migrator
  - seed_random
  - bootcmd
  - write-files
  - growpart
  - resizefs
  - set_hostname
  - update_hostname
  - update_etc_hosts
  - users-groups
  - ssh

cloud_config_modules:
  - snap
  - set-passwords
  - ntp
  - timezone
  - disable-ec2-metadata
  - runcmd

cloud_final_modules:
  - package-update-upgrade-install
  - fan
  - scripts-vendor
  - scripts-per-once
  - scripts-per-boot
  - scripts-per-instance
  - scripts-user
  - ssh-authkey-fingerprints
  - final-message
  - power-state-change
```

Understanding cloud-init's data source detection, execution stages, and configuration format gives you the foundation to write effective user data, troubleshoot boot failures, and build reliable automation around cloud instance provisioning.
