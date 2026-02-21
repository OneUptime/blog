# How to Fix Ansible Unexpected templating type error Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templating, Troubleshooting, YAML

Description: Resolve Ansible templating type errors caused by incorrect Jinja2 filter usage, type mismatches, and variable type assumptions.

---

The "Unexpected templating type error" occurs when Jinja2 template rendering produces a value of a type that Ansible does not expect. This typically happens when a filter returns an unexpected type, or when YAML auto-type detection conflicts with Jinja2 output.

## The Error

```
fatal: [server1]: FAILED! => {
    "msg": "Unexpected templating type error occurred on ({{ some_variable | some_filter }}): expected string or bytes-like object"
}
```

## Common Causes and Fixes

### Fix 1: Force String Type

When YAML interprets a template result as the wrong type:

```yaml
# Problem: YAML auto-detects 'true' as boolean
some_var: "{{ result }}"  # If result is 'true', YAML makes it a boolean

# Fix: Force string type with the string filter
some_var: "{{ result | string }}"
```

### Fix 2: Handle None Values

Undefined or None values cause type errors in filters:

```yaml
# Problem: applying filters to potentially undefined variables
value: "{{ my_var | upper }}"  # Fails if my_var is undefined or None

# Fix: provide a default value
value: "{{ my_var | default('') | upper }}"
```

### Fix 3: List vs String Confusion

```yaml
# Problem: treating a list as a string
msg: "Items: {{ my_list }}"  # my_list is [1, 2, 3]

# Fix: join the list into a string
msg: "Items: {{ my_list | join(', ') }}"
```

### Fix 4: Integer vs String in Comparisons

```yaml
# Problem: comparing string to integer
when: ansible_distribution_major_version > 20  # String '22' > int 20 fails

# Fix: convert to integer explicitly
when: ansible_distribution_major_version | int > 20
```

### Fix 5: Dictionary Access Errors

```yaml
# Problem: accessing a dict key on a non-dict object
value: "{{ result.key }}"  # Fails if result is not a dict

# Fix: check type first or use default
value: "{{ result.key | default('N/A') }}"
```

### Fix 6: YAML Boolean Gotcha

```yaml
# Problem: YAML converts certain strings to booleans
enable_feature: "{{ 'yes' }}"  # YAML turns this into boolean True

# Fix: use quotes and the string filter
enable_feature: "{{ 'yes' | string }}"

# Or use explicit string quoting
enable_feature: "yes"
```

## Debugging Tips

```yaml
# Check the type of a variable
- debug:
    msg: "Type: {{ my_var | type_debug }}, Value: {{ my_var }}"
```

## Summary

Templating type errors happen when Jinja2 and YAML disagree about what type a value should be. The key defenses are: use `| default()` for potentially undefined variables, use `| string` or `| int` for explicit type conversion, and use `| type_debug` to inspect types when debugging. These errors become less frequent as you develop an intuition for how YAML auto-typing interacts with Jinja2 output.

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

