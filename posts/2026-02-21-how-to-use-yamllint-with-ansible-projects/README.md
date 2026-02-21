# How to Use yamllint with Ansible Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, yamllint, YAML, Linting, Code Quality

Description: Configure and use yamllint with Ansible projects for consistent YAML formatting, style enforcement, and automated quality checks.

---

yamllint is a linter for YAML files that checks for syntax validity and enforces formatting rules. For Ansible projects, it is an essential tool because YAML errors can be hard to spot visually and lead to runtime failures that waste time.

## Installation and Basic Usage

```bash
# Install yamllint
pip install yamllint

# Lint a single file
yamllint playbook.yml

# Lint an entire directory
yamllint roles/ playbooks/ inventories/
```

## Configuration for Ansible

Ansible YAML has specific patterns that a strict yamllint configuration would flag. Create a configuration that balances strictness with Ansible practicality:

```yaml
# .yamllint
extends: default
rules:
  # Allow long lines for URLs and Jinja2 expressions
  line-length:
    max: 200
    level: warning
    allow-non-breakable-words: true
    allow-non-breakable-inline-mappings: true

  # Ansible convention: 2 spaces
  indentation:
    spaces: 2
    indent-sequences: true
    check-multi-line-strings: false

  # Require consistent boolean values
  truthy:
    allowed-values: ['true', 'false', 'yes', 'no']
    check-keys: true

  # Comments formatting
  comments:
    min-spaces-from-content: 1

  # Allow documents without ---
  document-start: disable

  # Trailing spaces are noise
  trailing-spaces: enable

  # New line at end of file
  new-line-at-end-of-file: enable

  # Braces and brackets
  braces:
    min-spaces-inside: 0
    max-spaces-inside: 1
  brackets:
    min-spaces-inside: 0
    max-spaces-inside: 1

  # Octal values (file modes)
  octal-values:
    forbid-implicit-octal: true
```

## Ignoring Specific Files

```yaml
# .yamllint
extends: default
ignore: |
  .git/
  .tox/
  venv/
  molecule/*/create.yml
  molecule/*/destroy.yml
```

## Integrating with Editor

Most editors support yamllint. For VS Code, install the YAML extension and configure it:

```json
{
  "yaml.validate": true,
  "yaml.customTags": [
    "!vault"
  ]
}
```

## Running in CI

```yaml
# .github/workflows/yamllint.yml
name: yamllint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run yamllint
        uses: ibiqlik/action-yamllint@v3
        with:
          config_file: .yamllint
          file_or_dir: .
          strict: false
```

## Common Warnings and Fixes

```yaml
# Warning: truthy value should be one of [false, true]
# Fix: use true/false instead of yes/no
enabled: true   # Good
enabled: yes    # Warning

# Warning: line too long (250 > 200 characters)
# Fix: break long lines
long_line: >-
  This is a very long value that has been
  broken across multiple lines

# Warning: wrong indentation
# Fix: use consistent 2-space indentation
- name: Task
  ansible.builtin.debug:
    msg: test  # 4 spaces from task level

# Warning: trailing spaces
# Fix: remove spaces at end of lines
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

yamllint is a small investment that pays dividends in YAML quality. Configure it once for your Ansible project, add it to your CI pipeline, and let it catch formatting issues automatically. The default configuration is a good starting point, but tuning it for Ansible patterns (longer lines, specific boolean preferences) makes it practical for daily use.

