# How to Automate Talos Linux Deployments with Ansible

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ansible, Automation, Kubernetes, DevOps

Description: Learn how to automate Talos Linux cluster deployments using Ansible playbooks for consistent and repeatable Kubernetes infrastructure.

---

Ansible is one of the most widely used automation tools in the DevOps world, and it works well for managing Talos Linux deployments even though Talos has no SSH access. While Talos is designed to be managed through its API, Ansible can orchestrate the entire deployment workflow by calling `talosctl` commands from a control machine. This approach gives you the repeatability and documentation benefits of Ansible while working within the Talos management model.

## Why Ansible for Talos Linux?

You might wonder why you would use Ansible with Talos when Talos does not support SSH connections. The answer is that Ansible is not just an SSH tool. It is a workflow orchestration engine that can run local commands, manage files, call APIs, and coordinate multi-step processes. For Talos deployments, Ansible orchestrates the `talosctl` commands, manages configuration files, and ensures that operations happen in the correct order.

Teams that already use Ansible for other infrastructure management tasks benefit from keeping Talos operations within the same tooling. The learning curve is lower, and the playbooks serve as living documentation of your deployment procedures.

## Prerequisites

Before you start, make sure you have:

- Ansible 2.14 or later installed on your control machine
- `talosctl` CLI installed and available in your PATH
- Network access to your Talos nodes on port 50000 (Talos API)
- Generated Talos machine secrets and configurations

## Project Structure

Organize your Ansible project for Talos management:

```
talos-ansible/
  ansible.cfg
  inventory/
    hosts.yml
  playbooks/
    deploy-cluster.yml
    apply-config.yml
    bootstrap.yml
  roles/
    talos-common/
      tasks/
        main.yml
      templates/
        controlplane.yaml.j2
        worker.yaml.j2
      vars/
        main.yml
  files/
    secrets.yaml
```

## Setting Up the Inventory

Since Talos nodes do not accept SSH connections, you will run everything on the local machine using the `local` connection. The inventory defines your node information as variables:

```yaml
# inventory/hosts.yml
all:
  vars:
    cluster_name: "production-cluster"
    cluster_endpoint: "https://10.0.1.10:6443"
    talos_version: "v1.7.0"
    talosconfig_path: "./talosconfig"

  children:
    controlplane:
      hosts:
        cp-0:
          node_ip: "10.0.1.10"
          ansible_connection: local
        cp-1:
          node_ip: "10.0.1.11"
          ansible_connection: local
        cp-2:
          node_ip: "10.0.1.12"
          ansible_connection: local

    workers:
      hosts:
        worker-0:
          node_ip: "10.0.1.20"
          ansible_connection: local
        worker-1:
          node_ip: "10.0.1.21"
          ansible_connection: local
        worker-2:
          node_ip: "10.0.1.22"
          ansible_connection: local
```

## Creating the Deployment Playbook

The main deployment playbook orchestrates the full cluster setup:

```yaml
# playbooks/deploy-cluster.yml
---
- name: Generate Talos cluster configuration
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Generate Talos secrets
      ansible.builtin.command:
        cmd: talosctl gen secrets -o files/secrets.yaml
        creates: files/secrets.yaml

    - name: Generate machine configurations
      ansible.builtin.command:
        cmd: >
          talosctl gen config {{ cluster_name }}
          {{ cluster_endpoint }}
          --with-secrets files/secrets.yaml
          --output-dir ./generated
      args:
        creates: ./generated/controlplane.yaml

- name: Apply configuration to control plane nodes
  hosts: controlplane
  gather_facts: false
  serial: 1
  tasks:
    - name: Apply control plane configuration
      ansible.builtin.command:
        cmd: >
          talosctl apply-config
          --insecure
          --nodes {{ node_ip }}
          --file ./generated/controlplane.yaml
      delegate_to: localhost

    - name: Wait for node to be ready
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
      delegate_to: localhost
      register: health_result
      retries: 3
      delay: 30
      until: health_result.rc == 0
      ignore_errors: true

- name: Bootstrap the cluster
  hosts: controlplane[0]
  gather_facts: false
  tasks:
    - name: Bootstrap etcd on first control plane node
      ansible.builtin.command:
        cmd: >
          talosctl bootstrap
          --nodes {{ node_ip }}
          --endpoints {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      delegate_to: localhost

    - name: Wait for bootstrap to complete
      ansible.builtin.pause:
        minutes: 2

- name: Apply configuration to worker nodes
  hosts: workers
  gather_facts: false
  serial: 1
  tasks:
    - name: Apply worker configuration
      ansible.builtin.command:
        cmd: >
          talosctl apply-config
          --insecure
          --nodes {{ node_ip }}
          --file ./generated/worker.yaml
      delegate_to: localhost

    - name: Wait for worker to join the cluster
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
      delegate_to: localhost
      retries: 3
      delay: 30
      register: worker_health
      until: worker_health.rc == 0

- name: Retrieve cluster access credentials
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Get kubeconfig
      ansible.builtin.command:
        cmd: >
          talosctl kubeconfig
          --nodes {{ hostvars['cp-0']['node_ip'] }}
          --endpoints {{ hostvars['cp-0']['node_ip'] }}
          --talosconfig {{ talosconfig_path }}
      register: kubeconfig_result

    - name: Verify cluster is healthy
      ansible.builtin.command:
        cmd: kubectl get nodes
      register: nodes_result

    - name: Display cluster nodes
      ansible.builtin.debug:
        var: nodes_result.stdout_lines
```

## Handling Configuration Templates

Use Jinja2 templates to customize Talos configurations for different environments:

```yaml
# roles/talos-common/templates/controlplane.yaml.j2
machine:
  type: controlplane
  install:
    image: ghcr.io/siderolabs/installer:{{ talos_version }}
    disk: /dev/sda
  network:
    hostname: {{ inventory_hostname }}
  certSANs:
    - {{ cluster_endpoint | regex_replace('https://|:6443', '') }}
cluster:
  controlPlane:
    endpoint: {{ cluster_endpoint }}
  clusterName: {{ cluster_name }}
```

## Error Handling and Idempotency

Make your playbooks resilient with proper error handling:

```yaml
# Example of idempotent task with error handling
- name: Check if node is already configured
  ansible.builtin.command:
    cmd: >
      talosctl version
      --nodes {{ node_ip }}
      --talosconfig {{ talosconfig_path }}
  delegate_to: localhost
  register: version_check
  ignore_errors: true

- name: Apply configuration only if node is not yet configured
  ansible.builtin.command:
    cmd: >
      talosctl apply-config
      --insecure
      --nodes {{ node_ip }}
      --file ./generated/controlplane.yaml
  delegate_to: localhost
  when: version_check.rc != 0
```

## Running the Deployment

Execute the deployment with a single command:

```bash
# Run the full deployment
ansible-playbook -i inventory/hosts.yml playbooks/deploy-cluster.yml

# Run with verbose output for debugging
ansible-playbook -i inventory/hosts.yml playbooks/deploy-cluster.yml -vvv

# Run specific tags only
ansible-playbook -i inventory/hosts.yml playbooks/deploy-cluster.yml --tags "bootstrap"
```

## Summary

Ansible brings structure and repeatability to Talos Linux deployments. Even without SSH access to nodes, you can orchestrate the entire cluster lifecycle through `talosctl` commands wrapped in Ansible playbooks. The serial execution, retry logic, and template system make Ansible a practical choice for teams that need reliable and documented deployment procedures for their Talos clusters.
