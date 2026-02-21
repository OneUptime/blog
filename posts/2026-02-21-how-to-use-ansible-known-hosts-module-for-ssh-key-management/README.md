# How to Use Ansible known_hosts Module for SSH Key Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, known_hosts, Security, Key Management

Description: Manage SSH known_hosts entries with Ansible to automate host key verification and prevent SSH connection prompts.

---

The `ansible.builtin.known_hosts` module manages SSH host key entries in the `known_hosts` file. This prevents the "host key verification failed" errors and the interactive "are you sure you want to continue connecting" prompts that break automated workflows.

## Adding Host Keys

```yaml
# Add a host's SSH key to known_hosts
- name: Add server SSH key to known_hosts
  ansible.builtin.known_hosts:
    name: server1.example.com
    key: "{{ lookup('pipe', 'ssh-keyscan server1.example.com 2>/dev/null') }}"
    state: present
```

## Scanning and Adding Multiple Hosts

```yaml
- name: Add all inventory hosts to known_hosts
  hosts: localhost
  tasks:
    - name: Scan and add SSH keys for all hosts
      ansible.builtin.known_hosts:
        name: "{{ hostvars[item].ansible_host | default(item) }}"
        key: "{{ lookup('pipe', 'ssh-keyscan ' + (hostvars[item].ansible_host | default(item)) + ' 2>/dev/null') }}"
        path: ~/.ssh/known_hosts
        state: present
      loop: "{{ groups['all'] }}"
```

## Removing Old Host Keys

```yaml
# Remove a host key (e.g., after server rebuild)
- name: Remove old host key
  ansible.builtin.known_hosts:
    name: server1.example.com
    state: absent
```

## Specifying Key Type

```yaml
# Add only ed25519 key
- name: Add ed25519 host key
  ansible.builtin.known_hosts:
    name: server1.example.com
    key: "{{ lookup('pipe', 'ssh-keyscan -t ed25519 server1.example.com 2>/dev/null') }}"
    state: present
```

## Pre-Provisioning Setup

```yaml
# Add host keys before first connection
- name: Pre-provision SSH keys
  hosts: localhost
  tasks:
    - name: Add new server keys
      ansible.builtin.known_hosts:
        name: "{{ item }}"
        key: "{{ lookup('pipe', 'ssh-keyscan ' + item) }}"
      loop:
        - 10.0.1.10
        - 10.0.1.11
        - 10.0.1.12
```


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


## Conclusion

The `known_hosts` module eliminates interactive SSH prompts in automated workflows. Add host keys before first connections, remove them when servers are rebuilt, and manage them across your team's workstations with a dedicated playbook. This is cleaner and more secure than disabling host key checking entirely.

