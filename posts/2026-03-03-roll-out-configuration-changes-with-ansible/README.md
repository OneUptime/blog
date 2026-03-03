# How to Roll Out Configuration Changes with Ansible

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ansible, Rolling Update, Kubernetes, Configuration Management

Description: Learn how to safely roll out Talos Linux configuration changes across cluster nodes using Ansible with canary deployments and rollback strategies.

---

Pushing configuration changes to a Talos Linux cluster needs to be done carefully. A change that works fine on one node might cause problems on another, and applying changes to all nodes simultaneously is a recipe for cluster-wide outages. Ansible gives you the tools to roll out changes incrementally, verify each step, and roll back if something goes wrong. This guide covers strategies for safe configuration rollouts using Ansible.

## The Risk of Configuration Changes

Talos Linux configuration changes can affect networking, storage, kernel parameters, Kubernetes settings, and more. Some changes take effect immediately, while others require a node reboot. If a network change makes a control plane node unreachable, you could lose quorum in etcd and take down the entire cluster.

The key principle is to never apply a change to all nodes at once. Instead, roll out changes node by node (or in small batches), verify that each node is healthy after the change, and stop immediately if anything goes wrong.

## Canary Deployment Strategy

The safest approach is to apply changes to a single "canary" node first, verify it thoroughly, and then proceed to the rest:

```yaml
# playbooks/canary-rollout.yml
---
- name: Apply configuration to canary node first
  hosts: workers[0]
  gather_facts: false
  connection: local

  vars:
    config_dir: "{{ playbook_dir }}/../generated/{{ cluster_name }}"
    verification_wait: 120

  tasks:
    - name: Display canary node information
      ansible.builtin.debug:
        msg: "Applying configuration change to canary node: {{ inventory_hostname }} ({{ node_ip }})"

    - name: Get current configuration hash
      ansible.builtin.command:
        cmd: >
          talosctl get machineconfig
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          -o jsonpath='{.metadata.uid}'
      register: pre_change_hash
      ignore_errors: true

    - name: Apply configuration to canary node
      ansible.builtin.command:
        cmd: >
          talosctl apply-config
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --file {{ config_dir }}/{{ inventory_hostname }}.yaml
      register: apply_result

    - name: Wait for configuration to take effect
      ansible.builtin.pause:
        seconds: "{{ verification_wait }}"

    - name: Verify node health after change
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
      register: health_check
      retries: 3
      delay: 15
      until: health_check.rc == 0

    - name: Check that Kubernetes node is ready
      ansible.builtin.command:
        cmd: >
          kubectl get node {{ inventory_hostname }}
          -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
      register: k8s_ready
      retries: 10
      delay: 10
      until: k8s_ready.stdout == "True"

    - name: Run workload health check on canary
      ansible.builtin.command:
        cmd: kubectl get pods --field-selector spec.nodeName={{ inventory_hostname }} -o wide
      register: pod_status

    - name: Display pods on canary node
      ansible.builtin.debug:
        var: pod_status.stdout_lines

    - name: Prompt for approval to continue
      ansible.builtin.pause:
        prompt: "Canary node {{ inventory_hostname }} updated. Review the output above. Press Enter to continue rollout or Ctrl+C to abort."

- name: Roll out to remaining worker nodes
  hosts: workers[1:]
  gather_facts: false
  connection: local
  serial: 1

  vars:
    config_dir: "{{ playbook_dir }}/../generated/{{ cluster_name }}"

  tasks:
    - name: Apply configuration to node
      ansible.builtin.command:
        cmd: >
          talosctl apply-config
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --file {{ config_dir }}/{{ inventory_hostname }}.yaml
      register: apply_result

    - name: Wait for node health
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
      retries: 3
      delay: 15
      register: health
      until: health.rc == 0

    - name: Verify Kubernetes node readiness
      ansible.builtin.command:
        cmd: >
          kubectl get node {{ inventory_hostname }}
          -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
      register: ready
      retries: 10
      delay: 10
      until: ready.stdout == "True"
```

## Rolling Deployment with Batch Size

For larger clusters, you can control the batch size to speed up rollouts while still limiting risk:

```yaml
# playbooks/rolling-rollout.yml
---
- name: Roll out control plane changes one at a time
  hosts: controlplane
  gather_facts: false
  connection: local
  serial: 1

  vars:
    config_dir: "{{ playbook_dir }}/../generated/{{ cluster_name }}"
    max_failures: 0

  tasks:
    - name: Drain control plane node
      ansible.builtin.command:
        cmd: >
          kubectl drain {{ inventory_hostname }}
          --ignore-daemonsets
          --delete-emptydir-data
          --timeout=120s
      ignore_errors: true

    - name: Apply new configuration
      ansible.builtin.command:
        cmd: >
          talosctl apply-config
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --file {{ config_dir }}/{{ inventory_hostname }}.yaml

    - name: Wait for node health
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
      retries: 3
      delay: 20
      register: health
      until: health.rc == 0

    - name: Uncordon node
      ansible.builtin.command:
        cmd: kubectl uncordon {{ inventory_hostname }}

    - name: Verify etcd cluster health
      ansible.builtin.command:
        cmd: >
          talosctl etcd status
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: etcd_status

    - name: Wait between control plane updates
      ansible.builtin.pause:
        seconds: 30

- name: Roll out worker changes in batches
  hosts: workers
  gather_facts: false
  connection: local
  serial: 2  # Process two workers at a time
  max_fail_percentage: 0

  vars:
    config_dir: "{{ playbook_dir }}/../generated/{{ cluster_name }}"

  tasks:
    - name: Drain worker node
      ansible.builtin.command:
        cmd: >
          kubectl drain {{ inventory_hostname }}
          --ignore-daemonsets
          --delete-emptydir-data
          --timeout=120s
      ignore_errors: true

    - name: Apply new configuration
      ansible.builtin.command:
        cmd: >
          talosctl apply-config
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --file {{ config_dir }}/{{ inventory_hostname }}.yaml

    - name: Wait for node health
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
      retries: 3
      delay: 20
      register: health
      until: health.rc == 0

    - name: Uncordon worker
      ansible.builtin.command:
        cmd: kubectl uncordon {{ inventory_hostname }}
```

## Rollback Strategy

Prepare for rollbacks by saving the current configuration before making changes:

```yaml
# playbooks/backup-and-rollout.yml
---
- name: Backup current configurations
  hosts: all
  gather_facts: false
  connection: local

  vars:
    backup_dir: "{{ playbook_dir }}/../backups/{{ ansible_date_time.date | default('latest') }}"

  tasks:
    - name: Create backup directory
      ansible.builtin.file:
        path: "{{ backup_dir }}"
        state: directory
        mode: '0700'
      run_once: true

    - name: Save current machine configuration
      ansible.builtin.shell:
        cmd: >
          talosctl get machineconfig
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          -o yaml > {{ backup_dir }}/{{ inventory_hostname }}-backup.yaml
      ignore_errors: true

- name: Proceed with rollout
  ansible.builtin.import_playbook: rolling-rollout.yml
```

Create a rollback playbook that restores the backed-up configurations:

```yaml
# playbooks/rollback.yml
---
- name: Rollback to previous configuration
  hosts: all
  gather_facts: false
  connection: local
  serial: 1

  vars:
    backup_dir: "{{ playbook_dir }}/../backups/latest"

  tasks:
    - name: Check if backup exists for this node
      ansible.builtin.stat:
        path: "{{ backup_dir }}/{{ inventory_hostname }}-backup.yaml"
      register: backup_file

    - name: Fail if no backup found
      ansible.builtin.fail:
        msg: "No backup found for {{ inventory_hostname }}"
      when: not backup_file.stat.exists

    - name: Apply backup configuration
      ansible.builtin.command:
        cmd: >
          talosctl apply-config
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --file {{ backup_dir }}/{{ inventory_hostname }}-backup.yaml

    - name: Wait for node to stabilize after rollback
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
      retries: 3
      delay: 20
      register: health
      until: health.rc == 0
```

## Running Configuration Rollouts

```bash
# Canary rollout - applies to one node first, then prompts for approval
ansible-playbook -i inventory/production playbooks/canary-rollout.yml

# Rolling rollout - applies to all nodes in sequence
ansible-playbook -i inventory/production playbooks/rolling-rollout.yml

# Backup and rollout - saves current configs then rolls out
ansible-playbook -i inventory/production playbooks/backup-and-rollout.yml

# Rollback if something went wrong
ansible-playbook -i inventory/production playbooks/rollback.yml
```

Rolling out configuration changes to a Talos cluster does not have to be stressful. With Ansible handling the orchestration, you get controlled serial execution, automatic health checks, canary testing, and rollback capability. The key is to build these safety mechanisms into your workflow from the start rather than trying to add them after a production incident.
