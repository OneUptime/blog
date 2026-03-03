# How to Automate Talos Upgrades with Ansible

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ansible, Upgrade, Kubernetes, Automation

Description: Learn how to automate Talos Linux cluster upgrades with Ansible playbooks including rolling updates and health verification.

---

Upgrading Talos Linux across a cluster requires careful coordination. You need to upgrade nodes in the right order, wait for each node to come back healthy before moving to the next, and handle potential failures gracefully. Ansible is well suited for this kind of orchestrated workflow. This guide shows you how to build Ansible playbooks that automate Talos upgrades safely and reliably.

## Understanding the Upgrade Path

Talos Linux upgrades work differently than traditional OS upgrades. Since the operating system is immutable, you cannot patch individual packages. Instead, you replace the entire OS image with a new version. The `talosctl upgrade` command handles this by downloading the new image, writing it to the inactive partition, and rebooting the node.

There are two separate upgrade paths to consider:

1. **Talos OS upgrade** - Updates the operating system
2. **Kubernetes upgrade** - Updates the Kubernetes components

Both should be handled in your Ansible automation, but they are triggered through different commands.

## Ansible Project Setup

Organize your upgrade playbooks and variables:

```yaml
# inventory/hosts.yml
all:
  vars:
    current_talos_version: "v1.7.0"
    target_talos_version: "v1.8.0"
    target_k8s_version: "1.30.0"
    talosconfig_path: "./talosconfig"
    upgrade_image: "ghcr.io/siderolabs/installer:{{ target_talos_version }}"
    # Maximum time to wait for a node to come back after upgrade
    health_timeout: "10m"

  children:
    controlplane:
      hosts:
        cp-0:
          node_ip: "10.0.1.10"
        cp-1:
          node_ip: "10.0.1.11"
        cp-2:
          node_ip: "10.0.1.12"

    workers:
      hosts:
        worker-0:
          node_ip: "10.0.1.20"
        worker-1:
          node_ip: "10.0.1.21"
        worker-2:
          node_ip: "10.0.1.22"
```

## Pre-Upgrade Validation Playbook

Always validate the cluster state before starting an upgrade:

```yaml
# playbooks/pre-upgrade-checks.yml
---
- name: Run pre-upgrade validation
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Check cluster health
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ hostvars[groups['controlplane'][0]]['node_ip'] }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 2m
      register: cluster_health

    - name: Fail if cluster is not healthy
      ansible.builtin.fail:
        msg: "Cluster is not healthy. Fix issues before upgrading."
      when: cluster_health.rc != 0

    - name: Check current Talos versions on all nodes
      ansible.builtin.command:
        cmd: >
          talosctl version
          --nodes {{ hostvars[item]['node_ip'] }}
          --talosconfig {{ talosconfig_path }}
          --short
      loop: "{{ groups['controlplane'] + groups['workers'] }}"
      register: version_checks

    - name: Display current versions
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ item.stdout }}"
      loop: "{{ version_checks.results }}"

    - name: Verify all Kubernetes nodes are ready
      ansible.builtin.command:
        cmd: kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}'
      register: k8s_nodes

    - name: Display Kubernetes node status
      ansible.builtin.debug:
        var: k8s_nodes.stdout_lines

    - name: Create etcd backup before upgrade
      ansible.builtin.command:
        cmd: >
          talosctl etcd snapshot etcd-backup-{{ ansible_date_time.iso8601_basic_short | default('backup') }}.db
          --nodes {{ hostvars[groups['controlplane'][0]]['node_ip'] }}
          --talosconfig {{ talosconfig_path }}
      register: backup_result

    - name: Confirm backup was created
      ansible.builtin.debug:
        msg: "etcd backup created successfully"
      when: backup_result.rc == 0
```

## Talos OS Upgrade Playbook

The main upgrade playbook handles the rolling OS upgrade:

```yaml
# playbooks/upgrade-talos.yml
---
- name: Pre-upgrade validation
  ansible.builtin.import_playbook: pre-upgrade-checks.yml

- name: Upgrade control plane nodes
  hosts: controlplane
  gather_facts: false
  connection: local
  serial: 1

  tasks:
    - name: Check current version on node
      ansible.builtin.command:
        cmd: >
          talosctl version
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --short
      register: current_version

    - name: Display current version
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} current version: {{ current_version.stdout }}"

    - name: Drain node before upgrade
      ansible.builtin.command:
        cmd: >
          kubectl drain {{ inventory_hostname }}
          --ignore-daemonsets
          --delete-emptydir-data
          --timeout=120s
      ignore_errors: true

    - name: Upgrade Talos on control plane node
      ansible.builtin.command:
        cmd: >
          talosctl upgrade
          --nodes {{ node_ip }}
          --image {{ upgrade_image }}
          --talosconfig {{ talosconfig_path }}
          --preserve
      register: upgrade_result

    - name: Wait for node to reboot and come back
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout {{ health_timeout }}
      register: health_result
      retries: 3
      delay: 30
      until: health_result.rc == 0

    - name: Verify new version
      ansible.builtin.command:
        cmd: >
          talosctl version
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --short
      register: new_version

    - name: Display new version
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} upgraded to: {{ new_version.stdout }}"

    - name: Uncordon node
      ansible.builtin.command:
        cmd: kubectl uncordon {{ inventory_hostname }}

    - name: Wait for node to be ready in Kubernetes
      ansible.builtin.command:
        cmd: >
          kubectl get node {{ inventory_hostname }}
          -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
      register: node_ready
      retries: 20
      delay: 10
      until: node_ready.stdout == "True"

    - name: Pause between control plane upgrades
      ansible.builtin.pause:
        seconds: 30

- name: Upgrade worker nodes
  hosts: workers
  gather_facts: false
  connection: local
  serial: 1

  tasks:
    - name: Drain worker node
      ansible.builtin.command:
        cmd: >
          kubectl drain {{ inventory_hostname }}
          --ignore-daemonsets
          --delete-emptydir-data
          --timeout=120s
      ignore_errors: true

    - name: Upgrade Talos on worker node
      ansible.builtin.command:
        cmd: >
          talosctl upgrade
          --nodes {{ node_ip }}
          --image {{ upgrade_image }}
          --talosconfig {{ talosconfig_path }}
          --preserve
      register: upgrade_result

    - name: Wait for worker to come back healthy
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout {{ health_timeout }}
      retries: 3
      delay: 30
      register: health_check
      until: health_check.rc == 0

    - name: Uncordon worker node
      ansible.builtin.command:
        cmd: kubectl uncordon {{ inventory_hostname }}

    - name: Wait for worker to be ready
      ansible.builtin.command:
        cmd: >
          kubectl get node {{ inventory_hostname }}
          -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
      register: worker_ready
      retries: 20
      delay: 10
      until: worker_ready.stdout == "True"

- name: Post-upgrade verification
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Final cluster health check
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ hostvars[groups['controlplane'][0]]['node_ip'] }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m

    - name: Display final cluster status
      ansible.builtin.command:
        cmd: kubectl get nodes -o wide
      register: final_status

    - name: Show final status
      ansible.builtin.debug:
        var: final_status.stdout_lines
```

## Kubernetes Version Upgrade

Upgrading the Kubernetes version is a separate operation:

```yaml
# playbooks/upgrade-kubernetes.yml
---
- name: Upgrade Kubernetes version
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Check current Kubernetes version
      ansible.builtin.command:
        cmd: kubectl version --short
      register: current_k8s

    - name: Display current Kubernetes version
      ansible.builtin.debug:
        var: current_k8s.stdout_lines

    - name: Trigger Kubernetes upgrade
      ansible.builtin.command:
        cmd: >
          talosctl upgrade-k8s
          --to {{ target_k8s_version }}
          --nodes {{ hostvars[groups['controlplane'][0]]['node_ip'] }}
          --talosconfig {{ talosconfig_path }}
      register: k8s_upgrade

    - name: Display upgrade result
      ansible.builtin.debug:
        var: k8s_upgrade.stdout_lines

    - name: Verify new Kubernetes version
      ansible.builtin.command:
        cmd: kubectl version --short
      register: new_k8s

    - name: Display new version
      ansible.builtin.debug:
        var: new_k8s.stdout_lines
```

## Running the Upgrade

Execute the upgrade playbooks:

```bash
# Run pre-upgrade checks only
ansible-playbook -i inventory/hosts.yml playbooks/pre-upgrade-checks.yml

# Run the full Talos OS upgrade
ansible-playbook -i inventory/hosts.yml playbooks/upgrade-talos.yml

# Upgrade Kubernetes version
ansible-playbook -i inventory/hosts.yml playbooks/upgrade-kubernetes.yml

# Upgrade a specific node only
ansible-playbook -i inventory/hosts.yml playbooks/upgrade-talos.yml --limit cp-0
```

Automating Talos upgrades with Ansible gives you a controlled, repeatable process that minimizes risk. The serial execution ensures only one node is upgraded at a time, the health checks verify each node before moving forward, and the drain/uncordon workflow protects running workloads throughout the process.
