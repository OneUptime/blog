# How to Validate Talos Configuration with Ansible

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ansible, Configuration Validation, Kubernetes, DevOps

Description: Learn how to validate Talos Linux machine configurations using Ansible playbooks to catch errors before they reach your cluster nodes.

---

Applying a bad configuration to a Talos Linux node can make it unreachable or cause it to fail during boot. Since Talos nodes do not have SSH access for manual recovery, catching configuration errors before they are applied is critically important. Ansible provides a structured way to validate Talos configurations through multiple layers of checks, from basic YAML syntax to full machine config validation. This guide shows you how to build a thorough validation workflow.

## Why Validate Before Applying?

When you apply a configuration to a Talos node, the node will attempt to use it immediately or on the next reboot. If the configuration has errors in network settings, the node might become unreachable. If there are problems with the cluster configuration, the node might fail to join or could disrupt the existing cluster.

Recovery from a bad configuration on Talos requires either physical access to the machine (for bare metal) or console access through your cloud provider. Neither is convenient, especially at 2 AM. A proper validation step in your Ansible workflow prevents these situations.

## Validation Layers

A thorough validation approach checks configurations at multiple levels:

1. **YAML syntax validation** - Is the file valid YAML?
2. **Schema validation** - Does the configuration match the expected structure?
3. **talosctl validate** - Does the Talos tooling accept the configuration?
4. **Semantic validation** - Do the values make sense for your environment?
5. **Diff checking** - What will change compared to the current running config?

## Setting Up the Validation Playbook

Create a comprehensive validation playbook:

```yaml
# playbooks/validate-configs.yml
---
- name: Validate Talos machine configurations
  hosts: all
  gather_facts: false
  connection: local

  vars:
    config_dir: "{{ playbook_dir }}/../generated/{{ cluster_name }}"
    validation_results: []

  tasks:
    # Layer 1 - YAML syntax check
    - name: Validate YAML syntax
      ansible.builtin.command:
        cmd: >
          python3 -c "
          import yaml, sys
          try:
              with open('{{ config_dir }}/{{ inventory_hostname }}.yaml') as f:
                  yaml.safe_load(f)
              print('YAML syntax is valid')
          except yaml.YAMLError as e:
              print(f'YAML error: {e}', file=sys.stderr)
              sys.exit(1)
          "
      register: yaml_check
      failed_when: false

    - name: Report YAML validation result
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: YAML syntax {{ 'PASS' if yaml_check.rc == 0 else 'FAIL - ' + yaml_check.stderr }}"

    # Layer 2 - talosctl validate
    - name: Run talosctl validate on configuration
      ansible.builtin.command:
        cmd: >
          talosctl validate
          --config {{ config_dir }}/{{ inventory_hostname }}.yaml
          --mode {{ validate_mode | default('metal') }}
      register: talos_validate
      failed_when: false

    - name: Report talosctl validation result
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: talosctl validate {{ 'PASS' if talos_validate.rc == 0 else 'FAIL - ' + talos_validate.stderr }}"

    # Layer 3 - Check required fields
    - name: Read configuration file
      ansible.builtin.slurp:
        src: "{{ config_dir }}/{{ inventory_hostname }}.yaml"
      register: config_content

    - name: Parse configuration
      ansible.builtin.set_fact:
        parsed_config: "{{ config_content.content | b64decode | from_yaml }}"

    - name: Verify cluster name is set
      ansible.builtin.assert:
        that:
          - parsed_config.cluster.clusterName is defined
          - parsed_config.cluster.clusterName == cluster_name
        fail_msg: "Cluster name mismatch or missing"
        success_msg: "Cluster name is correct"
      ignore_errors: true
      register: cluster_name_check

    - name: Verify cluster endpoint is set
      ansible.builtin.assert:
        that:
          - parsed_config.cluster.controlPlane.endpoint is defined
          - parsed_config.cluster.controlPlane.endpoint | length > 0
        fail_msg: "Cluster endpoint is missing"
        success_msg: "Cluster endpoint is set"
      ignore_errors: true
      register: endpoint_check

    - name: Verify machine type matches expected role
      ansible.builtin.assert:
        that:
          - parsed_config.machine.type == node_role
        fail_msg: "Machine type '{{ parsed_config.machine.type }}' does not match expected role '{{ node_role }}'"
        success_msg: "Machine type matches expected role"
      ignore_errors: true
      register: role_check

    # Layer 4 - Network validation
    - name: Verify network configuration exists
      ansible.builtin.assert:
        that:
          - parsed_config.machine.network is defined
        fail_msg: "Network configuration is missing"
        success_msg: "Network configuration exists"
      ignore_errors: true
      register: network_check

    - name: Verify hostname is set correctly
      ansible.builtin.assert:
        that:
          - parsed_config.machine.network.hostname is defined
          - parsed_config.machine.network.hostname == inventory_hostname
        fail_msg: "Hostname mismatch"
        success_msg: "Hostname is correct"
      ignore_errors: true
      when: parsed_config.machine.network is defined
      register: hostname_check

    # Layer 5 - Security checks
    - name: Check that install disk is specified
      ansible.builtin.assert:
        that:
          - parsed_config.machine.install.disk is defined
          - parsed_config.machine.install.disk | length > 0
        fail_msg: "Install disk is not specified"
        success_msg: "Install disk is configured"
      ignore_errors: true
      register: disk_check
```

## Comparing Against Running Configuration

If the cluster is already running, compare the new configuration against what is currently active:

```yaml
# playbooks/diff-configs.yml
---
- name: Compare new configs against running configuration
  hosts: all
  gather_facts: false
  connection: local

  vars:
    config_dir: "{{ playbook_dir }}/../generated/{{ cluster_name }}"

  tasks:
    - name: Get current machine configuration from node
      ansible.builtin.command:
        cmd: >
          talosctl get machineconfig
          --nodes {{ node_ip }}
          --talosconfig {{ talosconfig_path }}
          -o yaml
      register: current_config
      ignore_errors: true

    - name: Write current config to temp file
      ansible.builtin.copy:
        content: "{{ current_config.stdout }}"
        dest: "/tmp/{{ inventory_hostname }}-current.yaml"
        mode: '0600'
      when: current_config.rc == 0

    - name: Generate diff between current and new configuration
      ansible.builtin.command:
        cmd: >
          diff -u
          /tmp/{{ inventory_hostname }}-current.yaml
          {{ config_dir }}/{{ inventory_hostname }}.yaml
      register: config_diff
      failed_when: false
      when: current_config.rc == 0

    - name: Display configuration differences
      ansible.builtin.debug:
        msg: "{{ config_diff.stdout_lines }}"
      when:
        - current_config.rc == 0
        - config_diff.stdout_lines | length > 0

    - name: Report no changes
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: No configuration changes detected"
      when:
        - current_config.rc == 0
        - config_diff.stdout_lines | length == 0
```

## Validation Summary Report

Generate a summary of all validation results:

```yaml
# playbooks/validation-report.yml
---
- name: Generate validation summary report
  hosts: all
  gather_facts: false
  connection: local

  vars:
    config_dir: "{{ playbook_dir }}/../generated/{{ cluster_name }}"

  tasks:
    - name: Run all validations
      block:
        - name: YAML syntax check
          ansible.builtin.command:
            cmd: python3 -c "import yaml; yaml.safe_load(open('{{ config_dir }}/{{ inventory_hostname }}.yaml'))"
          register: yaml_result
          failed_when: false

        - name: talosctl validate
          ansible.builtin.command:
            cmd: talosctl validate --config {{ config_dir }}/{{ inventory_hostname }}.yaml --mode metal
          register: talosctl_result
          failed_when: false

        - name: Set validation summary
          ansible.builtin.set_fact:
            node_validation:
              hostname: "{{ inventory_hostname }}"
              yaml_syntax: "{{ 'PASS' if yaml_result.rc == 0 else 'FAIL' }}"
              talosctl_validate: "{{ 'PASS' if talosctl_result.rc == 0 else 'FAIL' }}"
              overall: "{{ 'PASS' if (yaml_result.rc == 0 and talosctl_result.rc == 0) else 'FAIL' }}"

    - name: Display node validation result
      ansible.builtin.debug:
        msg: >
          {{ node_validation.hostname }}:
          YAML={{ node_validation.yaml_syntax }}
          Validate={{ node_validation.talosctl_validate }}
          Overall={{ node_validation.overall }}

- name: Final summary
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Count results
      ansible.builtin.set_fact:
        total_nodes: "{{ groups['all'] | length }}"
        passed_nodes: "{{ groups['all'] | map('extract', hostvars, 'node_validation') | selectattr('overall', 'equalto', 'PASS') | list | length }}"
        failed_nodes: "{{ groups['all'] | map('extract', hostvars, 'node_validation') | selectattr('overall', 'equalto', 'FAIL') | list | length }}"

    - name: Display summary
      ansible.builtin.debug:
        msg: |
          Validation Summary
          Total nodes: {{ total_nodes }}
          Passed: {{ passed_nodes }}
          Failed: {{ failed_nodes }}

    - name: Fail if any validations failed
      ansible.builtin.fail:
        msg: "{{ failed_nodes }} node(s) failed validation. Review the output above."
      when: failed_nodes | int > 0
```

## Integrating Validation into the Deployment Pipeline

Make validation a required step before any configuration is applied:

```yaml
# playbooks/safe-deploy.yml
---
- name: Validate all configurations first
  ansible.builtin.import_playbook: validation-report.yml

- name: Apply configurations only after validation passes
  ansible.builtin.import_playbook: apply-configs.yml
```

Run the validation workflow:

```bash
# Run validation only
ansible-playbook -i inventory/production playbooks/validate-configs.yml

# Run validation with diff against running configs
ansible-playbook -i inventory/production playbooks/diff-configs.yml

# Run safe deploy which validates first
ansible-playbook -i inventory/production playbooks/safe-deploy.yml
```

## CI/CD Integration

Add validation to your CI pipeline so that configuration changes are checked automatically on every pull request:

```yaml
# .github/workflows/validate-talos-configs.yml
name: Validate Talos Configs
on:
  pull_request:
    paths:
      - 'inventory/**'
      - 'templates/**'
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install talosctl
        run: |
          curl -sL https://talos.dev/install | sh
      - name: Install Ansible
        run: pip install ansible
      - name: Generate and validate configs
        run: |
          ansible-playbook -i inventory/production playbooks/generate-configs.yml
          ansible-playbook -i inventory/production playbooks/validate-configs.yml
```

Validating Talos configurations before applying them is not optional - it is a requirement for reliable operations. Ansible makes it easy to build multi-layered validation that catches problems at every level, from basic syntax errors to semantic mismatches. Build validation into your workflow from the start, and you will avoid the painful recovery scenarios that come with bad configurations on immutable systems.
