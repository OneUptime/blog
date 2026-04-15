# How to Use Dapr with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Ansible, Automation, Deployment, Infrastructure

Description: Automate Dapr installation, configuration, and component deployment using Ansible playbooks for bare-metal and VM-based Kubernetes environments.

---

## Overview

Ansible is a widely used automation tool for configuring servers and deploying applications. For Dapr deployments on bare-metal Kubernetes clusters or VM-based environments, Ansible playbooks provide idempotent automation for installing the Dapr CLI, deploying Dapr on Kubernetes, and managing component configurations.

## Prerequisites

- Ansible 2.12+ installed on the control node
- Target hosts accessible via SSH
- Kubernetes cluster already provisioned
- `kubernetes.core` Ansible collection installed

## Installing Required Collections

```bash
ansible-galaxy collection install \
  kubernetes.core \
  community.general \
  ansible.posix
```

## Inventory Configuration

```ini
[dapr_nodes]
k8s-master ansible_host=192.168.1.10 ansible_user=ubuntu
k8s-worker1 ansible_host=192.168.1.11 ansible_user=ubuntu
k8s-worker2 ansible_host=192.168.1.12 ansible_user=ubuntu

[dapr_nodes:vars]
ansible_ssh_private_key_file=~/.ssh/id_rsa
ansible_python_interpreter=/usr/bin/python3
```

## Playbook: Install Dapr CLI

```yaml
---
- name: Install Dapr CLI
  hosts: dapr_nodes[0]
  become: true
  vars:
    dapr_version: "1.13.0"

  tasks:
  - name: Download Dapr install script
    ansible.builtin.get_url:
      url: "https://raw.githubusercontent.com/dapr/cli/master/install/install.sh"
      dest: /tmp/dapr-install.sh
      mode: "0755"

  - name: Install Dapr CLI
    ansible.builtin.command:
      cmd: /tmp/dapr-install.sh {{ dapr_version }}
      creates: /usr/local/bin/dapr

  - name: Verify Dapr CLI installation
    ansible.builtin.command: dapr version
    register: dapr_version_output

  - name: Show Dapr version
    ansible.builtin.debug:
      msg: "{{ dapr_version_output.stdout }}"
```

## Playbook: Deploy Dapr on Kubernetes

```yaml
---
- name: Deploy Dapr on Kubernetes
  hosts: dapr_nodes[0]
  vars:
    dapr_namespace: dapr-system
    dapr_ha_enabled: "true"

  tasks:
  - name: Add Dapr Helm repository
    kubernetes.core.helm_repository:
      name: dapr
      repo_url: https://dapr.github.io/helm-charts/

  - name: Install Dapr via Helm
    kubernetes.core.helm:
      name: dapr
      chart_ref: dapr/dapr
      chart_version: "1.13.0"
      release_namespace: "{{ dapr_namespace }}"
      create_namespace: true
      values:
        global:
          ha:
            enabled: "{{ dapr_ha_enabled }}"
          logAsJson: true
      wait: true
      timeout: 5m0s

  - name: Wait for Dapr pods to be ready
    kubernetes.core.k8s_info:
      kind: Pod
      namespace: "{{ dapr_namespace }}"
      label_selectors:
      - "app.kubernetes.io/part-of=dapr"
    register: dapr_pods
    until: dapr_pods.resources | selectattr('status.phase', 'eq', 'Running') | list | length > 0
    retries: 30
    delay: 10
```

## Playbook: Deploy Dapr Components

```yaml
---
- name: Deploy Dapr Components
  hosts: dapr_nodes[0]
  vars:
    redis_host: "redis:6379"
    redis_password: "{{ lookup('env', 'REDIS_PASSWORD') }}"

  tasks:
  - name: Create Redis secret
    kubernetes.core.k8s:
      state: present
      definition:
        apiVersion: v1
        kind: Secret
        metadata:
          name: redis-credentials
          namespace: default
        stringData:
          password: "{{ redis_password }}"

  - name: Deploy Dapr state store component
    kubernetes.core.k8s:
      state: present
      definition:
        apiVersion: dapr.io/v1alpha1
        kind: Component
        metadata:
          name: statestore
          namespace: default
        spec:
          type: state.redis
          version: v1
          metadata:
          - name: redisHost
            value: "{{ redis_host }}"
          - name: redisPassword
            secretKeyRef:
              name: redis-credentials
              key: password
```

## Running Playbooks

```bash
# Run all playbooks
ansible-playbook -i inventory/hosts site.yml

# Run only the Dapr installation
ansible-playbook -i inventory/hosts playbooks/install-dapr.yml

# Check mode (dry run)
ansible-playbook -i inventory/hosts playbooks/deploy-components.yml --check
```

## Summary

Ansible playbooks provide idempotent, version-controlled automation for Dapr deployments on Kubernetes. By combining the kubernetes.core collection with Ansible's templating and variable system, teams can standardize Dapr installations across multiple environments and integrate Dapr deployment into existing infrastructure automation workflows.
