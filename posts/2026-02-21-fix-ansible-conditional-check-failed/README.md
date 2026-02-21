# How to Fix Ansible conditional check failed Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Troubleshooting, Conditionals, Jinja2, YAML

Description: Fix Ansible conditional check failed errors caused by syntax issues, undefined variables, and type mismatches in when clauses.

---

The "conditional check failed" error occurs when a `when` condition in your playbook contains a syntax error, references an undefined variable, or uses an expression that Ansible cannot evaluate.

## The Error

```
fatal: [server1]: FAILED! => {
    "msg": "The conditional check 'result.rc == 0' failed. The error was: error while evaluating conditional (result.rc == 0): 'dict object' has no attribute 'rc'"
}
```

## Common Causes and Fixes

### Fix 1: Variable Not Defined

```yaml
# Problem: the registered variable does not exist yet
- name: Check service
  command: systemctl status nginx
  register: nginx_status
  ignore_errors: yes

# Problem: if the task was skipped, nginx_status is undefined
- name: Start nginx if stopped
  systemd:
    name: nginx
    state: started
  when: nginx_status.rc != 0  # Fails if nginx_status is undefined

# Fix: check if variable is defined
  when: nginx_status is defined and nginx_status.rc != 0
```

### Fix 2: Do Not Use Jinja2 Brackets in when

```yaml
# WRONG: do not use {{ }} in when conditions
- name: Conditional task
  debug:
    msg: "hello"
  when: "{{ my_var }}"   # WRONG

# CORRECT: when already evaluates as Jinja2
- name: Conditional task
  debug:
    msg: "hello"
  when: my_var             # CORRECT
```

### Fix 3: String Comparison Issues

```yaml
# Problem: comparing different types
when: ansible_distribution_version == 22.04  # String vs float comparison

# Fix: compare as strings
when: ansible_distribution_version == "22.04"

# Or convert to float
when: ansible_distribution_version | float >= 22.04
```

### Fix 4: Boolean Evaluation

```yaml
# Problem: YAML booleans vs string 'true'
when: result.changed == 'true'  # result.changed is a boolean, not string

# Fix: compare to boolean
when: result.changed == true
# Or simply:
when: result.changed
# Or for false:
when: not result.changed
```

### Fix 5: Complex Conditions

```yaml
# Multiple conditions with proper syntax
when:
  - ansible_os_family == "Debian"
  - ansible_distribution_major_version | int >= 20
  - enable_feature | default(false) | bool

# OR conditions
when: ansible_os_family == "Debian" or ansible_os_family == "RedHat"
```

### Fix 6: Checking for Undefined Values

```yaml
# Safely check a variable that might not exist
when: my_var is defined and my_var | length > 0

# Check if a key exists in a dict
when: "'key_name' in my_dict"
```

## Summary

Conditional check failures are usually caused by undefined variables, incorrect Jinja2 bracket usage in `when` clauses, or type mismatches. Remember: do not use `{{ }}` in `when` conditions, always check `is defined` before accessing potentially undefined variables, and be explicit about type comparisons.

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

