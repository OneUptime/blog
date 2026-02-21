# How to Install Ansible on Ubuntu 22.04 Step by Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ubuntu, Linux, DevOps, Configuration Management

Description: A complete step-by-step guide to installing Ansible on Ubuntu 22.04 LTS using apt, PPA, and pip methods with verification and first playbook testing.

---

If you are setting up a new automation workflow and your control node runs Ubuntu 22.04 LTS (Jammy Jellyfish), getting Ansible installed correctly is the first step. Ubuntu 22.04 ships with Python 3.10 by default, which pairs well with modern Ansible versions. In this guide, I will walk through three different installation methods, explain when to use each one, and verify everything works before running your first ad-hoc command.

## Prerequisites

Before you begin, make sure you have:

- A machine running Ubuntu 22.04 LTS (server or desktop)
- A user account with sudo privileges
- An active internet connection
- At least one remote host you want to manage (optional for testing, since you can target localhost)

Update your package index first to avoid stale cache issues.

```bash
# Always update the package index before installing anything
sudo apt update && sudo apt upgrade -y
```

## Method 1: Install from the Official Ubuntu Repository

The simplest approach is to install Ansible directly from Ubuntu's default repositories. This gives you a stable version that Canonical has tested against Ubuntu 22.04.

```bash
# Install Ansible from the default Ubuntu 22.04 repos
sudo apt install ansible -y
```

Check what version got installed:

```bash
# Verify the installation
ansible --version
```

The default repo on Ubuntu 22.04 ships Ansible core 2.12.x. This is perfectly fine for most use cases, but if you need a newer release, use one of the methods below.

## Method 2: Install from the Ansible PPA

The Ansible team maintains a Personal Package Archive (PPA) that provides more recent releases. This is the recommended approach if you want up-to-date features without leaving the apt ecosystem.

```bash
# Install the software-properties-common package for add-apt-repository
sudo apt install software-properties-common -y

# Add the official Ansible PPA
sudo add-apt-repository --yes --update ppa:ansible/ansible

# Install Ansible from the PPA
sudo apt install ansible -y
```

Verify the version again:

```bash
# This should show a newer version than the default repos
ansible --version
```

With the PPA, you will typically get Ansible 2.16.x or later (as of early 2026), which includes the latest modules and bug fixes.

## Method 3: Install with pip

If you want the absolute latest release or need to run multiple Ansible versions side by side, pip is the way to go. This method also works well inside Python virtual environments.

```bash
# Install pip and the Python venv module
sudo apt install python3-pip python3-venv -y

# Create a virtual environment for Ansible
python3 -m venv ~/ansible-env

# Activate the virtual environment
source ~/ansible-env/bin/activate

# Install Ansible via pip
pip install ansible
```

Verify inside the virtual environment:

```bash
# Confirm Ansible is installed in the venv
which ansible
ansible --version
```

The output of `which ansible` should point to something like `/home/youruser/ansible-env/bin/ansible`, confirming it is running from the virtual environment and not the system-wide installation.

## Post-Installation: Configure SSH Keys

Ansible communicates with managed nodes over SSH. If you have not already set up key-based authentication, do that now.

```bash
# Generate an SSH key pair (skip if you already have one)
ssh-keygen -t ed25519 -C "ansible-control-node" -f ~/.ssh/ansible_key -N ""

# Copy the public key to a remote host
ssh-copy-id -i ~/.ssh/ansible_key.pub your_user@192.168.1.100
```

Test that you can connect without a password:

```bash
# This should log you in without prompting for a password
ssh -i ~/.ssh/ansible_key your_user@192.168.1.100
```

## Create a Basic Inventory File

With Ansible installed, you need an inventory file that tells Ansible which hosts to manage.

```ini
# ~/ansible-inventory.ini
[webservers]
192.168.1.100 ansible_user=deploy ansible_ssh_private_key_file=~/.ssh/ansible_key
192.168.1.101 ansible_user=deploy ansible_ssh_private_key_file=~/.ssh/ansible_key

[dbservers]
192.168.1.200 ansible_user=deploy ansible_ssh_private_key_file=~/.ssh/ansible_key
```

## Run Your First Ad-Hoc Command

Test the connection to all hosts in your inventory with the ping module. Note that Ansible's ping module is not ICMP ping; it verifies that Ansible can connect to the host and execute Python.

```bash
# Ping all hosts in the inventory file
ansible all -i ~/ansible-inventory.ini -m ping
```

If everything is configured correctly, you should see output like this:

```
192.168.1.100 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
```

## Test with a Simple Playbook

Create a basic playbook to verify your full setup end-to-end.

```yaml
# ~/first-playbook.yml
---
- name: Verify Ansible setup on Ubuntu 22.04
  hosts: all
  become: false
  gather_facts: true

  tasks:
    - name: Print the OS distribution
      ansible.builtin.debug:
        msg: "This host is running {{ ansible_distribution }} {{ ansible_distribution_version }}"

    - name: Check available disk space
      ansible.builtin.command: df -h /
      register: disk_space
      changed_when: false

    - name: Display disk space
      ansible.builtin.debug:
        msg: "{{ disk_space.stdout_lines }}"
```

Run it:

```bash
# Execute the playbook against your inventory
ansible-playbook -i ~/ansible-inventory.ini ~/first-playbook.yml
```

## Troubleshooting Common Installation Issues

**Problem: "add-apt-repository command not found"**

This happens when `software-properties-common` is not installed. Fix it:

```bash
sudo apt install software-properties-common -y
```

**Problem: "No module named ansible"**

If you installed via pip in a virtual environment, make sure the environment is activated:

```bash
source ~/ansible-env/bin/activate
```

**Problem: SSH connection failures**

Check that the SSH service is running on the remote host and that your firewall allows port 22:

```bash
# On the remote host
sudo systemctl status ssh
sudo ufw status
```

**Problem: Python interpreter warnings**

Ubuntu 22.04 ships Python 3.10 as the default. If Ansible complains about the Python interpreter, set it explicitly in your inventory:

```ini
[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

## Keeping Ansible Updated

If you used the PPA method, regular apt updates will keep Ansible current:

```bash
# Update Ansible along with other packages
sudo apt update && sudo apt upgrade -y
```

For pip installations, upgrade with:

```bash
source ~/ansible-env/bin/activate
pip install --upgrade ansible
```

## Which Method Should You Choose?

For production control nodes that need stability, the PPA method is the best balance between freshness and reliability. Use the default Ubuntu repos if you are in a restricted environment that does not allow PPAs. Use pip if you need version pinning, multiple Ansible versions, or the very latest release.

Regardless of which method you choose, the important thing is that your Ansible installation matches the requirements of your playbooks and collections. Run `ansible --version` after any installation or upgrade to confirm you are on the right track.
