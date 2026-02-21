# How to Fix Ansible Shared Connection Closed Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Troubleshooting, Connection, DevOps

Description: Resolve Ansible shared connection closed errors caused by SSH multiplexing issues, control socket problems, and timeout mismatches.

---

The "Shared connection to X closed" error usually appears during long-running tasks or when SSH multiplexing has issues. The SSH connection drops while Ansible is executing a task, causing it to fail with this cryptic message.

## The Error

```
fatal: [server1]: UNREACHABLE! => {
    "changed": false,
    "msg": "Failed to connect to the host via ssh: Shared connection to 10.0.1.10 closed.",
    "unreachable": true
}
```

## Common Causes and Fixes

### Fix 1: Increase SSH Timeout

The most common cause is a timeout during long-running tasks:

```ini
# ansible.cfg - Increase SSH connection timeouts
[defaults]
timeout = 60

[ssh_connection]
ssh_args = -o ServerAliveInterval=30 -o ServerAliveCountMax=5 -o ControlMaster=auto -o ControlPersist=300s
```

The `ServerAliveInterval` sends keepalive packets to prevent idle timeouts.

### Fix 2: Clean Up Stale Control Sockets

SSH multiplexing creates control sockets that can become stale:

```bash
# Find and remove stale SSH control sockets
find /tmp -name 'ansible-*' -user $USER -delete
rm -rf ~/.ansible/cp/*

# Or set a custom control path in ansible.cfg
```

```ini
# ansible.cfg - Configure control socket path
[ssh_connection]
control_path = %(directory)s/%%h-%%p-%%r
control_path_dir = ~/.ansible/cp
```

### Fix 3: Disable SSH Multiplexing

If multiplexing is causing persistent issues:

```ini
# ansible.cfg - Disable SSH control master
[ssh_connection]
ssh_args = -o ControlMaster=no
```

### Fix 4: Long-Running Task Timeout

For tasks that take a long time (like package installations), use `async`:

```yaml
# Use async for long-running tasks to prevent SSH timeouts
- name: Run a long database migration
  command: /opt/app/migrate.sh
  async: 3600
  poll: 30
```

### Fix 5: Server-Side SSH Configuration

The SSH server might be killing idle connections:

```bash
# On the target server, check /etc/ssh/sshd_config
# Increase these values:
ClientAliveInterval 60
ClientAliveCountMax 5
```

### Fix 6: Network Issues

Unstable network connections cause intermittent closures:

```ini
# ansible.cfg - Increase retries for unreliable networks
[defaults]
retries = 3
```

## Debugging

```bash
# Run with verbose SSH output to see connection details
ansible-playbook playbook.yml -vvvv

# The output will show SSH multiplexing status and connection reuse
```

## Summary

"Shared connection closed" errors are SSH-level issues, not Ansible bugs. The fix usually involves adjusting SSH keepalive settings, cleaning up stale control sockets, or increasing timeouts for long-running tasks. ServerAliveInterval is the single most effective setting for preventing this error.

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

