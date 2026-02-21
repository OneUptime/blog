# How to Fix Ansible Recursive loop detected Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Troubleshooting, Variables, Recursion, DevOps

Description: Resolve Ansible recursive loop errors caused by circular variable references, self-referencing defaults, and include loops.

---

The "Recursive loop detected" error means Ansible found a circular reference in your variable definitions. Variable A references variable B, which references variable A, creating an infinite loop that Ansible catches and aborts.

## The Error

```
fatal: [server1]: FAILED! => {
    "msg": "recursive loop detected in template string: {{ my_var }}"
}
```

## Common Causes and Fixes

### Cause 1: Self-Referencing Variable

```yaml
# WRONG: variable references itself
vars:
  my_path: "{{ my_path }}/subdir"

# FIX: use a different variable name
vars:
  base_path: /opt/app
  my_path: "{{ base_path }}/subdir"
```

### Cause 2: Circular Variable References

```yaml
# WRONG: A references B, B references A
vars:
  var_a: "prefix-{{ var_b }}"
  var_b: "{{ var_a }}-suffix"

# FIX: break the circle with a third variable
vars:
  base_value: "myvalue"
  var_a: "prefix-{{ base_value }}"
  var_b: "{{ var_a }}-suffix"
```

### Cause 3: Group Vars Overriding with Self-Reference

```yaml
# group_vars/webservers.yml - WRONG
java_opts: "{{ java_opts }} -Xmx1024m"

# FIX: use a different variable for the base and the override
java_base_opts: "-server"
java_opts: "{{ java_base_opts }} -Xmx1024m"
```

### Cause 4: Role Default Referencing Itself

```yaml
# roles/app/defaults/main.yml - WRONG
app_config_dir: "{{ app_config_dir }}/config"

# FIX: separate the base from the derived
app_base_dir: /opt/app
app_config_dir: "{{ app_base_dir }}/config"
```

### Cause 5: Include Loops

```yaml
# WRONG: task file includes itself
# tasks/setup.yml
- include_tasks: setup.yml  # Infinite include loop

# FIX: restructure to avoid self-inclusion
# tasks/setup.yml
- include_tasks: actual_setup_tasks.yml
```

## Debugging

```bash
# Run with verbose output to see variable resolution
ansible-playbook playbook.yml -vvv

# The error message usually tells you which variable is looping
```

## Summary

Recursive loop errors always come from circular variable references. The fix is to identify which variables reference each other and break the cycle by introducing a new base variable that does not reference the others. Use descriptive variable names (like `base_dir` vs `config_dir`) to make the dependency chain clear and prevent accidental cycles.

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

