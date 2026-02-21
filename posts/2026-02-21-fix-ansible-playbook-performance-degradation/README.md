# How to Fix Ansible Playbook Performance Degradation Over Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Performance, Optimization, Troubleshooting, DevOps

Description: Diagnose and fix Ansible playbook performance degradation with fact caching, connection optimization, task profiling, and execution strategies.

---

When Ansible playbooks that used to run quickly start taking much longer, something has changed. The playbook might be collecting more facts, the inventory might have grown, SSH connections might be slower, or accumulated technical debt in the playbook is adding up. Here is how to diagnose and fix performance degradation.

## Common Causes and Fixes

### Cause 1: Inventory Growth

More hosts means more time, especially with the default forks of 5:

```ini
# ansible.cfg - Increase parallelism
[defaults]
forks = 50  # Default is 5, increase for large inventories
```

### Cause 2: Fact Gathering Getting Slower

```ini
# ansible.cfg - Cache facts and gather selectively
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 86400
```

### Cause 3: Too Many SSH Connections

Enable SSH multiplexing and pipelining:

```ini
# ansible.cfg - Optimize SSH connections
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=600s
pipelining = True
```

### Cause 4: Slow Tasks That Could Be Async

```yaml
# Move slow tasks to async execution
- name: Update all packages
  apt:
    upgrade: dist
  async: 600
  poll: 30
```

### Cause 5: Unnecessary Task Execution

```yaml
# Add changed_when and creates/removes to skip unnecessary work
- name: Build application
  command: make build
  args:
    chdir: /opt/app
    creates: /opt/app/dist/app  # Skip if already built
```

## Profiling Playbook Performance

### Enable the Timer Callback

```ini
# ansible.cfg - Show task timing
[defaults]
callbacks_enabled = timer, profile_tasks, profile_roles

# Or via environment
# ANSIBLE_CALLBACKS_ENABLED=timer,profile_tasks
```

This shows execution time for every task, making it easy to identify bottlenecks.

### Use the Mitogen Strategy

```ini
# ansible.cfg - Mitogen speeds up execution significantly
[defaults]
strategy_plugins = /path/to/mitogen/ansible_mitogen/plugins/strategy
strategy = mitogen_linear
```

### Use the free Strategy for Independent Tasks

```yaml
# Tasks that do not depend on each other can run in parallel
- hosts: all
  strategy: free
  tasks:
    - name: Independent task 1
      command: echo one
    - name: Independent task 2
      command: echo two
```

## Performance Checklist

```ini
# Complete performance-optimized ansible.cfg
[defaults]
forks = 50
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 86400
callbacks_enabled = profile_tasks

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=600s -o PreferredAuthentications=publickey
pipelining = True
```

## Monitoring Playbook Duration Over Time

```bash
# Log execution time for trend analysis
time ansible-playbook playbook.yml 2>&1 | tee -a /var/log/ansible-timing.log
```

## Summary

Playbook performance degradation is usually caused by inventory growth without adjusting forks, repeated fact gathering without caching, or accumulating slow tasks without optimization. Enable the profile_tasks callback to find bottlenecks, increase forks and enable pipelining for connection efficiency, and use fact caching to eliminate redundant data collection. These changes typically reduce playbook execution time by 50-80%.

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

