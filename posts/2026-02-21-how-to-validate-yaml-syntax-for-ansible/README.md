# How to Validate YAML Syntax for Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Validation, Linting, DevOps

Description: Methods to validate YAML syntax in Ansible playbooks using built-in tools, yamllint, and pre-commit hooks to catch errors before runtime.

---

YAML syntax errors are one of the most frustrating things in Ansible. A misplaced indent or a missing colon can cause your entire playbook to fail with a cryptic error message. Validating YAML before running it catches these issues early.

## Using ansible-playbook --syntax-check

The simplest validation is Ansible's built-in syntax checker:

```bash
# Check playbook syntax without executing
ansible-playbook site.yml --syntax-check
```

This parses the YAML and checks for Ansible-specific issues like missing required parameters, but it does not catch all YAML formatting problems.

## Using Python's YAML Parser

```bash
# Quick YAML validation with Python
python3 -c "import yaml; yaml.safe_load(open('playbook.yml'))"
```

If the file has a syntax error, Python will print the line number and a description of the problem.

## Using yamllint

yamllint is the gold standard for YAML validation. It checks both syntax and style:

```bash
# Install yamllint
pip install yamllint

# Validate a single file
yamllint playbook.yml

# Validate all YAML files recursively
yamllint -d relaxed roles/ playbooks/ group_vars/
```

Configure yamllint with a `.yamllint` file:

```yaml
# .yamllint
extends: default
rules:
  line-length:
    max: 160
    level: warning
  truthy:
    allowed-values: ['true', 'false']
    check-keys: true
  comments:
    min-spaces-from-content: 1
  indentation:
    spaces: 2
    indent-sequences: consistent
  document-start: disable
```

## Using ansible-lint

ansible-lint goes beyond YAML syntax to check Ansible best practices:

```bash
# Install ansible-lint
pip install ansible-lint

# Run against your project
ansible-lint site.yml
```

```yaml
# .ansible-lint
skip_list:
  - yaml[line-length]
  - name[template]
warn_list:
  - experimental
```

## Pre-Commit Hook

Add YAML validation to your git workflow:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/adrienverge/yamllint
    rev: v1.33.0
    hooks:
      - id: yamllint
        args: [-d, relaxed]

  - repo: https://github.com/ansible/ansible-lint
    rev: v6.22.1
    hooks:
      - id: ansible-lint
```

```bash
# Install and enable pre-commit
pip install pre-commit
pre-commit install
```

## CI Pipeline Validation

```yaml
# .github/workflows/lint.yml
name: YAML Validation
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install linters
        run: pip install yamllint ansible-lint ansible-core
      - name: Run yamllint
        run: yamllint -d relaxed .
      - name: Run ansible-lint
        run: ansible-lint site.yml
      - name: Syntax check
        run: ansible-playbook site.yml --syntax-check
```

## Common YAML Syntax Errors

```yaml
# Error: tab instead of spaces
- name: Bad indentation
	ansible.builtin.debug:  # TAB character here

# Error: missing space after colon
- name:Bad task name
  ansible.builtin.debug:
    msg: test

# Error: duplicate key
vars:
  app_name: first
  app_name: second  # Duplicate key

# Error: unquoted special characters
- name: Set value
  vars:
    value: key: with: colons  # Needs quoting
```


## Common Use Cases

Here are several practical scenarios where this module proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this module
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      ansible.builtin.timezone:
        name: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: all
  become: true
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling with this module
- name: Robust task execution
  hosts: all
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /opt/app/primary-task.sh
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /opt/app/fallback-task.sh
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: ansible
```


## Conclusion

YAML validation should happen at three points: in your editor (with a YAML extension), before commit (with pre-commit hooks), and in CI (with yamllint and ansible-lint). This layered approach catches syntax errors before they waste time in runtime debugging. The few seconds spent on validation save minutes of troubleshooting.

