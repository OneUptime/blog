# How to Install Calico with Binary Management on Bare Metal Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binary Management, Installation

Description: A step-by-step guide to installing Calico on bare metal using an automated binary management system such as Ansible or a package manager.

---

## Introduction

Managing Calico binary installations across many bare metal nodes manually is not sustainable. Binary management tools - Ansible, Chef, Puppet, or OS package managers - automate the distribution, version control, and lifecycle management of the Calico binaries across your node fleet. This approach combines the benefits of binary installation (native OS service, no container runtime dependency) with the scale and repeatability of configuration management.

Calico's binary components - calico-node, the CNI plugins, and calicoctl - are distributed as static binaries that can be managed by any tool that can copy files and manage systemd services. This makes them straightforward to automate with standard infrastructure tooling.

This guide covers installing Calico with Ansible as the binary management layer on bare metal Kubernetes nodes.

## Prerequisites

- Bare metal servers bootstrapped with Kubernetes (no CNI installed)
- Ansible control node with SSH access to all Kubernetes nodes
- The target Calico version decided (e.g., v3.27.0)
- `kubectl` access to the cluster

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
calico_pod_cidr=192.168.0.0/16
```

## Step 2: Write the Binary Installation Playbook

```yaml
# install-calico.yml
---
- name: Install Calico binaries
  hosts: all
  become: true
  vars:
    calico_base_url: "https://github.com/projectcalico/calico/releases/download/{{ calico_version }}"
  tasks:
    - name: Download calico-node
      get_url:
        url: "{{ calico_base_url }}/calico-node-amd64"
        dest: /usr/local/bin/calico-node
        mode: '0755'

    - name: Create CNI bin directory
      file:
        path: /opt/cni/bin
        state: directory
        mode: '0755'

    - name: Download Calico CNI plugins
      get_url:
        url: "{{ calico_base_url }}/{{ item.src }}"
        dest: "/opt/cni/bin/{{ item.dest }}"
        mode: '0755'
      loop:
        - { src: 'calico-cni-amd64', dest: 'calico' }
        - { src: 'calico-ipam-amd64', dest: 'calico-ipam' }

    - name: Write CNI config
      template:
        src: calico-cni.conflist.j2
        dest: /etc/cni/net.d/10-calico.conflist

    - name: Write systemd service
      template:
        src: calico-node.service.j2
        dest: /etc/systemd/system/calico-node.service

    - name: Enable and start calico-node
      systemd:
        name: calico-node
        enabled: true
        state: started
        daemon_reload: true
```

## Step 3: Run the Playbook

```bash
ansible-playbook -i inventory.ini install-calico.yml
```

## Step 4: Apply Calico CRDs and Configuration

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/crds.yaml

calicoctl apply -f ippool.yaml
calicoctl apply -f bgpconfig.yaml
```

## Step 5: Verify Installation

```bash
ansible all -i inventory.ini -m shell -a "systemctl is-active calico-node"
kubectl get nodes
calicoctl ipam show
```

## Conclusion

Installing Calico with binary management on bare metal combines the stability of native OS service installation with the repeatability and scale of configuration management tools. An Ansible playbook handles binary distribution, CNI configuration, and systemd service management across all nodes simultaneously, eliminating the manual node-by-node work of unmanaged binary installation.
