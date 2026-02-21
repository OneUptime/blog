# How to Fix Ansible Host is not in the known hosts Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Troubleshooting, Security, DevOps

Description: Resolve Ansible known hosts errors with host key management strategies including auto-adding, key scanning, and security considerations.

---

When connecting to a host for the first time, SSH checks its key against the known_hosts file. If the host is not in known_hosts, SSH prompts for confirmation, which breaks Ansible's non-interactive execution.

## The Error

```
fatal: [server1]: UNREACHABLE! => {
    "msg": "Failed to connect to the host via ssh: Host key verification failed."
}
```

## Fixes

### Fix 1: Disable Host Key Checking (Development Only)

```ini
# ansible.cfg - NOT recommended for production
[defaults]
host_key_checking = False
```

Or via environment variable:

```bash
export ANSIBLE_HOST_KEY_CHECKING=False
```

### Fix 2: Pre-Populate known_hosts

```bash
# Scan and add host keys before running Ansible
ssh-keyscan -H 10.0.1.10 >> ~/.ssh/known_hosts
ssh-keyscan -H 10.0.1.11 >> ~/.ssh/known_hosts
```

### Fix 3: Use Ansible to Manage known_hosts

```yaml
# Add host keys as part of your playbook
- name: Add host to known_hosts
  known_hosts:
    name: "{{ ansible_host }}"
    key: "{{ lookup('pipe', 'ssh-keyscan ' + ansible_host) }}"
    state: present
  delegate_to: localhost
```

### Fix 4: SSH Config Approach

```
# ~/.ssh/config - Accept new keys automatically for trusted networks
Host 10.0.*
    StrictHostKeyChecking accept-new
    UserKnownHostsFile ~/.ssh/known_hosts
```

### Fix 5: Handle Changed Host Keys

If a server was rebuilt, its key has changed:

```bash
# Remove the old key
ssh-keygen -R 10.0.1.10

# Then add the new one
ssh-keyscan -H 10.0.1.10 >> ~/.ssh/known_hosts
```

## Security Considerations

Disabling host key checking removes protection against man-in-the-middle attacks. For production, pre-populate known_hosts using `ssh-keyscan` or manage keys through your configuration management. The `StrictHostKeyChecking accept-new` option is a good middle ground as it accepts keys for new hosts but rejects changed keys.

## Summary

Host key verification errors are SSH doing its job of protecting against impersonation. For development, disable the check. For production, pre-populate known_hosts or use `accept-new` to automatically trust new hosts while still catching key changes on existing hosts.

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

