# How to Migrate Existing Workloads to Calico with Binary Management on Bare Metal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binary Management, Migration

Description: A guide to using Ansible to orchestrate migration of bare metal Kubernetes workloads from an existing CNI to binary-managed Calico.

---

## Introduction

Migrating from a container-based CNI to binary-managed Calico on bare metal, when orchestrated with Ansible, becomes a repeatable and auditable process rather than a set of manual steps. Ansible handles the binary installation, CNI configuration replacement, and service management across all nodes, while also providing a rollback mechanism through its built-in handlers and backup tasks.

The migration playbook is the key artifact - it should be tested in a staging environment before running against production nodes. A well-written migration playbook can be re-run safely if interrupted partway through, because Ansible's idempotent model ensures already-migrated nodes are not disrupted on a second run.

This guide covers Ansible-orchestrated migration to binary-managed Calico on bare metal.

## Prerequisites

- A bare metal Kubernetes cluster with a container-based CNI (e.g., Flannel)
- Ansible control node with SSH access to all nodes
- `kubectl` with cluster admin access
- Tested migration playbook ready to run

## Step 1: Backup Current State

```bash
kubectl get all -A -o yaml > pre-migration-state.yaml
kubectl get networkpolicies -A -o yaml > pre-migration-policies.yaml
ansible all -i inventory.ini -m shell \
  -a "cat /etc/cni/net.d/*.conflist 2>/dev/null" > current-cni-configs.txt
```

## Step 2: Remove Existing CNI DaemonSet

```bash
# Remove Flannel
kubectl delete -f kube-flannel.yml
```

## Step 3: Write the Migration Playbook

```yaml
# migrate-to-calico-binary.yml
---
- name: Migrate node to Calico binary
  hosts: all
  serial: 1
  become: true
  vars:
    calico_version: v3.27.0

  tasks:
    - name: Cordon node
      delegate_to: localhost
      shell: kubectl cordon {{ inventory_hostname }}

    - name: Remove old CNI config
      file:
        path: "{{ item }}"
        state: absent
      loop:
        - /etc/cni/net.d/10-flannel.conflist
        - /run/flannel/subnet.env

    - name: Remove old CNI interface
      shell: ip link delete flannel.1 2>/dev/null || true
      changed_when: false

    - name: Install calico-node binary
      get_url:
        url: "https://github.com/projectcalico/calico/releases/download/{{ calico_version }}/calico-node-amd64"
        dest: /usr/local/bin/calico-node
        mode: '0755'

    - name: Install CNI plugins
      get_url:
        url: "https://github.com/projectcalico/calico/releases/download/{{ calico_version }}/{{ item.src }}"
        dest: "/opt/cni/bin/{{ item.dest }}"
        mode: '0755'
      loop:
        - { src: 'calico-cni-amd64', dest: 'calico' }
        - { src: 'calico-ipam-amd64', dest: 'calico-ipam' }

    - name: Write CNI config
      template:
        src: calico-cni.conflist.j2
        dest: /etc/cni/net.d/10-calico.conflist

    - name: Write and enable calico-node service
      template:
        src: calico-node.service.j2
        dest: /etc/systemd/system/calico-node.service

    - name: Start calico-node
      systemd:
        name: calico-node
        state: started
        enabled: true
        daemon_reload: true

    - name: Wait for node to be ready
      delegate_to: localhost
      shell: kubectl wait --for=condition=Ready node/{{ inventory_hostname }} --timeout=120s

    - name: Uncordon node
      delegate_to: localhost
      shell: kubectl uncordon {{ inventory_hostname }}
```

## Step 4: Run the Migration

```bash
ansible-playbook -i inventory.ini migrate-to-calico-binary.yml
```

## Step 5: Verify Cluster Health

```bash
kubectl get nodes
calicoctl ipam show
kubectl get pods -A | grep -v Running
```

## Conclusion

Ansible-orchestrated migration to binary-managed Calico on bare metal converts a risky manual migration into a repeatable, serial playbook run. The node-by-node serial execution, combined with Ansible's idempotent task model, provides a safe migration path that can pause, resume, and verify at each node before proceeding.
