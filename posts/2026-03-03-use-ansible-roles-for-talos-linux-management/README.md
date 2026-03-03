# How to Use Ansible Roles for Talos Linux Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ansible, Ansible Roles, Kubernetes, Configuration Management

Description: Learn how to organize Talos Linux management tasks into reusable Ansible roles for clean and maintainable cluster automation.

---

As your Talos Linux automation grows beyond a few playbooks, you need a way to organize and reuse your code. Ansible roles provide exactly that. They let you package related tasks, templates, variables, and handlers into self-contained units that can be shared across projects and teams. This guide shows you how to design and implement Ansible roles specifically for Talos Linux cluster management.

## Why Roles for Talos Management?

Without roles, your Talos playbooks tend to grow into long, monolithic files that are hard to maintain and impossible to reuse. A role-based approach lets you break things into logical components - one role for generating configurations, another for applying them, another for upgrades, and so on. Each role has a clear purpose, its own variables, and can be tested independently.

Roles also make it easy to share common Talos management patterns across multiple clusters. When you improve your upgrade procedure, you update the role once and every cluster that uses it benefits.

## Role Directory Structure

Ansible roles follow a standard directory layout. Here is what a Talos management role looks like:

```text
roles/
  talos-secrets/
    tasks/
      main.yml
    defaults/
      main.yml
    files/
    meta/
      main.yml

  talos-config/
    tasks/
      main.yml
      generate.yml
      validate.yml
    templates/
      controlplane-patch.yaml.j2
      worker-patch.yaml.j2
      common-patch.yaml.j2
    defaults/
      main.yml
    vars/
      main.yml

  talos-deploy/
    tasks/
      main.yml
      apply-controlplane.yml
      apply-workers.yml
      bootstrap.yml
    defaults/
      main.yml
    handlers/
      main.yml

  talos-upgrade/
    tasks/
      main.yml
      pre-checks.yml
      upgrade-os.yml
      upgrade-k8s.yml
      post-checks.yml
    defaults/
      main.yml

  talos-monitoring/
    tasks/
      main.yml
    templates/
      health-check.sh.j2
    defaults/
      main.yml
```

## The Secrets Role

This role handles generating and managing Talos cluster secrets:

```yaml
# roles/talos-secrets/defaults/main.yml
secrets_output_path: "{{ playbook_dir }}/files/secrets"
talos_version: "v1.7.0"
force_regenerate_secrets: false
```

```yaml
# roles/talos-secrets/tasks/main.yml
---
- name: Create secrets output directory
  ansible.builtin.file:
    path: "{{ secrets_output_path }}"
    state: directory
    mode: '0700'

- name: Check if secrets file already exists
  ansible.builtin.stat:
    path: "{{ secrets_output_path }}/secrets.yaml"
  register: secrets_file

- name: Generate Talos machine secrets
  ansible.builtin.command:
    cmd: >
      talosctl gen secrets
      -o {{ secrets_output_path }}/secrets.yaml
  when: not secrets_file.stat.exists or force_regenerate_secrets

- name: Set secrets path fact for other roles
  ansible.builtin.set_fact:
    talos_secrets_path: "{{ secrets_output_path }}/secrets.yaml"
```

## The Configuration Role

This role generates and manages Talos machine configurations:

```yaml
# roles/talos-config/defaults/main.yml
config_output_dir: "{{ playbook_dir }}/generated/{{ cluster_name }}"
talos_version: "v1.7.0"
kubernetes_version: "1.30.0"
cluster_name: "default-cluster"
cluster_endpoint: ""
install_disk: "/dev/sda"
```

```yaml
# roles/talos-config/tasks/main.yml
---
- name: Include configuration generation tasks
  ansible.builtin.include_tasks: generate.yml

- name: Include configuration validation tasks
  ansible.builtin.include_tasks: validate.yml
```

```yaml
# roles/talos-config/tasks/generate.yml
---
- name: Create config output directory
  ansible.builtin.file:
    path: "{{ config_output_dir }}"
    state: directory
    mode: '0700'

- name: Generate base Talos configuration
  ansible.builtin.command:
    cmd: >
      talosctl gen config {{ cluster_name }} {{ cluster_endpoint }}
      --with-secrets {{ talos_secrets_path }}
      --output-dir {{ config_output_dir }}
      --force

- name: Generate control plane patches from template
  ansible.builtin.template:
    src: controlplane-patch.yaml.j2
    dest: "{{ config_output_dir }}/cp-patch.yaml"
    mode: '0600'

- name: Generate worker patches from template
  ansible.builtin.template:
    src: worker-patch.yaml.j2
    dest: "{{ config_output_dir }}/worker-patch.yaml"
    mode: '0600'

- name: Apply patches to control plane config
  ansible.builtin.command:
    cmd: >
      talosctl machineconfig patch
      {{ config_output_dir }}/controlplane.yaml
      --patch @{{ config_output_dir }}/cp-patch.yaml
      --output {{ config_output_dir }}/controlplane-patched.yaml

- name: Apply patches to worker config
  ansible.builtin.command:
    cmd: >
      talosctl machineconfig patch
      {{ config_output_dir }}/worker.yaml
      --patch @{{ config_output_dir }}/worker-patch.yaml
      --output {{ config_output_dir }}/worker-patched.yaml
```

```yaml
# roles/talos-config/tasks/validate.yml
---
- name: Validate control plane configuration
  ansible.builtin.command:
    cmd: >
      talosctl validate
      --config {{ config_output_dir }}/controlplane-patched.yaml
      --mode metal
  register: cp_validation

- name: Validate worker configuration
  ansible.builtin.command:
    cmd: >
      talosctl validate
      --config {{ config_output_dir }}/worker-patched.yaml
      --mode metal
  register: worker_validation

- name: Report validation results
  ansible.builtin.debug:
    msg: "All configurations validated successfully"
  when: cp_validation.rc == 0 and worker_validation.rc == 0
```

## The Deploy Role

This role handles applying configurations and bootstrapping:

```yaml
# roles/talos-deploy/defaults/main.yml
health_wait_timeout: "5m"
bootstrap_pause_seconds: 120
apply_serial: 1
```

```yaml
# roles/talos-deploy/tasks/main.yml
---
- name: Apply configurations to control plane
  ansible.builtin.include_tasks: apply-controlplane.yml
  when: "'controlplane' in group_names"

- name: Bootstrap the cluster
  ansible.builtin.include_tasks: bootstrap.yml
  when: bootstrap_node | default(false)

- name: Apply configurations to workers
  ansible.builtin.include_tasks: apply-workers.yml
  when: "'workers' in group_names"
```

```yaml
# roles/talos-deploy/tasks/apply-controlplane.yml
---
- name: Apply control plane configuration
  ansible.builtin.command:
    cmd: >
      talosctl apply-config
      --insecure
      --nodes {{ node_ip }}
      --file {{ config_output_dir }}/controlplane-patched.yaml
  delegate_to: localhost

- name: Wait for control plane node to be healthy
  ansible.builtin.command:
    cmd: >
      talosctl health
      --nodes {{ node_ip }}
      --talosconfig {{ talosconfig_path }}
      --wait-timeout {{ health_wait_timeout }}
  delegate_to: localhost
  retries: 3
  delay: 30
  register: health
  until: health.rc == 0
  ignore_errors: true
```

## The Upgrade Role

This role manages the upgrade process:

```yaml
# roles/talos-upgrade/defaults/main.yml
upgrade_image: "ghcr.io/siderolabs/installer:{{ target_talos_version }}"
target_talos_version: ""
target_k8s_version: ""
upgrade_preserve: true
drain_timeout: "120s"
```

```yaml
# roles/talos-upgrade/tasks/main.yml
---
- name: Run pre-upgrade checks
  ansible.builtin.include_tasks: pre-checks.yml

- name: Upgrade Talos OS
  ansible.builtin.include_tasks: upgrade-os.yml
  when: target_talos_version | length > 0

- name: Upgrade Kubernetes
  ansible.builtin.include_tasks: upgrade-k8s.yml
  when: target_k8s_version | length > 0

- name: Run post-upgrade checks
  ansible.builtin.include_tasks: post-checks.yml
```

## Using Roles in Playbooks

With roles defined, your playbooks become clean and focused:

```yaml
# playbooks/deploy-cluster.yml
---
- name: Generate secrets
  hosts: localhost
  roles:
    - role: talos-secrets
      vars:
        talos_version: "v1.7.0"

- name: Generate configurations
  hosts: localhost
  roles:
    - role: talos-config
      vars:
        cluster_name: "production"
        cluster_endpoint: "https://lb.prod.example.com:6443"

- name: Deploy control plane
  hosts: controlplane
  serial: 1
  roles:
    - role: talos-deploy

- name: Deploy workers
  hosts: workers
  serial: 1
  roles:
    - role: talos-deploy
```

```yaml
# playbooks/upgrade-cluster.yml
---
- name: Upgrade cluster
  hosts: all
  serial: 1
  roles:
    - role: talos-upgrade
      vars:
        target_talos_version: "v1.8.0"
        target_k8s_version: "1.31.0"
```

## Role Dependencies

Define role dependencies in the `meta/main.yml` file so they execute automatically:

```yaml
# roles/talos-deploy/meta/main.yml
---
dependencies:
  - role: talos-secrets
  - role: talos-config
```

## Publishing and Sharing Roles

Package your roles for reuse with Ansible Galaxy:

```bash
# Create a role skeleton
ansible-galaxy role init talos-deploy

# Install a role from a Git repository
ansible-galaxy install git+https://github.com/yourorg/ansible-role-talos-deploy.git
```

Using Ansible roles for Talos management brings structure, reusability, and clarity to your automation. Each role encapsulates a specific responsibility, making it easier to understand, test, and maintain your cluster management code as it grows.
