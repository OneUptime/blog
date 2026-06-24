# How to Install Calico with Binary Management on Bare Metal Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binary Management, Installation

Description: A step-by-step guide to installing Calico on bare metal using an automated binary management system such as Ansible or a package manager.

---

## Introduction

Managing Calico installations across many bare metal nodes manually is not sustainable. Configuration management tools - Ansible, Chef, Puppet, or OS package managers - automate the distribution, version control, and lifecycle management of the Calico installation assets across your node fleet. This approach combines the benefits of the official Calico manifests with the scale and repeatability of configuration management.

For Kubernetes, Calico is normally installed with the Tigera Operator or the raw Calico manifests. The raw manifest installs the Calico CRDs, RBAC, CNI configuration, `calico/node`, `calico/cni`, and `calico/kube-controllers` resources needed by the cluster. This makes the installation straightforward to automate with standard infrastructure tooling.

This guide covers installing Calico with Ansible as the configuration management layer on bare metal Kubernetes nodes.

## Prerequisites

- Bare metal servers bootstrapped with Kubernetes (no CNI installed)
- Ansible control node with SSH access to all Kubernetes nodes
- The target Calico version decided (e.g., v3.27.0)
- `kubectl` installed and configured on the control plane host Ansible targets
- The Kubernetes pod CIDR selected during cluster bootstrap

## Step 1: Create the Ansible Inventory

```ini
# inventory.ini

[control_plane]
master1 ansible_host=10.0.1.10

[workers]
worker1 ansible_host=10.0.1.11
worker2 ansible_host=10.0.1.12
worker3 ansible_host=10.0.1.13

[all:vars]
ansible_user=ubuntu
calico_version=v3.27.0
```

## Step 2: Write the Installation Playbook

```yaml
# install-calico.yml
---
- name: Install Calico on Kubernetes
  hosts: control_plane[0]
  vars:
    calico_manifest_url: "https://raw.githubusercontent.com/projectcalico/calico/{{ calico_version }}/manifests/calico.yaml"
    calico_manifest_path: "/tmp/calico-{{ calico_version }}.yaml"
  tasks:
    - name: Download Calico manifest
      get_url:
        url: "{{ calico_manifest_url }}"
        dest: "{{ calico_manifest_path }}"
        mode: '0644'

    - name: Apply Calico manifest
      command: kubectl apply -f "{{ calico_manifest_path }}"
      register: calico_apply
      changed_when: "'created' in calico_apply.stdout or 'configured' in calico_apply.stdout"
```

## Step 3: Run the Playbook

```bash
ansible-playbook -i inventory.ini install-calico.yml
```

## Step 4: Apply Additional Calico Configuration

```bash
kubectl apply -f ippool.yaml
kubectl apply -f bgpconfig.yaml
```

The Calico manifest already includes the CRDs and the default IP pool configuration. Apply additional resources only if you need custom IP pools, BGP settings, or other Calico resources after the base install.

## Step 5: Verify Installation

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get nodes
kubectl get ippools.crd.projectcalico.org
```

## Conclusion

Installing Calico with configuration management on bare metal combines the official Kubernetes manifest workflow with the repeatability and scale of infrastructure automation. An Ansible playbook handles manifest distribution and application consistently, eliminating manual installation steps during cluster bootstrap.
