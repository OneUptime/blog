# How to Fix Ansible Failed to Connect to Host via SSH Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Troubleshooting, Networking, DevOps

Description: Resolve Ansible SSH connection failures with systematic debugging of keys, network issues, SSH configuration, and authentication problems.

---

The error "Failed to connect to the host via ssh" is the most common Ansible error you will encounter. It means Ansible could not establish an SSH connection to the target host. The root cause can be anything from a wrong IP address to a misconfigured SSH key, a firewall blocking port 22, or an SSH daemon that is not running. Here is how to systematically diagnose and fix it.

## The Error

```
fatal: [webserver]: UNREACHABLE! => {
    "changed": false,
    "msg": "Failed to connect to the host via ssh: ssh: connect to host 192.168.1.50 port 22: Connection refused",
    "unreachable": true
}
```

## Step 1: Test SSH Manually

Before troubleshooting Ansible, verify that basic SSH works:

```bash
# Test SSH connection with the same parameters Ansible uses
ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ubuntu@192.168.1.50

# If using a non-standard port
ssh -p 2222 ubuntu@192.168.1.50

# Verbose mode for detailed connection info
ssh -vvv ubuntu@192.168.1.50
```

## Step 2: Check Network Connectivity

```bash
# Can you reach the host at all?
ping 192.168.1.50

# Is port 22 (or your SSH port) open?
nc -zv 192.168.1.50 22

# Check from the Ansible control node specifically
telnet 192.168.1.50 22
```

## Step 3: Common Fixes

### Fix: Wrong SSH key or user

```ini
# inventory/hosts.ini - Verify these settings match your target
[web]
webserver ansible_host=192.168.1.50 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/id_rsa
```

### Fix: SSH daemon not running on target

```bash
# On the target host, check if SSH is running
sudo systemctl status sshd

# Start it if it is not
sudo systemctl start sshd
sudo systemctl enable sshd
```

### Fix: Firewall blocking SSH

```bash
# On the target host, check if the firewall allows SSH
sudo ufw status
sudo ufw allow 22/tcp

# For cloud providers, check the security group / firewall rules
```

### Fix: SSH host key changed

If the target was rebuilt, the host key has changed:

```bash
# Remove the old host key
ssh-keygen -R 192.168.1.50

# Or disable host key checking for dynamic environments
# In ansible.cfg:
# [defaults]
# host_key_checking = False
```

### Fix: SSH key permissions

SSH is strict about key file permissions:

```bash
# Fix key file permissions
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
chmod 700 ~/.ssh
```

## Step 4: Ansible-Specific Fixes

### Increase connection timeout

```ini
# ansible.cfg - Increase timeout for slow networks
[defaults]
timeout = 30

[ssh_connection]
ssh_args = -o ConnectTimeout=30
```

### Use a specific SSH binary

```ini
# ansible.cfg - Explicitly set SSH path
[ssh_connection]
ssh_executable = /usr/bin/ssh
```

### Enable connection debugging

```bash
# Run with maximum verbosity to see SSH details
ansible-playbook playbook.yml -vvvv
```

The `-vvvv` output shows the exact SSH command Ansible runs, which you can copy and run manually for testing.

## Step 5: Check ansible_connection Type

If the target needs a different connection type:

```yaml
# For local execution
localhost ansible_connection=local

# For Docker containers
container1 ansible_connection=docker

# For Windows hosts
winserver ansible_connection=winrm
```

## Summary

SSH connection errors in Ansible are almost always a connectivity or authentication issue, not an Ansible bug. The systematic approach is: test SSH manually first, check network connectivity, verify credentials and key permissions, and finally review Ansible-specific configuration. The `-vvvv` flag is your best friend for diagnosing these issues because it shows exactly what SSH command Ansible is trying to run.

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

