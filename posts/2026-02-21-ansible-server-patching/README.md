# How to Use Ansible to Automate Server Patching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Patching, Security, Linux, Automation

Description: Automate server patching with Ansible using rolling updates, pre-patch snapshots, reboot management, and post-patch validation across your fleet.

---

Server patching is the unglamorous but critical task that keeps your infrastructure secure. Unpatched systems are the top attack vector for most organizations. Yet patching is often delayed because it requires coordination, careful sequencing, and the risk of something breaking. Ansible transforms patching from a manual weekend maintenance window into an automated, controlled process with built-in safety checks.

## Role Defaults

```yaml
# roles/patching/defaults/main.yml - Patching configuration
patching_reboot_enabled: true
patching_reboot_timeout: 600
patching_pre_check_enabled: true
patching_post_check_enabled: true
patching_exclude_packages: []
patching_security_only: false
patching_serial: "25%"
patching_max_fail_percentage: 0

# Health check URL (application-level validation)
patching_health_url: ""
patching_health_retries: 10
patching_health_delay: 10
```

## Main Tasks

```yaml
# roles/patching/tasks/main.yml - Server patching workflow
---
- name: Run pre-patch checks
  include_tasks: pre_checks.yml
  when: patching_pre_check_enabled

- name: Update apt cache
  apt:
    update_cache: yes
    cache_valid_time: 0

- name: Get list of upgradable packages
  command: apt list --upgradable
  register: upgradable_packages
  changed_when: false

- name: Display packages to be updated
  debug:
    msg: "{{ upgradable_packages.stdout_lines }}"

- name: Apply security updates only
  apt:
    upgrade: dist
    update_cache: yes
    default_release: "{{ ansible_distribution_release }}-security"
  when: patching_security_only
  register: security_update

- name: Apply all available updates
  apt:
    upgrade: dist
    update_cache: yes
  when: not patching_security_only
  register: full_update

- name: Check if reboot is required
  stat:
    path: /var/run/reboot-required
  register: reboot_required

- name: Display reboot status
  debug:
    msg: "Reboot required: {{ reboot_required.stat.exists }}"

- name: Reboot server if required
  reboot:
    msg: "Ansible patching: rebooting for kernel/package updates"
    reboot_timeout: "{{ patching_reboot_timeout }}"
    pre_reboot_delay: 5
    post_reboot_delay: 30
  when: patching_reboot_enabled and reboot_required.stat.exists

- name: Run post-patch checks
  include_tasks: post_checks.yml
  when: patching_post_check_enabled
```

## Pre-Patch Checks

```yaml
# roles/patching/tasks/pre_checks.yml - Validate before patching
---
- name: Check disk space (need at least 2GB free)
  command: df -BG / --output=avail
  register: disk_space
  changed_when: false

- name: Fail if insufficient disk space
  fail:
    msg: "Insufficient disk space for patching. Available: {{ disk_space.stdout_lines[1] | trim }}"
  when: (disk_space.stdout_lines[1] | trim | regex_replace('G','') | int) < 2

- name: Record running services before patching
  command: systemctl list-units --type=service --state=running --no-pager
  register: pre_patch_services
  changed_when: false

- name: Save pre-patch service list
  copy:
    content: "{{ pre_patch_services.stdout }}"
    dest: /tmp/pre_patch_services.txt
    mode: '0644'

- name: Record current kernel version
  command: uname -r
  register: pre_patch_kernel
  changed_when: false
```

## Post-Patch Checks

```yaml
# roles/patching/tasks/post_checks.yml - Validate after patching
---
- name: Verify system booted successfully
  command: systemctl is-system-running
  register: system_status
  changed_when: false
  ignore_errors: yes

- name: Check for failed services
  command: systemctl --failed --no-pager
  register: failed_services
  changed_when: false

- name: Display any failed services
  debug:
    msg: "{{ failed_services.stdout_lines }}"
  when: failed_services.stdout_lines | length > 1

- name: Check application health endpoint
  uri:
    url: "{{ patching_health_url }}"
    status_code: 200
  register: app_health
  until: app_health.status == 200
  retries: "{{ patching_health_retries }}"
  delay: "{{ patching_health_delay }}"
  when: patching_health_url | length > 0

- name: Record current kernel version
  command: uname -r
  register: post_patch_kernel
  changed_when: false

- name: Generate patching report
  copy:
    content: |
      Patching Report for {{ inventory_hostname }}
      Date: {{ ansible_date_time.iso8601 }}
      Kernel Before: {{ pre_patch_kernel.stdout | default('N/A') }}
      Kernel After: {{ post_patch_kernel.stdout }}
      Reboot Required: {{ reboot_required.stat.exists }}
      System Status: {{ system_status.stdout | default('unknown') }}
    dest: /var/log/patching-report-{{ ansible_date_time.date }}.txt
    mode: '0644'
```

## Main Playbook

```yaml
# patch.yml - Rolling patch playbook
---
- hosts: all
  become: yes
  serial: "{{ patching_serial }}"
  max_fail_percentage: "{{ patching_max_fail_percentage }}"
  roles:
    - patching
```

## Running the Playbook

```bash
# Patch all servers with rolling updates (25% at a time)
ansible-playbook -i inventory/hosts.ini patch.yml

# Patch only web servers with security updates
ansible-playbook -i inventory/hosts.ini patch.yml \
  --limit web_servers \
  -e "patching_security_only=true"

# Dry run to see what would be updated
ansible-playbook -i inventory/hosts.ini patch.yml --check
```

## Summary

Automated patching with Ansible gives you consistent, auditable, and safe server updates. The rolling update strategy ensures not all servers go down at once, pre-patch checks catch issues before they become problems, and post-patch validation confirms everything came back cleanly. Running this on a regular schedule keeps your infrastructure secure without the stress of manual maintenance windows.

## Building Custom Compliance Roles

The most effective approach is creating a dedicated compliance role with tasks organized by control area:

```yaml
# roles/compliance_checks/tasks/main.yml
# Master task list for compliance validation
- name: Load compliance requirements
  ansible.builtin.include_vars:
    file: "requirements/{{ compliance_framework }}.yml"

- name: Run access control checks
  ansible.builtin.include_tasks: access_control.yml
  tags: [access]

- name: Run encryption checks
  ansible.builtin.include_tasks: encryption.yml
  tags: [encryption]

- name: Run logging checks
  ansible.builtin.include_tasks: logging.yml
  tags: [logging]

- name: Run network security checks
  ansible.builtin.include_tasks: network.yml
  tags: [network]

- name: Generate compliance report
  ansible.builtin.include_tasks: report.yml
  tags: [report]
```

## Encrypting Data at Rest

```yaml
# roles/compliance_checks/tasks/encryption.yml
# Verify encryption requirements are met
- name: Check if LUKS encryption is enabled on data volumes
  ansible.builtin.command: lsblk -f
  register: block_devices
  changed_when: false

- name: Check TLS certificate validity
  ansible.builtin.command: >
    openssl x509 -in /etc/ssl/certs/app.pem -noout -dates
  register: cert_dates
  changed_when: false
  failed_when: false

- name: Verify certificate is not expired
  ansible.builtin.assert:
    that:
      - cert_dates.rc == 0
    fail_msg: "TLS certificate check failed"
    success_msg: "TLS certificate is valid"
```

## Networking and Firewall Validation

```yaml
# roles/compliance_checks/tasks/network.yml
# Validate network security controls
- name: Check firewall is active
  ansible.builtin.command: ufw status
  register: firewall_status
  changed_when: false
  failed_when: false

- name: Assert firewall is enabled
  ansible.builtin.assert:
    that:
      - "'Status: active' in firewall_status.stdout"
    fail_msg: "Firewall is not active"

- name: Check for unauthorized listening ports
  ansible.builtin.command: ss -tlnp
  register: listening_ports
  changed_when: false

- name: Verify only approved ports are open
  ansible.builtin.assert:
    that:
      - "item not in listening_ports.stdout"
    fail_msg: "Unauthorized port {{ item }} is listening"
  loop: "{{ prohibited_ports | default(['23', '21', '69']) }}"
```

## Automated Remediation Workflow

The real power of compliance automation is combining detection with remediation:

```yaml
# playbooks/remediate_compliance.yml
# Detect and fix compliance issues automatically
- name: Compliance remediation
  hosts: all
  become: true
  tasks:
    - name: Ensure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^X11Forwarding', line: 'X11Forwarding no' }
        - { regexp: '^MaxAuthTries', line: 'MaxAuthTries 4' }
        - { regexp: '^ClientAliveInterval', line: 'ClientAliveInterval 300' }
        - { regexp: '^ClientAliveCountMax', line: 'ClientAliveCountMax 0' }
      notify: restart sshd

    - name: Ensure audit logging is configured
      ansible.builtin.package:
        name: auditd
        state: present

    - name: Start and enable auditd
      ansible.builtin.service:
        name: auditd
        state: started
        enabled: true

    - name: Deploy audit rules
      ansible.builtin.copy:
        dest: /etc/audit/rules.d/compliance.rules
        content: |
          # Monitor authentication events
          -w /var/log/faillog -p wa -k logins
          -w /var/log/lastlog -p wa -k logins
          # Monitor user and group changes
          -w /etc/passwd -p wa -k identity
          -w /etc/group -p wa -k identity
          -w /etc/shadow -p wa -k identity
          # Monitor sudo usage
          -w /etc/sudoers -p wa -k actions
          -w /var/log/sudo.log -p wa -k actions
        mode: '0640'
      notify: restart auditd

    - name: Configure password aging
      ansible.builtin.lineinfile:
        path: /etc/login.defs
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PASS_MAX_DAYS', line: 'PASS_MAX_DAYS 90' }
        - { regexp: '^PASS_MIN_DAYS', line: 'PASS_MIN_DAYS 7' }
        - { regexp: '^PASS_WARN_AGE', line: 'PASS_WARN_AGE 14' }

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted

    - name: restart auditd
      ansible.builtin.service:
        name: auditd
        state: restarted
```

## Report Generation

```yaml
# playbooks/generate_report.yml
# Generate a human-readable compliance report
- name: Generate compliance report
  hosts: all
  become: true
  vars:
    checks_passed: []
    checks_failed: []
  tasks:
    - name: Check SSH root login
      ansible.builtin.command: sshd -T
      register: sshd_config
      changed_when: false

    - name: Record SSH check
      ansible.builtin.set_fact:
        checks_passed: "{{ checks_passed + ['SSH root login disabled'] }}"
      when: "'permitrootlogin no' in sshd_config.stdout"

    - name: Record SSH failure
      ansible.builtin.set_fact:
        checks_failed: "{{ checks_failed + ['SSH root login NOT disabled'] }}"
      when: "'permitrootlogin no' not in sshd_config.stdout"

    - name: Check password complexity
      ansible.builtin.command: grep -E '^minlen' /etc/security/pwquality.conf
      register: pwquality
      changed_when: false
      failed_when: false

    - name: Record password check
      ansible.builtin.set_fact:
        checks_passed: "{{ checks_passed + ['Password minimum length configured'] }}"
      when: pwquality.rc == 0

    - name: Print compliance summary
      ansible.builtin.debug:
        msg: |
          ========================================
          Compliance Report for {{ inventory_hostname }}
          Date: {{ ansible_date_time.iso8601 }}
          ========================================
          PASSED: {{ checks_passed | length }}
          {% for check in checks_passed %}
            [PASS] {{ check }}
          {% endfor %}
          FAILED: {{ checks_failed | length }}
          {% for check in checks_failed %}
            [FAIL] {{ check }}
          {% endfor %}
          ========================================
          Score: {{ (checks_passed | length * 100 / (checks_passed | length + checks_failed | length)) | round(1) }}%
```

