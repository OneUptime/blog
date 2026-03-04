# How to Write Ansible Playbooks for RHEL 9 Patch Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Patch Management, Security

Description: Write Ansible playbooks for automating RHEL 9 patch management and security updates.

---

## Overview

Write Ansible playbooks for automating RHEL 9 patch management and security updates. Ansible provides agentless automation that connects to RHEL hosts over SSH and applies desired-state configuration.

## Prerequisites

- A RHEL 9 system to serve as the Ansible control node
- SSH access to managed hosts
- Python 3 installed on managed hosts (included by default on RHEL 9)

## Step 1 - Install Ansible

```bash
sudo dnf install -y ansible-core
```

Verify the installation:

```bash
ansible --version
```

## Step 2 - Configure Inventory

Create `/etc/ansible/hosts` or a local inventory file:

```ini
[webservers]
web1.example.com
web2.example.com

[dbservers]
db1.example.com
```

Test connectivity:

```bash
ansible all -i inventory.ini -m ping
```

## Step 3 - Write Your Playbook

Create a playbook YAML file:

```yaml
---
- name: Example RHEL Administration Playbook
  hosts: all
  become: true
  tasks:
    - name: Ensure packages are installed
      ansible.builtin.dnf:
        name:
          - vim
          - tmux
          - htop
        state: present

    - name: Ensure services are running
      ansible.builtin.systemd:
        name: sshd
        state: started
        enabled: true
```

## Step 4 - Run the Playbook

```bash
ansible-playbook -i inventory.ini playbook.yml
```

Use `--check` for a dry run:

```bash
ansible-playbook -i inventory.ini playbook.yml --check
```

## Step 5 - Verify Results

```bash
ansible all -i inventory.ini -m command -a "rpm -q htop"
```

## Summary

You have learned how to write ansible playbooks for rhel 9 patch management. Ansible's agentless architecture and declarative playbooks make it ideal for managing RHEL systems at scale.
