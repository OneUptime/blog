# How to Use Ansible for Talos Linux Node Provisioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ansible, Node Provisioning, Kubernetes, Automation

Description: A practical guide to provisioning new Talos Linux nodes and adding them to existing clusters using Ansible automation workflows.

---

Adding new nodes to a Talos Linux cluster is a common operational task, whether you are scaling up to handle more workloads or replacing failed hardware. While `talosctl` handles the actual configuration application, Ansible provides the orchestration layer that makes provisioning consistent and repeatable. This guide focuses specifically on using Ansible to provision new Talos Linux nodes and integrate them into running clusters.

## The Node Provisioning Process

Provisioning a new Talos node involves several steps: preparing the hardware or virtual machine, generating the appropriate machine configuration, applying the configuration to the node, and verifying that it joins the cluster successfully. Each step can fail in different ways, so having automated checks and retries is important.

For bare metal nodes, you typically boot from a Talos ISO or PXE image. For cloud environments, you launch an instance with a Talos image. Either way, the node starts in maintenance mode and waits for a configuration to be applied via the Talos API on port 50000.

## Inventory Setup for New Nodes

Define new nodes in your Ansible inventory before provisioning:

```yaml
# inventory/hosts.yml
all:
  vars:
    cluster_name: "production"
    cluster_endpoint: "https://10.0.1.10:6443"
    talos_version: "v1.7.0"
    talosconfig_path: "./talosconfig"
    secrets_path: "./secrets.yaml"

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

    # New nodes to be provisioned
    new_workers:
      hosts:
        worker-3:
          node_ip: "10.0.1.23"
        worker-4:
          node_ip: "10.0.1.24"
```

## Pre-Provisioning Checks

Before applying configurations, verify that the new nodes are reachable and in maintenance mode:

```yaml
# playbooks/pre-provision-checks.yml
---
- name: Verify new nodes are ready for provisioning
  hosts: new_workers
  gather_facts: false
  connection: local

  tasks:
    - name: Check if node is reachable on Talos API port
      ansible.builtin.wait_for:
        host: "{{ node_ip }}"
        port: 50000
        timeout: 120
        state: started
      register: port_check

    - name: Verify node is in maintenance mode
      ansible.builtin.command:
        cmd: >
          talosctl disks
          --insecure
          --nodes {{ node_ip }}
      register: disk_check
      retries: 5
      delay: 10
      until: disk_check.rc == 0

    - name: Display available disks on node
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} ({{ node_ip }}): Disks - {{ disk_check.stdout }}"

    - name: Check if node already has a configuration
      ansible.builtin.command:
        cmd: >
          talosctl version
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: version_check
      ignore_errors: true

    - name: Warn if node is already configured
      ansible.builtin.debug:
        msg: "WARNING: {{ inventory_hostname }} appears to already be configured"
      when: version_check.rc == 0
```

## Generating Node Configurations

Generate the worker configuration for the new nodes using existing cluster secrets:

```yaml
# playbooks/generate-node-config.yml
---
- name: Generate configuration for new worker nodes
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Verify secrets file exists
      ansible.builtin.stat:
        path: "{{ secrets_path }}"
      register: secrets_file

    - name: Fail if secrets file is missing
      ansible.builtin.fail:
        msg: "Secrets file not found at {{ secrets_path }}. Cannot provision nodes without cluster secrets."
      when: not secrets_file.stat.exists

    - name: Generate worker configuration
      ansible.builtin.command:
        cmd: >
          talosctl gen config {{ cluster_name }} {{ cluster_endpoint }}
          --with-secrets {{ secrets_path }}
          --output-types worker
          --output ./generated/worker.yaml
          --force

    - name: Generate node-specific configurations with patches
      ansible.builtin.command:
        cmd: >
          talosctl machineconfig patch ./generated/worker.yaml
          --patch '[{"op": "replace", "path": "/machine/network/hostname", "value": "{{ item }}"}]'
          --output ./generated/{{ item }}.yaml
      loop: "{{ groups['new_workers'] }}"
```

## The Provisioning Playbook

The main provisioning playbook applies configurations and verifies cluster membership:

```yaml
# playbooks/provision-nodes.yml
---
- name: Run pre-provisioning checks
  ansible.builtin.import_playbook: pre-provision-checks.yml

- name: Generate node configurations
  ansible.builtin.import_playbook: generate-node-config.yml

- name: Provision new worker nodes
  hosts: new_workers
  gather_facts: false
  connection: local
  serial: 1

  tasks:
    - name: Apply machine configuration to node
      ansible.builtin.command:
        cmd: >
          talosctl apply-config
          --insecure
          --nodes {{ node_ip }}
          --file ./generated/{{ inventory_hostname }}.yaml
      register: apply_result

    - name: Display apply result
      ansible.builtin.debug:
        msg: "Configuration applied to {{ inventory_hostname }} ({{ node_ip }})"
      when: apply_result.rc == 0

    - name: Wait for node to install and reboot
      ansible.builtin.pause:
        seconds: 60

    - name: Wait for Talos API to become available after reboot
      ansible.builtin.command:
        cmd: >
          talosctl version
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
      register: api_check
      retries: 20
      delay: 15
      until: api_check.rc == 0

    - name: Wait for node to join the Kubernetes cluster
      ansible.builtin.command:
        cmd: kubectl get node {{ inventory_hostname }} -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
      register: node_ready
      retries: 30
      delay: 10
      until: node_ready.stdout == "True"

    - name: Report successful provisioning
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} successfully provisioned and joined the cluster"

- name: Post-provisioning verification
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Get full node list
      ansible.builtin.command:
        cmd: kubectl get nodes -o wide
      register: all_nodes

    - name: Display cluster nodes
      ansible.builtin.debug:
        var: all_nodes.stdout_lines

    - name: Verify new nodes are ready
      ansible.builtin.command:
        cmd: >
          kubectl get node {{ item }}
          -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
      register: node_status
      loop: "{{ groups['new_workers'] }}"
      failed_when: node_status.stdout != "True"

    - name: Run cluster health check
      ansible.builtin.command:
        cmd: >
          talosctl health
          --nodes {{ hostvars[groups['controlplane'][0]]['node_ip'] }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
```

## Applying Labels and Taints

After provisioning, you may want to label or taint the new nodes:

```yaml
# playbooks/label-nodes.yml
---
- name: Apply labels and taints to new nodes
  hosts: new_workers
  gather_facts: false
  connection: local

  vars:
    node_labels:
      - "node-pool=general"
      - "environment=production"
    node_taints: []

  tasks:
    - name: Apply labels to node
      ansible.builtin.command:
        cmd: "kubectl label node {{ inventory_hostname }} {{ item }} --overwrite"
      loop: "{{ node_labels }}"

    - name: Apply taints to node
      ansible.builtin.command:
        cmd: "kubectl taint node {{ inventory_hostname }} {{ item }}"
      loop: "{{ node_taints }}"
      when: node_taints | length > 0
```

## Running the Full Provisioning Workflow

Execute provisioning with these commands:

```bash
# Provision all new workers
ansible-playbook -i inventory/hosts.yml playbooks/provision-nodes.yml

# Provision a specific node
ansible-playbook -i inventory/hosts.yml playbooks/provision-nodes.yml \
  --limit worker-3

# Apply labels after provisioning
ansible-playbook -i inventory/hosts.yml playbooks/label-nodes.yml
```

## Handling Failures

If provisioning fails partway through, you can safely re-run the playbook. The pre-provisioning checks will detect if a node is already configured, and the configuration apply is idempotent. For nodes that get stuck, you can add a reset task:

```yaml
- name: Reset a stuck node
  ansible.builtin.command:
    cmd: >
      talosctl reset
      --nodes {{ node_ip }}
      --talosconfig {{ talosconfig_path }}
      --graceful=false
  when: reset_node | default(false) | bool
```

Using Ansible for Talos node provisioning gives you a structured, repeatable process that handles the full lifecycle from pre-checks through verification. The serial execution ensures that failures on one node do not cascade, and the retry logic handles the timing issues that naturally come with node reboots and cluster joins.
