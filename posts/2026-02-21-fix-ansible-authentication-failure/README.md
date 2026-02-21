# How to Fix Ansible Authentication failure Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Authentication, SSH, Troubleshooting, Security

Description: Fix Ansible authentication failures caused by wrong credentials, key mismatches, sudo password issues, and connection type problems.

---

Authentication failure errors in Ansible mean the credentials provided (SSH key, password, or become password) were rejected by the target host. This is different from a connection failure; the connection is established but the authentication step fails.

## The Error

```
fatal: [server1]: UNREACHABLE! => {
    "msg": "Failed to connect to the host via ssh: Permission denied (publickey,password)."
}
```

Or for privilege escalation:

```
fatal: [server1]: FAILED! => {
    "msg": "Incorrect sudo password"
}
```

## SSH Authentication Fixes

### Fix 1: Verify SSH Key

```bash
# Test the key manually
ssh -i ~/.ssh/id_rsa -o IdentitiesOnly=yes ubuntu@server1

# Check key permissions
ls -la ~/.ssh/id_rsa
# Should be: -rw------- (600)
chmod 600 ~/.ssh/id_rsa

# Verify the public key is on the remote host
ssh ubuntu@server1 cat ~/.ssh/authorized_keys
```

### Fix 2: Correct User and Key in Inventory

```ini
[webservers]
server1 ansible_host=10.0.1.10 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/correct_key
```

### Fix 3: SSH Agent Issues

```bash
# Check if the agent has your key
ssh-add -l

# Add the key to the agent
ssh-add ~/.ssh/id_rsa
```

## Sudo/Become Authentication Fixes

### Fix 4: Provide the Become Password

```bash
# Prompt for sudo password
ansible-playbook playbook.yml --ask-become-pass

# Or set it in vault-encrypted variables
```

```yaml
# group_vars/all/vault.yml (encrypt with ansible-vault)
ansible_become_password: "{{ vault_become_password }}"
```

### Fix 5: Passwordless Sudo

Configure passwordless sudo on the target:

```bash
# On the target, add to sudoers
echo "ansible_user ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/ansible
```

### Fix 6: Wrong become_user

```yaml
# Make sure become_user matches who you need to become
- hosts: all
  become: yes
  become_user: root  # Default, but be explicit
  become_method: sudo
```

## Debugging

```bash
# Maximum verbosity shows authentication details
ansible -i inventory server1 -m ping -vvvv

# The output will show which authentication methods are tried
```

## Summary

Authentication failures are credential issues. For SSH, verify the key file path, permissions, and that the public key is in the remote user's authorized_keys. For privilege escalation, ensure the sudo password is provided or the user has passwordless sudo configured. The `-vvvv` flag reveals exactly which authentication methods are attempted and which fail.

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

