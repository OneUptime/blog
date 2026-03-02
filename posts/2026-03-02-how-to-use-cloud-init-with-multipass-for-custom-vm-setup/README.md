# How to Use cloud-init with Multipass for Custom VM Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Multipass, cloud-init, Automation, Virtualization

Description: A practical guide to using cloud-init configuration files with Multipass to automate VM setup, install packages, configure users, and run custom scripts at first boot.

---

Every time you create a Multipass VM and then SSH in to run `apt install`, create users, or copy configuration files, you are doing repetitive work that could be automated. cloud-init is the standard tool for automating first-boot configuration of cloud instances, and Multipass has first-class support for it.

## What cloud-init Does

cloud-init runs during the first boot of a VM and processes a user-provided configuration file. It can:
- Install packages
- Create users and set SSH keys
- Write files to specific paths with specific permissions
- Run arbitrary shell commands
- Configure hostname and timezone
- Set up package mirrors

The configuration file format is YAML with a mandatory first line of `#cloud-config`.

## Passing cloud-init Config to Multipass

Use the `--cloud-init` flag with either a file path or `-` for stdin:

```bash
# Using a file
multipass launch 24.04 --name myvm --cloud-init ./my-config.yaml

# Using stdin (heredoc)
multipass launch 24.04 --name myvm --cloud-init - <<'EOF'
#cloud-config
package_update: true
packages:
  - vim
  - git
EOF
```

## The Minimal Template

Start with this template and add what you need:

```yaml
#cloud-config

# Update package lists on first boot
package_update: true

# Upgrade all packages
package_upgrade: false

# Install packages
packages:
  - vim
  - curl
  - git
```

Save this as `base-config.yaml` and launch with it:

```bash
multipass launch 24.04 \
  --name myvm \
  --cpus 2 \
  --memory 4G \
  --cloud-init base-config.yaml
```

## Installing Packages

The `packages` directive handles both regular apt packages and snap packages:

```yaml
#cloud-config
package_update: true
packages:
  # System utilities
  - htop
  - tree
  - jq
  - curl
  - wget
  - unzip
  # Development tools
  - build-essential
  - git
  - python3-pip
  - python3-venv
  # Network tools
  - net-tools
  - nmap
  - tcpdump
```

## Writing Files

The `write_files` directive creates files at specified paths with specified content and permissions:

```yaml
#cloud-config
write_files:
  # Create a simple script
  - path: /usr/local/bin/check-services
    content: |
      #!/bin/bash
      systemctl status nginx postgresql redis
    permissions: '0755'
    owner: root:root

  # Create an app configuration file
  - path: /etc/myapp/config.yaml
    content: |
      server:
        host: 0.0.0.0
        port: 8080
      database:
        host: localhost
        port: 5432
    permissions: '0644'
    owner: root:root

  # Create a .bashrc addition for ubuntu user
  - path: /home/ubuntu/.bash_aliases
    content: |
      alias ll='ls -lah'
      alias gs='git status'
      alias gc='git commit'
      alias ..='cd ..'
    owner: ubuntu:ubuntu
    permissions: '0644'
```

## Running Commands

The `runcmd` directive runs shell commands after package installation:

```yaml
#cloud-config
package_update: true
packages:
  - curl
  - apt-transport-https

runcmd:
  # Install Node.js via NodeSource
  - curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  - apt-get install -y nodejs

  # Install Docker
  - curl -fsSL https://get.docker.com | sh
  - usermod -aG docker ubuntu

  # Create a directory structure
  - mkdir -p /opt/myapp/{logs,config,data}
  - chown -R ubuntu:ubuntu /opt/myapp

  # Enable and start a service
  - systemctl enable nginx
  - systemctl start nginx
```

`runcmd` commands run as root. Use `sudo -u ubuntu <command>` if you need to run as the ubuntu user.

## Managing Users

```yaml
#cloud-config
# Modify the default ubuntu user
users:
  - name: ubuntu
    gecos: Ubuntu User
    groups: [docker, sudo, adm]
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2EAAA... your-key-here

  # Add an extra user
  - name: devuser
    gecos: Developer
    groups: [sudo, docker]
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2EAAA... devuser-key
```

To inject your actual current SSH public key dynamically:

```bash
multipass launch 24.04 --name myvm --cloud-init - <<EOF
#cloud-config
users:
  - name: ubuntu
    ssh_authorized_keys:
      - $(cat ~/.ssh/id_rsa.pub)
EOF
```

## Setting Hostname and Timezone

```yaml
#cloud-config
# Set system hostname
hostname: dev-server
fqdn: dev-server.local

# Set timezone
timezone: America/New_York
```

## A Complete Development Environment Example

Here is a production-quality cloud-init config for a Python/Docker development environment:

```yaml
#cloud-config

hostname: python-dev
timezone: UTC

package_update: true
package_upgrade: true

packages:
  - git
  - curl
  - vim
  - htop
  - tree
  - jq
  - build-essential
  - python3-pip
  - python3-venv
  - python3-dev
  - libpq-dev
  - apt-transport-https
  - ca-certificates
  - gnupg
  - lsb-release

write_files:
  - path: /home/ubuntu/.bash_aliases
    owner: ubuntu:ubuntu
    permissions: '0644'
    content: |
      alias ll='ls -lah'
      alias py='python3'
      alias pip='pip3'
      alias activate='source venv/bin/activate'

  - path: /etc/pip.conf
    owner: root:root
    permissions: '0644'
    content: |
      [global]
      break-system-packages = true

runcmd:
  # Install Docker
  - curl -fsSL https://get.docker.com | sh
  - usermod -aG docker ubuntu

  # Install Docker Compose
  - curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  - chmod +x /usr/local/bin/docker-compose

  # Install common Python packages
  - pip3 install virtualenv httpie ansible

  # Create project directory
  - mkdir -p /home/ubuntu/projects
  - chown ubuntu:ubuntu /home/ubuntu/projects

  # Signal completion
  - touch /home/ubuntu/.cloud-init-complete
  - echo "Cloud-init setup complete" > /home/ubuntu/.setup-log
```

Launch it:

```bash
multipass launch 24.04 \
  --name python-dev \
  --cpus 4 \
  --memory 8G \
  --disk 40G \
  --cloud-init python-dev.yaml
```

## Monitoring cloud-init Progress

cloud-init logs its output to `/var/log/cloud-init.log` and `/var/log/cloud-init-output.log`:

```bash
# Watch cloud-init output in real time
multipass exec myvm -- tail -f /var/log/cloud-init-output.log

# Check if cloud-init finished
multipass exec myvm -- cloud-init status

# Output on success:
# status: done

# See what cloud-init ran
multipass exec myvm -- cloud-init analyze show
```

You can also check the sentinel file if you wrote one in `runcmd`:

```bash
multipass exec myvm -- ls -la /home/ubuntu/.cloud-init-complete
```

## Troubleshooting cloud-init Failures

If cloud-init fails, check the logs:

```bash
# Full cloud-init log
multipass exec myvm -- cat /var/log/cloud-init.log | grep -i "error\|fail"

# Output log (stdout/stderr of runcmd commands)
multipass exec myvm -- cat /var/log/cloud-init-output.log
```

Common problems:
- YAML syntax errors (indentation issues are common - use 2 spaces, not tabs)
- Package names that don't exist or have changed
- Commands that fail silently (add `set -e` or check exit codes in runcmd)
- Network unavailable during package installation (cloud-init waits but may time out)

Validate your YAML syntax before launching:

```bash
# Install yamllint
pip3 install yamllint

# Validate
yamllint my-config.yaml
```

cloud-init transforms VM creation from a multi-step manual process into a single command. Once you have a cloud-init template for your standard dev environment, spinning up a fresh, fully configured VM takes the same time as a bare launch.
