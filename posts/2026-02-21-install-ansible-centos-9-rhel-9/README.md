# How to Install Ansible on CentOS 9 and RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, CentOS, RHEL, Linux, DevOps

Description: Step-by-step instructions for installing Ansible on CentOS Stream 9 and Red Hat Enterprise Linux 9 using dnf and pip with configuration tips.

---

CentOS Stream 9 and RHEL 9 share the same package base, so the installation process is nearly identical on both distributions. Both ship with Python 3.9 by default, and Ansible is available through the EPEL (Extra Packages for Enterprise Linux) repository or directly via pip. This guide covers both approaches, walks you through initial configuration, and shows you how to verify everything is working.

## Prerequisites

You need a CentOS Stream 9 or RHEL 9 system with:

- Root or sudo access
- An active internet connection
- Python 3.9+ (pre-installed on both distros)

Start by making sure your system is up to date:

```bash
# Update all installed packages to their latest versions
sudo dnf update -y
```

## Method 1: Install from EPEL Repository

The EPEL repository is maintained by the Fedora project and provides high-quality packages for Enterprise Linux distributions. This is the most straightforward way to install Ansible on CentOS 9 or RHEL 9.

First, enable the EPEL repository:

```bash
# Install the EPEL release package
sudo dnf install epel-release -y
```

On RHEL 9, you also need to enable the CodeReady Builder (CRB) repository, which provides additional build dependencies:

```bash
# RHEL 9 only: enable CRB repository
sudo dnf config-manager --set-enabled crb

# RHEL 9 only: install EPEL from the Fedora project
sudo dnf install https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm -y
```

Now install Ansible:

```bash
# Install Ansible from the EPEL repo
sudo dnf install ansible -y
```

Verify the installation:

```bash
# Check the installed version
ansible --version
```

You should see output showing the ansible-core version, the Python version it is using, and the configuration file path.

## Method 2: Install with pip

For more control over the version, install Ansible using pip. This is especially useful if you want to pin a specific version for consistency across your team.

```bash
# Install pip if it is not already present
sudo dnf install python3-pip -y

# Install Ansible system-wide via pip
sudo pip3 install ansible
```

If you prefer to keep Ansible isolated from system Python packages (which is generally a good practice), use a virtual environment:

```bash
# Install the venv module
sudo dnf install python3-virtualenv -y

# Create a dedicated virtual environment
python3 -m venv ~/ansible-venv

# Activate it
source ~/ansible-venv/bin/activate

# Install Ansible inside the venv
pip install ansible
```

Confirm the installation:

```bash
# Should point to the venv binary
which ansible
ansible --version
```

## Setting Up SSH Key Authentication

Ansible uses SSH to communicate with managed nodes. Set up key-based authentication to avoid typing passwords every time.

```bash
# Generate an SSH key pair
ssh-keygen -t ed25519 -f ~/.ssh/ansible_ed25519 -N ""

# Copy the public key to a managed node
ssh-copy-id -i ~/.ssh/ansible_ed25519.pub deploy@10.0.0.50
```

Test the connection:

```bash
# Verify passwordless SSH works
ssh -i ~/.ssh/ansible_ed25519 deploy@10.0.0.50 "hostname"
```

## Disable Host Key Checking (Development Only)

In lab or development environments, you might want to skip host key verification to avoid interactive prompts. Never do this in production.

```bash
# Create a project-level ansible.cfg
mkdir -p ~/ansible-project && cd ~/ansible-project

cat > ansible.cfg << 'EOF'
[defaults]
host_key_checking = False
inventory = inventory.ini
remote_user = deploy
private_key_file = ~/.ssh/ansible_ed25519

[privilege_escalation]
become = True
become_method = sudo
become_ask_pass = False
EOF
```

## Create Your Inventory

Set up a simple inventory file for your managed hosts:

```ini
# ~/ansible-project/inventory.ini
[web]
web01 ansible_host=10.0.0.50
web02 ansible_host=10.0.0.51

[db]
db01 ansible_host=10.0.0.60

[centos:children]
web
db
```

## Test the Installation

Run an ad-hoc command to check connectivity:

```bash
# Test connectivity to all hosts
ansible all -m ping
```

If your inventory and SSH keys are configured correctly, you will see SUCCESS messages from each host.

Try gathering facts from your hosts:

```bash
# Gather and display facts from the web group
ansible web -m setup -a "filter=ansible_distribution*"
```

This should return the distribution name (CentOS or RedHat) and version for each host in the web group.

## Run a Test Playbook

Create a playbook that installs a package to verify the full pipeline works:

```yaml
# ~/ansible-project/test-setup.yml
---
- name: Test Ansible installation on CentOS/RHEL 9
  hosts: all
  become: true

  tasks:
    - name: Install useful system utilities
      ansible.builtin.dnf:
        name:
          - vim
          - htop
          - tmux
        state: present

    - name: Ensure chrony is running for time sync
      ansible.builtin.systemd:
        name: chronyd
        state: started
        enabled: true

    - name: Display the kernel version
      ansible.builtin.command: uname -r
      register: kernel_version
      changed_when: false

    - name: Show kernel info
      ansible.builtin.debug:
        msg: "Kernel: {{ kernel_version.stdout }}"
```

Run the playbook:

```bash
# Execute the test playbook
ansible-playbook test-setup.yml
```

## Firewall Considerations

CentOS 9 and RHEL 9 use firewalld by default. If your managed nodes have strict firewall rules, make sure SSH (port 22) is allowed:

```bash
# On each managed node, verify SSH is allowed through the firewall
sudo firewall-cmd --list-services
# Should include "ssh" in the output

# If SSH is not listed, add it
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

## SELinux Notes

Both CentOS 9 and RHEL 9 have SELinux enabled in enforcing mode by default. Ansible generally works fine with SELinux enabled, but some modules that modify file contexts may need the `libselinux-python3` package on managed nodes:

```bash
# Install on managed nodes that need SELinux context management
sudo dnf install python3-libselinux -y
```

If you are writing playbooks that copy files or modify configurations, always use Ansible modules (like `ansible.builtin.template` or `ansible.builtin.copy`) rather than raw shell commands. Ansible modules handle SELinux contexts correctly, while raw file operations might not.

## Troubleshooting

**"No match for argument: ansible" during dnf install**

This means EPEL is not enabled. Double-check with `dnf repolist` and make sure epel is listed.

**"Failed to connect to the host via ssh"**

Verify that sshd is running on the managed node (`systemctl status sshd`) and that your SSH key is in the authorized_keys file.

**Python-related warnings**

Set the Python interpreter explicitly in your inventory if you see warnings:

```ini
[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

## Summary

Installing Ansible on CentOS 9 or RHEL 9 is straightforward whether you use the EPEL repository or pip. The EPEL method is simpler and integrates with your existing package management workflow. The pip method gives you more control over versioning. Either way, once Ansible is installed and SSH keys are configured, you are ready to start automating your infrastructure.
