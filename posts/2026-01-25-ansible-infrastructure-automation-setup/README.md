# How to Set Up Ansible for Infrastructure Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Infrastructure Automation, DevOps, Configuration Management, IaC

Description: A practical guide to setting up Ansible for infrastructure automation, covering installation, configuration, SSH setup, and running your first playbooks to manage servers at scale.

---

Ansible is an agentless automation tool that uses SSH to configure servers, deploy applications, and orchestrate complex workflows. Unlike tools that require agents on every managed node, Ansible only needs Python installed on target machines and SSH access from your control node.

This guide walks through setting up Ansible from scratch and running your first automation tasks.

## Why Ansible for Infrastructure Automation

Before diving into setup, consider what makes Ansible a solid choice:

- **Agentless architecture**: No daemons to install or maintain on target servers
- **YAML-based playbooks**: Human-readable configuration that doubles as documentation
- **Idempotent operations**: Running the same playbook twice produces the same result
- **Large module library**: Over 3,000 modules for cloud providers, databases, networking, and more
- **Push-based model**: You control when changes are applied

## Installing Ansible on the Control Node

The control node is where you run Ansible commands. It can be your laptop, a bastion host, or a CI/CD runner.

### Installation on Ubuntu/Debian

```bash
# Update package index and install software-properties-common for add-apt-repository
sudo apt update
sudo apt install -y software-properties-common

# Add the official Ansible PPA for the latest stable version
sudo add-apt-repository --yes --update ppa:ansible/ansible

# Install Ansible
sudo apt install -y ansible

# Verify installation
ansible --version
```

### Installation on macOS

```bash
# Install via Homebrew (recommended for macOS)
brew install ansible

# Alternative: install via pip for more control over versions
pip3 install ansible

# Verify installation
ansible --version
```

### Installation on RHEL/CentOS

```bash
# Enable EPEL repository for CentOS/RHEL
sudo dnf install -y epel-release

# Install Ansible
sudo dnf install -y ansible

# Verify installation
ansible --version
```

## Configuring Ansible

Ansible reads configuration from multiple locations in order of precedence:

1. `ANSIBLE_CONFIG` environment variable
2. `./ansible.cfg` in current directory
3. `~/.ansible.cfg` in home directory
4. `/etc/ansible/ansible.cfg` system-wide

Create a project-specific configuration file for better portability.

```ini
# ansible.cfg - project-level configuration
[defaults]
# Path to inventory file (can also be a directory)
inventory = ./inventory/hosts.ini

# SSH private key for authentication
private_key_file = ~/.ssh/ansible_key

# Remote user for SSH connections
remote_user = deploy

# Disable host key checking for dynamic environments (use with caution)
host_key_checking = False

# Number of parallel processes (increase for large inventories)
forks = 20

# Timeout for SSH connections in seconds
timeout = 30

# Retry files clutter the directory, disable them
retry_files_enabled = False

# Path to roles
roles_path = ./roles

[privilege_escalation]
# Use sudo for tasks requiring root
become = True
become_method = sudo
become_user = root
become_ask_pass = False

[ssh_connection]
# Use SSH pipelining for better performance
pipelining = True

# SSH arguments for connection reuse
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
```

## Setting Up SSH Authentication

Ansible communicates with managed nodes over SSH. Set up key-based authentication for secure, password-less access.

```bash
# Generate an SSH key pair specifically for Ansible
# Use ed25519 for better security and performance
ssh-keygen -t ed25519 -C "ansible@control-node" -f ~/.ssh/ansible_key

# Copy the public key to each managed node
# Replace 'deploy' with your remote username and IP with your server
ssh-copy-id -i ~/.ssh/ansible_key.pub deploy@192.168.1.10
ssh-copy-id -i ~/.ssh/ansible_key.pub deploy@192.168.1.11
ssh-copy-id -i ~/.ssh/ansible_key.pub deploy@192.168.1.12

# Test passwordless SSH connection
ssh -i ~/.ssh/ansible_key deploy@192.168.1.10 "hostname"
```

For large-scale deployments, consider using an SSH certificate authority or integrating with HashiCorp Vault for SSH secrets management.

## Creating Your First Inventory

The inventory file defines which hosts Ansible manages. Start with a simple INI format.

```ini
# inventory/hosts.ini - define managed hosts and groups

# Individual hosts with connection details
[webservers]
web1.example.com ansible_host=192.168.1.10
web2.example.com ansible_host=192.168.1.11

[databases]
db1.example.com ansible_host=192.168.1.20 ansible_user=dbadmin
db2.example.com ansible_host=192.168.1.21 ansible_user=dbadmin

[loadbalancers]
lb1.example.com ansible_host=192.168.1.5

# Group of groups - useful for applying common configurations
[production:children]
webservers
databases
loadbalancers

# Variables applied to all hosts in a group
[webservers:vars]
http_port=80
https_port=443

[databases:vars]
db_port=5432
```

Verify your inventory is parsed correctly:

```bash
# List all hosts in inventory
ansible-inventory --list -y

# Show hosts in a specific group
ansible webservers --list-hosts
```

## Testing Connectivity

Before running playbooks, verify Ansible can reach all managed nodes.

```bash
# Ping all hosts in inventory using the ping module
# This verifies SSH connectivity and Python availability
ansible all -m ping

# Expected output for successful connection:
# web1.example.com | SUCCESS => {
#     "changed": false,
#     "ping": "pong"
# }

# Test a specific group
ansible webservers -m ping

# Run an ad-hoc command to check OS information
ansible all -m shell -a "uname -a"

# Check disk space on all servers
ansible all -m shell -a "df -h /"
```

## Writing Your First Playbook

Playbooks are YAML files that define automation tasks. Create a simple playbook to update packages and install common tools.

```yaml
# playbooks/setup-common.yml - base configuration for all servers
---
- name: Configure common settings on all servers
  hosts: all
  become: yes  # Run tasks with sudo

  vars:
    common_packages:
      - vim
      - htop
      - curl
      - wget
      - git
      - tmux

  tasks:
    - name: Update apt cache (Debian/Ubuntu)
      apt:
        update_cache: yes
        cache_valid_time: 3600  # Only update if cache is older than 1 hour
      when: ansible_os_family == "Debian"

    - name: Update dnf cache (RHEL/CentOS)
      dnf:
        update_cache: yes
      when: ansible_os_family == "RedHat"

    - name: Install common packages (Debian/Ubuntu)
      apt:
        name: "{{ common_packages }}"
        state: present
      when: ansible_os_family == "Debian"

    - name: Install common packages (RHEL/CentOS)
      dnf:
        name: "{{ common_packages }}"
        state: present
      when: ansible_os_family == "RedHat"

    - name: Set timezone to UTC
      timezone:
        name: UTC

    - name: Ensure NTP is installed and running
      package:
        name: chrony
        state: present

    - name: Start and enable chronyd service
      service:
        name: chronyd
        state: started
        enabled: yes
```

Run the playbook:

```bash
# Check what changes would be made without applying them (dry run)
ansible-playbook playbooks/setup-common.yml --check --diff

# Run the playbook
ansible-playbook playbooks/setup-common.yml

# Run with verbose output for debugging
ansible-playbook playbooks/setup-common.yml -vvv

# Limit execution to specific hosts
ansible-playbook playbooks/setup-common.yml --limit web1.example.com
```

## Project Directory Structure

Organize your Ansible project for maintainability as it grows.

```
ansible-project/
├── ansible.cfg              # Project configuration
├── inventory/
│   ├── hosts.ini            # Static inventory
│   ├── group_vars/          # Variables by group
│   │   ├── all.yml
│   │   ├── webservers.yml
│   │   └── databases.yml
│   └── host_vars/           # Variables by host
│       └── web1.example.com.yml
├── playbooks/
│   ├── setup-common.yml
│   ├── deploy-app.yml
│   └── security-hardening.yml
├── roles/
│   ├── common/
│   ├── nginx/
│   └── postgresql/
└── files/                   # Static files to copy
    └── motd.txt
```

## Handling Secrets Securely

Never commit plaintext secrets. Use Ansible Vault to encrypt sensitive data.

```bash
# Create an encrypted variables file
ansible-vault create inventory/group_vars/all/vault.yml

# Edit an existing encrypted file
ansible-vault edit inventory/group_vars/all/vault.yml

# Run playbook that uses vault-encrypted files
ansible-playbook playbooks/deploy-app.yml --ask-vault-pass

# Or use a password file (ensure it has restricted permissions)
ansible-playbook playbooks/deploy-app.yml --vault-password-file ~/.vault_pass
```

## Common Troubleshooting

When things go wrong, these commands help diagnose issues:

```bash
# Increase verbosity to see SSH commands and output
ansible-playbook playbook.yml -vvvv

# Check syntax without running
ansible-playbook playbook.yml --syntax-check

# List all tasks that would run
ansible-playbook playbook.yml --list-tasks

# Start at a specific task (useful for debugging failures)
ansible-playbook playbook.yml --start-at-task="Install common packages"

# Run only tasks with specific tags
ansible-playbook playbook.yml --tags "configuration,packages"
```

---

With Ansible installed and configured, you have the foundation for automating your infrastructure. Start small with ad-hoc commands, graduate to playbooks for repeatable tasks, and eventually build reusable roles as your automation library grows. The agentless architecture means you can start automating existing servers immediately without any modifications to your current infrastructure.
