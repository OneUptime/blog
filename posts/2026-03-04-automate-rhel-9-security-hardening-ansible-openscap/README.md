# How to Automate RHEL 9 Security Hardening with Ansible and OpenSCAP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Security, Ansible, OpenSCAP

Description: Automate RHEL 9 security hardening using Ansible and OpenSCAP compliance profiles.

---

## Overview

Automate RHEL 9 security hardening using Ansible and OpenSCAP compliance profiles. Ansible provides agentless automation that connects to RHEL hosts over SSH and applies desired-state configuration.

## Prerequisites

- A RHEL 9 system to serve as the Ansible control node
- SSH access to managed RHEL 9 hosts
- Python 3 installed on managed hosts (included by default on RHEL 9)

## Step 1 - Install Ansible and OpenSCAP Content

```bash
sudo dnf install -y ansible-core scap-security-guide openscap-scanner rhc-worker-playbook
```

Verify the installation:

```bash
ansible --version
oscap --version
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

## Step 3 - Select Your Playbook

Use the OpenSCAP data stream to list available RHEL 9 compliance profiles:

```bash
oscap info /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```

The `scap-security-guide` package includes generated Ansible playbooks for these profiles:

```bash
ls /usr/share/scap-security-guide/ansible/rhel9-playbook-*.yml
```

## Step 4 - Run the Playbook

Choose the profile you want to apply. For example, run the HIPAA profile playbook against the inventory:

```bash
ANSIBLE_COLLECTIONS_PATH=/usr/share/rhc-worker-playbook/ansible/collections/ansible_collections/ \
  ansible-playbook -i inventory.ini --become /usr/share/scap-security-guide/ansible/rhel9-playbook-hipaa.yml
```

Use `--check` for a dry run:

```bash
ANSIBLE_COLLECTIONS_PATH=/usr/share/rhc-worker-playbook/ansible/collections/ansible_collections/ \
  ansible-playbook -i inventory.ini --become /usr/share/scap-security-guide/ansible/rhel9-playbook-hipaa.yml --check
```

## Step 5 - Verify Results

Run an OpenSCAP evaluation and generate an HTML report on each hardened host:

```bash
sudo oscap xccdf eval --profile hipaa --report scan-report.html /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```

## Summary

You have learned how to automate RHEL 9 security hardening with Ansible and OpenSCAP. Ansible's agentless architecture and OpenSCAP-generated remediation playbooks make it useful for managing RHEL systems at scale.
