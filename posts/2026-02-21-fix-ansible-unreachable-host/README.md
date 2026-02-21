# How to Fix Ansible UNREACHABLE Host Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Troubleshooting, Networking, DevOps

Description: Diagnose and fix Ansible UNREACHABLE host errors with systematic SSH debugging, network checks, and connection configuration adjustments.

---

The UNREACHABLE error means Ansible could not establish a connection to the target host. This is different from a task failure on a reachable host. The host is simply not accessible from the control node's perspective.

## The Error

```
fatal: [server1]: UNREACHABLE! => {
    "changed": false,
    "msg": "Failed to connect to the host via ssh: ssh: connect to host 10.0.1.10 port 22: No route to host",
    "unreachable": true
}
```

## Systematic Debugging

### Step 1: Network Connectivity

```bash
# Can you ping the host?
ping -c 3 10.0.1.10

# Is the SSH port open?
nc -zv 10.0.1.10 22

# Is there a route to the host?
traceroute 10.0.1.10
```

### Step 2: SSH Connectivity

```bash
# Try SSH manually with verbose output
ssh -vvv -i ~/.ssh/id_rsa ubuntu@10.0.1.10

# Try with the exact command Ansible would use
ansible -i inventory/hosts.ini server1 -m ping -vvvv
```

### Step 3: Common Fixes

```ini
# Fix: Wrong IP or hostname in inventory
[webservers]
server1 ansible_host=10.0.1.10  # Verify this IP is correct

# Fix: Wrong SSH user
server1 ansible_host=10.0.1.10 ansible_user=ubuntu

# Fix: Wrong SSH port
server1 ansible_host=10.0.1.10 ansible_port=2222

# Fix: Wrong SSH key
server1 ansible_host=10.0.1.10 ansible_ssh_private_key_file=~/.ssh/correct_key
```

### Step 4: Firewall and Security Groups

```bash
# Check if iptables is blocking on the target
sudo iptables -L -n | grep 22

# Check UFW
sudo ufw status

# For cloud providers, check security groups via CLI
aws ec2 describe-security-groups --group-ids sg-xxxx
```

### Step 5: SSH Daemon Issues

```bash
# On the target, verify sshd is running
sudo systemctl status sshd

# Check sshd configuration
sudo sshd -t

# Check auth log for connection attempts
sudo tail -50 /var/log/auth.log
```

### Step 6: Ansible Configuration Fixes

```ini
# ansible.cfg - Connection timeout and retry settings
[defaults]
timeout = 30
retries = 3

[ssh_connection]
ssh_args = -o ConnectTimeout=30 -o ServerAliveInterval=15
retries = 3
```

## Handling Temporarily Unreachable Hosts

```yaml
# Skip unreachable hosts instead of failing the entire play
---
- hosts: all
  ignore_unreachable: yes
  tasks:
    - name: Ping test
      ping:
      register: ping_result
      
    - name: Show reachable status
      debug:
        msg: "{{ inventory_hostname }} is reachable"
      when: ping_result is not failed
```

## Summary

UNREACHABLE errors are network or SSH connectivity problems, not Ansible issues. Follow the debugging steps systematically: first check basic network connectivity, then SSH access, then firewall rules, and finally Ansible-specific configuration. The `-vvvv` flag shows the exact SSH command being used, which you can run manually to isolate the issue.

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

