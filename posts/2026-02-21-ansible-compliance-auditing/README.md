# How to Use Ansible to Automate Compliance Auditing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Compliance, Security, Auditing, DevOps

Description: Automate compliance auditing with Ansible to check security baselines, generate reports, and enforce configuration standards across servers.

---

Compliance auditing is a recurring burden for organizations subject to PCI DSS, HIPAA, SOC 2, or CIS benchmark requirements. Manually checking every server against hundreds of control points is time-consuming and incomplete. Ansible can automate compliance checks, running them on a schedule and generating detailed reports that show exactly which servers pass and which need remediation.

## Role Defaults

```yaml
# roles/compliance/defaults/main.yml - Compliance audit configuration
compliance_report_dir: /opt/compliance-reports
compliance_framework: cis_ubuntu_22
compliance_auto_remediate: false
compliance_notify_email: security@example.com

# CIS Benchmark checks to run
compliance_checks:
  filesystem:
    - ensure_tmp_separate_partition
    - ensure_nodev_on_tmp
    - ensure_nosuid_on_tmp
  ssh:
    - ensure_ssh_protocol_2
    - ensure_ssh_log_level
    - ensure_ssh_max_auth_tries
    - ensure_ssh_root_login_disabled
    - ensure_ssh_permit_empty_passwords_disabled
  network:
    - ensure_ip_forwarding_disabled
    - ensure_source_routing_disabled
    - ensure_icmp_redirects_disabled
  logging:
    - ensure_rsyslog_installed
    - ensure_rsyslog_running
    - ensure_log_permissions
  accounts:
    - ensure_password_expiration
    - ensure_minimum_password_length
    - ensure_inactive_accounts_locked
```

## Main Tasks

```yaml
# roles/compliance/tasks/main.yml - Run compliance audit
---
- name: Create report directory
  file:
    path: "{{ compliance_report_dir }}"
    state: directory
    mode: '0700'

- name: Initialize compliance report
  set_fact:
    compliance_results: []

- name: Run SSH compliance checks
  include_tasks: check_ssh.yml

- name: Run filesystem compliance checks
  include_tasks: check_filesystem.yml

- name: Run network compliance checks
  include_tasks: check_network.yml

- name: Run account compliance checks
  include_tasks: check_accounts.yml

- name: Generate compliance report
  template:
    src: compliance_report.j2
    dest: "{{ compliance_report_dir }}/{{ inventory_hostname }}_{{ ansible_date_time.date }}.txt"
    mode: '0600'

- name: Calculate compliance score
  set_fact:
    compliance_score: "{{ (compliance_results | selectattr('status', 'equalto', 'PASS') | list | length / compliance_results | length * 100) | round(1) }}"

- name: Display compliance score
  debug:
    msg: "Compliance score for {{ inventory_hostname }}: {{ compliance_score }}%"
```

## SSH Compliance Checks

```yaml
# roles/compliance/tasks/check_ssh.yml - SSH security checks
---
- name: Check SSH Protocol version
  command: grep -E "^Protocol" /etc/ssh/sshd_config
  register: ssh_protocol
  changed_when: false
  ignore_errors: yes

- name: Record SSH protocol check result
  set_fact:
    compliance_results: "{{ compliance_results + [{'check': 'SSH Protocol 2', 'status': 'PASS' if '2' in (ssh_protocol.stdout | default('')) else 'FAIL', 'detail': ssh_protocol.stdout | default('Not configured')}] }}"

- name: Check SSH root login disabled
  command: grep -E "^PermitRootLogin" /etc/ssh/sshd_config
  register: ssh_root
  changed_when: false
  ignore_errors: yes

- name: Record root login check
  set_fact:
    compliance_results: "{{ compliance_results + [{'check': 'SSH Root Login Disabled', 'status': 'PASS' if 'no' in (ssh_root.stdout | default('')) else 'FAIL', 'detail': ssh_root.stdout | default('Not configured')}] }}"

- name: Check SSH MaxAuthTries
  command: grep -E "^MaxAuthTries" /etc/ssh/sshd_config
  register: ssh_max_auth
  changed_when: false
  ignore_errors: yes

- name: Record MaxAuthTries check
  set_fact:
    compliance_results: "{{ compliance_results + [{'check': 'SSH MaxAuthTries <= 4', 'status': 'PASS' if (ssh_max_auth.stdout | default('MaxAuthTries 6') | regex_search('[0-9]+') | int) <= 4 else 'FAIL', 'detail': ssh_max_auth.stdout | default('Not configured')}] }}"

- name: Auto-remediate SSH settings
  template:
    src: sshd_compliant.conf.j2
    dest: /etc/ssh/sshd_config.d/compliance.conf
    mode: '0600'
  when: compliance_auto_remediate
  notify: restart sshd
```

## Report Template

```
# roles/compliance/templates/compliance_report.j2
Compliance Audit Report
========================
Host: {{ inventory_hostname }}
Date: {{ ansible_date_time.iso8601 }}
Framework: {{ compliance_framework }}
OS: {{ ansible_distribution }} {{ ansible_distribution_version }}

Results:
--------
{% for result in compliance_results %}
[{{ result.status }}] {{ result.check }}
  Detail: {{ result.detail }}
{% endfor %}

Summary:
--------
Total Checks: {{ compliance_results | length }}
Passed: {{ compliance_results | selectattr('status', 'equalto', 'PASS') | list | length }}
Failed: {{ compliance_results | selectattr('status', 'equalto', 'FAIL') | list | length }}
Score: {{ (compliance_results | selectattr('status', 'equalto', 'PASS') | list | length / compliance_results | length * 100) | round(1) }}%
```

## Running the Audit

```bash
# Run compliance audit across all servers
ansible-playbook -i inventory/hosts.ini audit.yml

# Run with auto-remediation enabled
ansible-playbook -i inventory/hosts.ini audit.yml -e "compliance_auto_remediate=true"
```

## Summary

Ansible-based compliance auditing transforms a manual, error-prone process into an automated, repeatable workflow. The playbook checks every server against your compliance framework, generates detailed reports with pass/fail results for each control, and can optionally auto-remediate failures. Running this on a regular schedule keeps your infrastructure continuously compliant rather than scrambling before audit time.

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

