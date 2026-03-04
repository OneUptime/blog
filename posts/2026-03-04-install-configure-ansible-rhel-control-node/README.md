# How to Install and Configure Ansible on RHEL as a Control Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Automation, Configuration Management, Linux

Description: Learn how to install Ansible on RHEL and configure it as a control node for managing remote systems with automated playbooks.

---

Ansible is an agentless automation tool that lets you manage fleets of servers from a single control node. On RHEL, you can install it from the official repositories and start automating within minutes.

## Installing Ansible

First, enable the Ansible repository and install:

```bash
# Enable the Ansible automation platform repository
sudo subscription-manager repos --enable ansible-automation-platform-2.4-for-rhel-9-x86_64-rpms

# Install the ansible-core package
sudo dnf install -y ansible-core
```

If you do not have access to the automation platform repo, you can install ansible-core from the standard AppStream:

```bash
# Install ansible-core from AppStream
sudo dnf install -y ansible-core
```

Verify the installation:

```bash
# Check Ansible version
ansible --version
```

## Configuring the Control Node

Create a project directory and an inventory file:

```bash
# Create a working directory for your Ansible projects
mkdir -p ~/ansible-projects
cd ~/ansible-projects

# Create an inventory file listing managed hosts
cat > inventory.ini << 'INV'
[webservers]
web1.example.com
web2.example.com

[dbservers]
db1.example.com

[all:vars]
ansible_user=admin
ansible_ssh_private_key_file=~/.ssh/id_rsa
INV
```

Create a configuration file:

```bash
# Create ansible.cfg in your project directory
cat > ansible.cfg << 'CFG'
[defaults]
inventory = ./inventory.ini
remote_user = admin
host_key_checking = False
retry_files_enabled = False

[privilege_escalation]
become = True
become_method = sudo
become_ask_pass = False
CFG
```

## Setting Up SSH Key Authentication

Generate an SSH key pair and distribute it to managed nodes:

```bash
# Generate an SSH key pair (skip if you already have one)
ssh-keygen -t ed25519 -C "ansible-control" -f ~/.ssh/id_rsa -N ""

# Copy the public key to each managed host
ssh-copy-id admin@web1.example.com
ssh-copy-id admin@web2.example.com
ssh-copy-id admin@db1.example.com
```

## Testing Connectivity

Run a ping test against all hosts in your inventory:

```bash
# Test connectivity to all hosts
ansible all -m ping

# Run an ad-hoc command to check uptime
ansible all -m command -a "uptime"
```

You should see a SUCCESS response from each host. Your RHEL control node is now ready to run playbooks and manage your infrastructure.
