# How to Fix Ansible AnsibleFilterError Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Troubleshooting, DevOps

Description: Resolve AnsibleFilterError by fixing filter syntax, installing missing collections, and handling undefined variables in Jinja2 templates.

---

AnsibleFilterError occurs when a Jinja2 filter is used incorrectly, applied to an incompatible data type, or simply does not exist. Filters in Ansible transform data within templates, and when the transformation fails, you get this error.

## The Error

```
fatal: [server1]: FAILED! => {
    "msg": "AnsibleFilterError: |ipaddr: 'NoneType' is not a valid IP address or network"
}
```

## Common Causes and Fixes

### Fix 1: Filter Applied to Undefined Variable

```yaml
# Problem: variable is undefined or None
ip: "{{ my_ip | ipaddr }}"  # Fails if my_ip is undefined

# Fix: provide a default
ip: "{{ my_ip | default('0.0.0.0') | ipaddr }}"
```

### Fix 2: Missing Collection for the Filter

Many filters come from collections that need to be installed:

```bash
# The ipaddr filter requires the netcommon collection
ansible-galaxy collection install ansible.netcommon

# The json_query filter requires community.general
ansible-galaxy collection install community.general
```

### Fix 3: Wrong Data Type for the Filter

```yaml
# Problem: applying a list filter to a string
result: "{{ my_string | flatten }}"  # flatten expects a list

# Fix: ensure correct type
result: "{{ my_list | flatten }}"
```

### Fix 4: Chaining Filters with Incompatible Types

```yaml
# Problem: filter chain produces unexpected type
value: "{{ items | selectattr('active') | map(attribute='name') | join(', ') }}"

# Fix: add 'list' filter before join
value: "{{ items | selectattr('active') | map(attribute='name') | list | join(', ') }}"
```

### Fix 5: Custom Filter Not Found

```
AnsibleFilterError: No filter named 'my_custom_filter'
```

Ensure custom filter plugins are in the right directory:

```ini
# ansible.cfg - Custom filter plugin path
[defaults]
filter_plugins = ./plugins/filter
```

### Fix 6: Common Filter Reference

```yaml
# Frequently used filters and their expected input types
- debug:
    msg: |
      String filters: {{ "hello" | upper }}
      List filters: {{ [3,1,2] | sort }}
      Dict filters: {{ my_dict | dict2items }}
      Math filters: {{ 42 | int }}
      IP filters: {{ "10.0.1.1" | ansible.utils.ipaddr }}
      JSON query: {{ data | community.general.json_query('results[*].name') }}
```

## Debugging

```yaml
# Check the type of the variable before filtering
- debug:
    msg: "Type: {{ problematic_var | type_debug }}"
```

## Summary

AnsibleFilterError always means a filter received data it cannot work with. The fix is to ensure the variable exists (using `default()`), has the correct type (using `type_debug` to verify), and that the required collection is installed. The `list` filter between `selectattr`/`map` and `join` is the most commonly needed fix for filter chain errors.

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

