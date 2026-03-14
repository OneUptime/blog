# How to Upgrade Calico with Binary Management on Bare Metal Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binary Management, Upgrade

Description: A guide to safely upgrading Calico binary installations across bare metal nodes using a configuration management tool like Ansible.

---

## Introduction

Upgrading Calico binary installations managed by Ansible on bare metal is cleaner and safer than unmanaged binary upgrades because Ansible can orchestrate the node-by-node rollout, handle binary replacement idempotently, and roll back automatically if a node fails to come back healthy. The upgrade playbook becomes the single authoritative source of the new version, and Ansible's serial execution model naturally enforces the node-by-node sequence.

The key to a safe upgrade is setting Ansible's `serial` parameter to 1 so only one node is upgraded at a time, and including a verification task after each node that checks service health and BGP session state before proceeding.

This guide covers a safe Ansible-managed Calico binary upgrade.

## Prerequisites

- Calico binary installation managed by Ansible on all bare metal nodes
- A tested upgrade playbook targeting the new version
- Current configuration backed up
- Maintenance window scheduled

## Step 1: Backup Calico Configuration

```bash
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get bgpconfiguration -o yaml > bgp-backup.yaml
calicoctl get ippool -o yaml > ippool-backup.yaml
```

## Step 2: Update the Ansible Variables

Update the `calico_version` variable in your inventory or group vars.

```ini
# group_vars/all.yml
calico_version: v3.27.0
```

## Step 3: Write the Upgrade Playbook

```yaml
# upgrade-calico.yml
---
- name: Upgrade Calico binaries
  hosts: workers
  serial: 1  # One node at a time
  become: true
  vars:
    calico_base_url: "https://github.com/projectcalico/calico/releases/download/{{ calico_version }}"
  tasks:
    - name: Cordon node
      delegate_to: localhost
      shell: kubectl cordon {{ inventory_hostname }}

    - name: Backup existing calico-node binary
      copy:
        src: /usr/local/bin/calico-node
        dest: /usr/local/bin/calico-node.bak
        remote_src: true

    - name: Download new calico-node binary
      get_url:
        url: "{{ calico_base_url }}/calico-node-amd64"
        dest: /usr/local/bin/calico-node
        mode: '0755'
        force: true

    - name: Restart calico-node service
      systemd:
        name: calico-node
        state: restarted

    - name: Wait for calico-node to be active
      systemd:
        name: calico-node
      register: svc_status
      until: svc_status.status.ActiveState == 'active'
      retries: 12
      delay: 5

    - name: Uncordon node
      delegate_to: localhost
      shell: kubectl uncordon {{ inventory_hostname }}
```

## Step 4: Run the Upgrade

```bash
ansible-playbook -i inventory.ini upgrade-calico.yml
```

Monitor progress:

```bash
watch kubectl get nodes
watch calicoctl node status
```

## Step 5: Verify Post-Upgrade

```bash
ansible all -i inventory.ini -m shell -a "/usr/local/bin/calico-node --version 2>&1"
calicoctl version
kubectl get nodes
```

## Conclusion

Ansible-managed Calico binary upgrades on bare metal use serial execution to roll through nodes one at a time, cordoning each before replacement and uncordoning after verification. This automated approach provides the controlled node-by-node sequence of a manual upgrade with the repeatability and rollback capability of configuration management.
