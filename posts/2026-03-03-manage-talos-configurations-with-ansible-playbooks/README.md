# How to Manage Talos Configurations with Ansible Playbooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ansible, Configuration Management, Kubernetes, DevOps

Description: A detailed guide to managing and applying Talos Linux machine configurations using Ansible playbooks for consistent cluster management.

---

Managing Talos Linux configurations across a cluster can get complex as your environment grows. Different node roles, network configurations, and custom patches all need to be tracked and applied consistently. Ansible playbooks offer a structured way to manage these configurations, making it easy to generate, validate, and apply Talos machine configs across your entire fleet. This guide shows you how to build a robust configuration management workflow for Talos using Ansible.

## The Challenge of Configuration Management

Every Talos node has a machine configuration that defines its role, network settings, cluster membership, and custom patches. In a small cluster with three control plane nodes and three workers, you might get away with managing configs manually. But as you add more clusters, more environments, or more customization, the manual approach breaks down quickly.

Common problems include configuration drift between nodes, forgetting to apply a patch to all relevant nodes, and losing track of which configuration version is running where. Ansible addresses all of these by providing a single source of truth for your configurations and a reliable way to push them to your nodes.

## Project Layout

Set up your project to separate concerns cleanly:

```text
talos-config-management/
  ansible.cfg
  inventory/
    production/
      hosts.yml
      group_vars/
        all.yml
        controlplane.yml
        workers.yml
    staging/
      hosts.yml
      group_vars/
        all.yml
  playbooks/
    generate-configs.yml
    apply-configs.yml
    validate-configs.yml
  templates/
    patches/
      common.yaml.j2
      controlplane.yaml.j2
      worker.yaml.j2
      network.yaml.j2
  files/
    secrets/
```

## Defining Configuration Variables

Use Ansible group variables to define configuration parameters for different node roles:

```yaml
# inventory/production/group_vars/all.yml
cluster_name: "production"
cluster_endpoint: "https://lb.production.example.com:6443"
talos_version: "v1.7.0"
kubernetes_version: "1.30.0"
talosconfig_path: "{{ playbook_dir }}/../files/talosconfig"
secrets_path: "{{ playbook_dir }}/../files/secrets/secrets.yaml"

# Common configuration patches applied to all nodes
common_patches:
  - machine:
      time:
        servers:
          - time.google.com
          - time.cloudflare.com
      logging:
        destinations:
          - endpoint: "tcp://logs.example.com:5044"
            format: json_lines
      sysctls:
        net.core.somaxconn: "65535"
        vm.max_map_count: "262144"
```

```yaml
# inventory/production/group_vars/controlplane.yml
node_role: controlplane
disk_device: /dev/sda
install_image: "ghcr.io/siderolabs/installer:{{ talos_version }}"

controlplane_patches:
  - cluster:
      etcd:
        extraArgs:
          election-timeout: "5000"
          heartbeat-interval: "500"
      apiServer:
        extraArgs:
          audit-log-maxage: "30"
          audit-log-maxbackup: "10"
```

```yaml
# inventory/production/group_vars/workers.yml
node_role: worker
disk_device: /dev/sda
install_image: "ghcr.io/siderolabs/installer:{{ talos_version }}"

worker_patches:
  - machine:
      kubelet:
        extraArgs:
          max-pods: "250"
          image-gc-high-threshold: "85"
          image-gc-low-threshold: "80"
```

## Configuration Generation Playbook

Create a playbook that generates Talos configurations with all patches applied:

```yaml
# playbooks/generate-configs.yml
---
- name: Generate Talos machine configurations
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Ensure secrets file exists
      ansible.builtin.command:
        cmd: talosctl gen secrets -o {{ secrets_path }}
        creates: "{{ secrets_path }}"

    - name: Create output directory for configs
      ansible.builtin.file:
        path: "{{ playbook_dir }}/../generated/{{ cluster_name }}"
        state: directory
        mode: '0700'

    - name: Generate base configuration
      ansible.builtin.command:
        cmd: >
          talosctl gen config {{ cluster_name }} {{ cluster_endpoint }}
          --with-secrets {{ secrets_path }}
          --output-dir {{ playbook_dir }}/../generated/{{ cluster_name }}
          --force

- name: Generate per-node configurations with patches
  hosts: all
  gather_facts: false
  tasks:
    - name: Create node-specific patch file
      ansible.builtin.template:
        src: "patches/{{ node_role }}.yaml.j2"
        dest: "{{ playbook_dir }}/../generated/{{ cluster_name }}/{{ inventory_hostname }}-patch.yaml"
        mode: '0600'
      delegate_to: localhost

    - name: Create common patch file for this node
      ansible.builtin.template:
        src: "patches/common.yaml.j2"
        dest: "{{ playbook_dir }}/../generated/{{ cluster_name }}/{{ inventory_hostname }}-common-patch.yaml"
        mode: '0600'
      delegate_to: localhost

    - name: Generate final node configuration with patches
      ansible.builtin.command:
        cmd: >
          talosctl machineconfig patch
          {{ playbook_dir }}/../generated/{{ cluster_name }}/{{ node_role }}.yaml
          --patch @{{ playbook_dir }}/../generated/{{ cluster_name }}/{{ inventory_hostname }}-patch.yaml
          --patch @{{ playbook_dir }}/../generated/{{ cluster_name }}/{{ inventory_hostname }}-common-patch.yaml
          --output {{ playbook_dir }}/../generated/{{ cluster_name }}/{{ inventory_hostname }}.yaml
      delegate_to: localhost
```

## Configuration Patches with Jinja2 Templates

Templates let you customize configurations based on node-specific variables:

```yaml
# templates/patches/controlplane.yaml.j2
machine:
  install:
    image: {{ install_image }}
    disk: {{ disk_device }}
  network:
    hostname: {{ inventory_hostname }}
{% if node_ip is defined %}
    interfaces:
      - interface: eth0
        addresses:
          - {{ node_ip }}/24
{% endif %}
{% for patch in controlplane_patches %}
{{ patch | to_nice_yaml(indent=2) }}
{% endfor %}
```

```yaml
# templates/patches/common.yaml.j2
{% for patch in common_patches %}
{{ patch | to_nice_yaml(indent=2) }}
{% endfor %}
```

## Applying Configurations

The apply playbook pushes configurations to nodes in the correct order:

```yaml
# playbooks/apply-configs.yml
---
- name: Apply configurations to control plane nodes
  hosts: controlplane
  gather_facts: false
  serial: 1

  tasks:
    - name: Check current node version
      ansible.builtin.command:
        cmd: >
          talosctl version --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --short
      delegate_to: localhost
      register: current_version
      ignore_errors: true

    - name: Apply node configuration
      ansible.builtin.command:
        cmd: >
          talosctl apply-config
          {% if current_version.rc != 0 %}--insecure{% endif %}
          --nodes {{ node_ip }}
          --file {{ playbook_dir }}/../generated/{{ cluster_name }}/{{ inventory_hostname }}.yaml
          --talosconfig {{ talosconfig_path }}
      delegate_to: localhost
      register: apply_result

    - name: Wait for node to stabilize
      ansible.builtin.command:
        cmd: >
          talosctl health --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
      delegate_to: localhost
      when: apply_result.changed

- name: Apply configurations to worker nodes
  hosts: workers
  gather_facts: false
  serial: 2

  tasks:
    - name: Apply worker configuration
      ansible.builtin.command:
        cmd: >
          talosctl apply-config
          --nodes {{ node_ip }}
          --file {{ playbook_dir }}/../generated/{{ cluster_name }}/{{ inventory_hostname }}.yaml
          --talosconfig {{ talosconfig_path }}
      delegate_to: localhost

    - name: Wait for worker to be healthy
      ansible.builtin.command:
        cmd: >
          talosctl health --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          --wait-timeout 5m
      delegate_to: localhost
```

## Validating Configurations

Always validate configurations before applying them:

```yaml
# playbooks/validate-configs.yml
---
- name: Validate Talos machine configurations
  hosts: all
  gather_facts: false
  tasks:
    - name: Validate node configuration file
      ansible.builtin.command:
        cmd: >
          talosctl validate
          --config {{ playbook_dir }}/../generated/{{ cluster_name }}/{{ inventory_hostname }}.yaml
          --mode metal
      delegate_to: localhost
      register: validation_result

    - name: Report validation status
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: Configuration is valid"
      when: validation_result.rc == 0
```

## Running the Workflow

Execute the full workflow with these commands:

```bash
# Generate all configurations
ansible-playbook -i inventory/production playbooks/generate-configs.yml

# Validate before applying
ansible-playbook -i inventory/production playbooks/validate-configs.yml

# Apply configurations to the cluster
ansible-playbook -i inventory/production playbooks/apply-configs.yml
```

Managing Talos configurations with Ansible gives you version-controlled, templated, and validated configuration management that scales from a single cluster to dozens. The combination of Jinja2 templates for customization, group variables for role-based settings, and serial execution for safe rollouts makes Ansible a strong fit for Talos configuration management.
