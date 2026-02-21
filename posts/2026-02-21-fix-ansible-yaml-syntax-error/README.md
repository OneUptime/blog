# How to Fix Ansible YAML syntax error in Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Syntax, Troubleshooting, DevOps

Description: Fix YAML syntax errors in Ansible playbooks by understanding common formatting mistakes, indentation rules, and special characters.

---

YAML syntax errors are among the most frustrating Ansible errors because YAML is whitespace-sensitive and the error messages can be cryptic. A single wrong indentation, missing colon, or unquoted special character can break your entire playbook.

## The Error

```
ERROR! We were unable to read either as JSON nor YAML, these are the errors we got from each:
YAML: mapping values are not allowed here
  in "playbook.yml", line 5, column 15
```

## Common YAML Mistakes and Fixes

### Fix 1: Indentation Errors

YAML uses spaces, not tabs. Two spaces is the standard indentation:

```yaml
# WRONG: mixed indentation
- hosts: all
  tasks:
      - name: Task one  # 6 spaces instead of 4
        command: echo hello

# CORRECT: consistent 2-space indentation
- hosts: all
  tasks:
    - name: Task one
      command: echo hello
```

### Fix 2: Missing Colon After Key

```yaml
# WRONG: no colon after 'hosts'
- hosts all
  tasks:

# CORRECT: colon required
- hosts: all
  tasks:
```

### Fix 3: Special Characters Need Quoting

```yaml
# WRONG: colon in value without quotes
- name: Set message
  set_fact:
    msg: Error: something failed  # The colon breaks YAML parsing

# CORRECT: quote strings with special characters
- name: Set message
  set_fact:
    msg: "Error: something failed"
```

Characters that need quoting: `: { } [ ] , & * # ? | - < > = ! % @ \`

### Fix 4: Boolean Values

```yaml
# WRONG: YAML interprets 'yes', 'no', 'true', 'false' as booleans
- name: Set value
  set_fact:
    country: no  # YAML interprets as boolean false!

# CORRECT: quote to preserve as string
- name: Set value
  set_fact:
    country: "no"
```

### Fix 5: Multiline Strings

```yaml
# Block scalar for multiline (preserves newlines)
message: |
  Line one
  Line two
  Line three

# Folded scalar (joins lines with spaces)
message: >
  This is a very long
  message that spans
  multiple lines
```

### Fix 6: Using yamllint

```bash
# Install yamllint
pip install yamllint

# Check your playbook
yamllint playbook.yml

# Use ansible-lint for Ansible-specific checks
pip install ansible-lint
ansible-lint playbook.yml
```

## Debugging Tips

```bash
# Ansible's own syntax check
ansible-playbook playbook.yml --syntax-check

# Python YAML parser for detailed error messages
python3 -c "import yaml; yaml.safe_load(open('playbook.yml'))"
```

## Summary

YAML syntax errors in Ansible are almost always about indentation, missing colons, or unquoted special characters. Use a YAML-aware editor with syntax highlighting, run `--syntax-check` before every playbook execution, and install yamllint for continuous validation. The most common gotcha is YAML's automatic type detection turning strings like 'yes' and 'no' into booleans.

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

