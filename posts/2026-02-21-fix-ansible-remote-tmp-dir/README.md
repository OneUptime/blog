# How to Fix Ansible Remote tmp dir did not exist Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Troubleshooting, Temporary Files, SSH, Linux

Description: Resolve Ansible remote tmp directory errors by configuring temp paths, fixing permissions, and handling restricted shell environments.

---

Ansible uses a temporary directory on remote hosts to transfer and execute modules. When this directory does not exist or is not accessible, you get the "remote tmp dir did not exist" error. This commonly happens with restricted users, unusual home directory configurations, or systems with limited disk space.

## The Error

```
fatal: [server1]: FAILED! => {
    "msg": "Failed to create temporary directory. In some cases, you may have been able to authenticate and did not have permissions on the target directory."
}
```

## Fixes

### Fix 1: Set a Custom Remote Temp Directory

```ini
# ansible.cfg - Use /tmp instead of ~/.ansible/tmp
[defaults]
remote_tmp = /tmp/.ansible-${USER}/tmp
```

### Fix 2: Set Per-Host Temp Directory

```ini
# inventory - For hosts with restricted home directories
server1 ansible_remote_tmp=/tmp/.ansible/tmp
```

### Fix 3: Create the Directory with a Pre-Task

```yaml
# Use raw module which does not need the temp directory
- name: Ensure ansible temp directory exists
  raw: mkdir -p /tmp/.ansible/tmp && chmod 700 /tmp/.ansible/tmp
  become: yes
```

### Fix 4: Fix Home Directory Permissions

```bash
# On the target host, check if the user's home is writable
ls -la /home/ansible_user/
chmod 755 /home/ansible_user/
```

### Fix 5: Handle noexec on /tmp

Some servers mount /tmp with noexec, preventing Ansible module execution:

```ini
# ansible.cfg - Use a directory without noexec
[defaults]
remote_tmp = /var/tmp/.ansible/tmp
```

### Fix 6: Use Pipelining

Pipelining bypasses the temp directory for many operations:

```ini
# ansible.cfg - Enable pipelining
[ssh_connection]
pipelining = True
```

Note: pipelining requires `requiretty` to be disabled in sudoers on the target.

## Summary

Remote temp directory errors are about file system access on the target host. The fix is usually configuring `remote_tmp` to point to a writable directory, enabling pipelining to bypass the temp directory, or pre-creating the directory with the `raw` module. Check for noexec mount options on /tmp if the error persists despite having write access.

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

