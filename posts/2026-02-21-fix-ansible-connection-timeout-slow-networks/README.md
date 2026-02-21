# How to Fix Ansible Connection timed out for Slow Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Networking, Timeout, Troubleshooting, Performance

Description: Fix Ansible connection timeout errors on slow networks by adjusting timeout values, enabling pipelining, and optimizing SSH configuration.

---

Connection timeouts happen when Ansible cannot establish or maintain an SSH connection within the configured time limit. This is common with hosts behind VPNs, in remote data centers, on satellite links, or in cloud regions far from your control node.

## The Error

```
fatal: [remote-server]: UNREACHABLE! => {
    "msg": "Failed to connect to the host via ssh: ssh: connect to host 203.0.113.50 port 22: Connection timed out"
}
```

## Fixes

### Fix 1: Increase Connection Timeout

```ini
# ansible.cfg - Increase timeout values
[defaults]
timeout = 60           # Connection timeout in seconds (default: 10)
gather_timeout = 60    # Fact gathering timeout

[ssh_connection]
ssh_args = -o ConnectTimeout=60 -o ServerAliveInterval=30 -o ServerAliveCountMax=5
```

### Fix 2: Enable SSH Pipelining

Pipelining reduces the number of SSH connections per task:

```ini
# ansible.cfg
[ssh_connection]
pipelining = True
```

### Fix 3: Increase Task Timeout for Slow Operations

```yaml
# Use async for tasks that take a long time
- name: Download large file on slow connection
  get_url:
    url: https://example.com/large-file.tar.gz
    dest: /tmp/large-file.tar.gz
  async: 1800     # Allow 30 minutes
  poll: 30        # Check every 30 seconds
```

### Fix 4: Reduce Transfer Size

```ini
# ansible.cfg - Compress SSH traffic
[ssh_connection]
ssh_args = -o Compression=yes -o ConnectTimeout=60
```

### Fix 5: Use a Jump Host Closer to the Target

```ini
# inventory - Route through a bastion in the same network
[remote_servers]
server1 ansible_host=10.0.1.10 ansible_ssh_common_args='-o ProxyJump=bastion.example.com'
```

### Fix 6: Increase Retries

```ini
# ansible.cfg - Retry failed connections
[defaults]
retries = 3

[ssh_connection]
retries = 3
```

Or per-task:

```yaml
- name: Retry task on failure
  command: some_command
  register: result
  retries: 3
  delay: 30
  until: result.rc == 0
```

## Summary

Connection timeouts on slow networks require a multi-pronged approach: increase timeout values, enable pipelining and compression, use async for long tasks, and consider routing through a closer bastion host. The `ServerAliveInterval` setting is particularly important as it prevents idle connection drops on flaky networks.

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

