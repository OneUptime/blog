# How to Migrate Existing Workloads to Calico with Binary Management on Bare Metal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binary Management, Migration

Description: A guide to using Ansible to orchestrate migration of bare metal Kubernetes workloads from an existing CNI to binary-managed Calico.

---

## Introduction

Migrating from a container-based CNI to binary-managed Calico CNI plugins on bare metal, when orchestrated with Ansible, becomes a repeatable and auditable process rather than a set of manual steps. Ansible handles the binary installation, CNI configuration replacement, and service management across all nodes, while also providing a rollback mechanism through its built-in handlers and backup tasks.

The migration playbook is the key artifact - it should be tested in a staging environment before running against production nodes. A well-written migration playbook can be re-run safely if interrupted partway through, because Ansible's idempotent model ensures already-migrated nodes are not disrupted on a second run.

This guide covers Ansible-orchestrated migration to binary-managed Calico CNI plugins on bare metal. The `calico/node` component itself should still be deployed using the official Calico manifests or operator before switching nodes to the new CNI configuration.

## Prerequisites

- A bare metal Kubernetes cluster with a container-based CNI (e.g., Flannel)
- Ansible control node with SSH access to all nodes
- `kubectl` with cluster admin access
- Calico CRDs, RBAC, and `calico/node` resources applied from the official Calico manifest or operator
- Tested migration playbook ready to run

## Step 1: Backup Current State

```bash
kubectl get all -A -o yaml > pre-migration-state.yaml
kubectl get networkpolicies -A -o yaml > pre-migration-policies.yaml
ansible all -i inventory.ini -m shell \
  -a "cat /etc/cni/net.d/*.conflist 2>/dev/null" > current-cni-configs.txt
```

## Step 2: Deploy Calico Resources and Remove Existing CNI DaemonSet

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

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

    - name: Drain node
      delegate_to: localhost
      shell: kubectl drain {{ inventory_hostname }} --ignore-daemonsets --delete-emptydir-data --timeout=10m

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

    - name: Download Calico release archive
      get_url:
        url: "https://github.com/projectcalico/calico/releases/download/{{ calico_version }}/release-{{ calico_version }}.tgz"
        dest: "/tmp/release-{{ calico_version }}.tgz"
        mode: '0644'

    - name: Extract Calico release archive
      unarchive:
        src: "/tmp/release-{{ calico_version }}.tgz"
        dest: /tmp
        remote_src: true

    - name: Install Calico CNI plugins
      copy:
        src: "/tmp/release-{{ calico_version }}/bin/cni/amd64/{{ item }}"
        dest: "/opt/cni/bin/{{ item }}"
        remote_src: true
        mode: '0755'
      loop:
        - calico
        - calico-ipam

    - name: Write CNI config
      template:
        src: calico-cni.conflist.j2
        dest: /etc/cni/net.d/10-calico.conflist

    - name: Restart kubelet
      systemd:
        name: kubelet
        state: restarted

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

Ansible-orchestrated migration to binary-managed Calico CNI plugins on bare metal converts a risky manual migration into a repeatable, serial playbook run. The node-by-node serial execution, combined with Ansible's idempotent task model, provides a safe migration path that can pause, resume, and verify at each node before proceeding.
