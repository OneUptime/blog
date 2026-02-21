# How to Fix Ansible Gathering Facts Taking Too Long

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Troubleshooting, Performance, Facts, DevOps

Description: Fix slow Ansible fact gathering with targeted strategies including fact caching, selective gathering, and parallel execution optimizations.

---

If you have ever watched Ansible sit on "TASK [Gathering Facts]" for minutes while you wait impatiently, you know the frustration. Fact gathering is the first thing Ansible does when connecting to a host, collecting information about the OS, network interfaces, hardware, and more. On large inventories or slow networks, this can become a serious bottleneck. Here is how to fix it.

## Understanding the Problem

By default, Ansible runs the `setup` module on every host at the beginning of every play. This module collects a comprehensive set of system facts, which takes time, especially over high-latency connections or on resource-constrained hosts.

## Solution 1: Disable Fact Gathering Entirely

If your playbook does not use any Ansible facts (like `ansible_os_family` or `ansible_default_ipv4`), turn off fact gathering:

```yaml
# Disable fact gathering when you do not need system facts
---
- hosts: all
  gather_facts: false
  tasks:
    - name: This task does not need facts
      command: uptime
```

## Solution 2: Gather Only Specific Facts

Instead of collecting everything, gather only what you need:

```yaml
# Gather only network and hardware facts, skip everything else
---
- hosts: all
  gather_facts: false
  tasks:
    - name: Gather only network facts
      setup:
        gather_subset:
          - network
          - '!all'
          - '!min'
      when: ansible_facts is not defined or ansible_facts | length == 0
```

The `gather_subset` parameter accepts these values:
- `all` - everything (default)
- `min` - minimal facts
- `hardware` - CPU, memory, disk info
- `network` - IP addresses, interfaces
- `virtual` - virtualization info
- `ohai` - Ohai facts (Chef compatibility)
- `facter` - Facter facts (Puppet compatibility)

Use `!` prefix to exclude subsets.

## Solution 3: Enable Fact Caching

Cache facts so they do not need to be re-gathered on every run:

```ini
# ansible.cfg - Enable JSON file fact caching
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts_cache
fact_caching_timeout = 86400
```

The `gathering = smart` setting means Ansible only gathers facts when they are not already in the cache. The timeout is in seconds (86400 = 24 hours).

For Redis-based caching (better for teams):

```ini
# ansible.cfg - Redis fact caching for shared environments
[defaults]
gathering = smart
fact_caching = redis
fact_caching_connection = localhost:6379:0
fact_caching_timeout = 86400
```

## Solution 4: Increase Parallelism

If fact gathering is slow because you have many hosts, increase the number of parallel forks:

```ini
# ansible.cfg - Increase parallelism
[defaults]
forks = 50
```

The default is 5 forks, which means only 5 hosts are contacted simultaneously. For large inventories, bumping this to 50 or even 100 makes a significant difference.

## Solution 5: Use Mitogen for Ansible

Mitogen is a Python library that dramatically speeds up Ansible by replacing its connection and module execution layer:

```ini
# ansible.cfg - Use Mitogen strategy plugin
[defaults]
strategy_plugins = /path/to/mitogen/ansible_mitogen/plugins/strategy
strategy = mitogen_linear
```

Mitogen can reduce fact gathering time by 2-7x by eliminating redundant SSH connections and Python interpreter startup overhead.

## Solution 6: Configure SSH Multiplexing

Optimize SSH connections to reduce connection overhead:

```ini
# ansible.cfg - SSH connection optimization
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o PreferredAuthentications=publickey
pipelining = True
```

SSH pipelining reduces the number of SSH operations per task from 3 to 1 by sending the module directly through the existing SSH connection.

## Solution 7: Use gather_timeout

Set a timeout so slow hosts do not hold up the entire play:

```ini
# ansible.cfg - Set timeout for fact gathering
[defaults]
gather_timeout = 30
```

## Comparing the Impact

Here is a typical comparison of fact gathering times with 100 hosts:

| Method | Time |
|--------|------|
| Default | 180s |
| gather_subset: min | 45s |
| Fact caching (warm) | 2s |
| Pipelining + SSH multiplex | 60s |
| Mitogen | 30s |
| All optimizations combined | 2-5s |

## Summary

Slow fact gathering is usually the first performance bottleneck teams hit with Ansible. The fix depends on your situation: disable facts if you do not need them, cache them if you do, and optimize SSH connections for faster overall execution. In practice, combining fact caching with SSH pipelining gives the best results with the least effort.

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

