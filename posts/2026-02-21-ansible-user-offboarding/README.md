# How to Use Ansible to Automate User Offboarding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, User Management, Security, Automation, Linux

Description: Automate employee offboarding with Ansible to revoke access, disable accounts, archive data, and audit permissions across all servers.

---

When someone leaves your organization, their access needs to be revoked immediately across every system they had access to. This is a security requirement that many organizations handle poorly, leaving orphaned accounts and active SSH keys on servers for weeks or months. Ansible automates the offboarding process to ensure accounts are disabled, SSH keys are removed, and active sessions are terminated across your entire infrastructure within minutes.

## Role Defaults

```yaml
# roles/offboarding/defaults/main.yml - User offboarding settings
offboarding_archive_home: true
offboarding_archive_dir: /opt/offboarded-users
offboarding_kill_sessions: true
offboarding_remove_crontabs: true

# Users to offboard
offboarding_users:
  - username: jsmith
    reason: "Left company"
    date: "2024-01-15"
  - username: contractor1
    reason: "Contract ended"
    date: "2024-01-15"
```

## Main Tasks

```yaml
# roles/offboarding/tasks/main.yml - User offboarding automation
---
- name: Create archive directory
  file:
    path: "{{ offboarding_archive_dir }}"
    state: directory
    owner: root
    group: root
    mode: '0700'
  when: offboarding_archive_home

- name: Kill active user sessions
  shell: "pkill -KILL -u {{ item.username }} || true"
  loop: "{{ offboarding_users }}"
  when: offboarding_kill_sessions
  changed_when: false
  ignore_errors: yes

- name: Archive home directories before removal
  archive:
    path: "/home/{{ item.username }}"
    dest: "{{ offboarding_archive_dir }}/{{ item.username }}_{{ item.date }}.tar.gz"
    format: gz
  loop: "{{ offboarding_users }}"
  when: offboarding_archive_home
  ignore_errors: yes

- name: Lock user accounts (disable password login)
  command: "usermod -L {{ item.username }}"
  loop: "{{ offboarding_users }}"
  changed_when: true
  ignore_errors: yes

- name: Set shell to nologin
  user:
    name: "{{ item.username }}"
    shell: /usr/sbin/nologin
  loop: "{{ offboarding_users }}"
  ignore_errors: yes

- name: Remove SSH authorized keys
  file:
    path: "/home/{{ item.username }}/.ssh/authorized_keys"
    state: absent
  loop: "{{ offboarding_users }}"

- name: Remove sudo access
  file:
    path: "/etc/sudoers.d/{{ item.username }}"
    state: absent
  loop: "{{ offboarding_users }}"

- name: Remove user crontabs
  command: "crontab -r -u {{ item.username }}"
  loop: "{{ offboarding_users }}"
  when: offboarding_remove_crontabs
  ignore_errors: yes
  changed_when: false

- name: Expire user account
  command: "chage -E 0 {{ item.username }}"
  loop: "{{ offboarding_users }}"
  changed_when: true
  ignore_errors: yes

- name: Revoke database access
  include_tasks: revoke_db.yml

- name: Generate offboarding audit log
  copy:
    content: |
      Offboarding Report
      Date: {{ ansible_date_time.iso8601 }}
      Server: {{ inventory_hostname }}
      {% for user in offboarding_users %}
      User: {{ user.username }}
      Reason: {{ user.reason }}
      Actions taken:
        - Account locked
        - Shell set to nologin
        - SSH keys removed
        - Sudo access revoked
        - Active sessions terminated
        - Home directory archived
        - Crontabs removed
        - Account expired
      {% endfor %}
    dest: "{{ offboarding_archive_dir }}/offboard_{{ ansible_date_time.date }}_report.txt"
    mode: '0600'
```

## Database Access Revocation

```yaml
# roles/offboarding/tasks/revoke_db.yml - Revoke database access
---
- name: Terminate active database sessions
  become_user: postgres
  postgresql_query:
    query: "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = '{{ item.username }}';"
  loop: "{{ offboarding_users }}"
  ignore_errors: yes

- name: Revoke all database privileges
  become_user: postgres
  postgresql_user:
    name: "{{ item.username }}"
    state: absent
  loop: "{{ offboarding_users }}"
  ignore_errors: yes
```

## Post-Offboarding Verification

```yaml
# verify-offboard.yml - Verify accounts are properly disabled
---
- hosts: all
  become: yes
  tasks:
    - name: Check account status
      command: "passwd -S {{ item.username }}"
      loop: "{{ offboarding_users }}"
      register: passwd_status
      changed_when: false
      ignore_errors: yes

    - name: Verify SSH keys are removed
      stat:
        path: "/home/{{ item.username }}/.ssh/authorized_keys"
      loop: "{{ offboarding_users }}"
      register: ssh_keys

    - name: Report status
      debug:
        msg: >
          User {{ item.item.username }} on {{ inventory_hostname }}:
          Password status: {{ item.stdout | default('account not found') }}
      loop: "{{ passwd_status.results }}"
```

## Main Playbook

```yaml
# offboard.yml - Run offboarding across all servers
---
- hosts: all
  become: yes
  roles:
    - offboarding
```

## Running the Playbook

```bash
# Offboard users from all servers
ansible-playbook -i inventory/hosts.ini offboard.yml

# Run with verbose output for compliance audit trail
ansible-playbook -i inventory/hosts.ini offboard.yml -v 2>&1 | tee offboard_audit.log

# Verify after offboarding
ansible-playbook -i inventory/hosts.ini verify-offboard.yml
```

## Summary

Automated offboarding with Ansible is a security necessity. This playbook ensures that when someone leaves, their access is comprehensively revoked across every server in your inventory within minutes. The audit log provides documentation for compliance, and the home directory archive preserves any work files that might be needed later. Running this playbook should be part of your standard HR exit process, triggered as soon as the departure is confirmed.

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

