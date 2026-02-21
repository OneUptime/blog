# How to Use Ansible to Automate SOC 2 Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SOC 2, Compliance, Security, Auditing

Description: Automate SOC 2 trust services criteria verification with Ansible covering security, availability, processing integrity, and confidentiality controls.

---

SOC 2 compliance demonstrates to customers that your organization has effective controls for security, availability, processing integrity, confidentiality, and privacy. Unlike PCI DSS, SOC 2 does not prescribe specific technical controls. Instead, it evaluates whether your controls meet the Trust Services Criteria (TSC). Ansible helps by automating the verification that your chosen controls are consistently implemented across all systems.

## Trust Services Criteria

```yaml
# roles/soc2/defaults/main.yml - SOC 2 compliance settings
soc2_criteria:
  security: true
  availability: true
  processing_integrity: true
  confidentiality: true
  privacy: false

soc2_report_dir: /opt/compliance/soc2
soc2_evidence_dir: /opt/compliance/evidence
soc2_auto_remediate: false
```

## Security Criteria Checks

```yaml
# roles/soc2/tasks/security.yml - CC6: Logical and Physical Access Controls
---
- name: "CC6.1: Check that SSH key-based auth is enforced"
  command: grep "^PasswordAuthentication" /etc/ssh/sshd_config
  register: ssh_password_check
  changed_when: false
  ignore_errors: yes

- name: Record SSH auth check
  set_fact:
    soc2_results: "{{ soc2_results | default([]) + [{'criteria': 'CC6.1', 'control': 'SSH key-based authentication', 'status': 'PASS' if 'no' in (ssh_password_check.stdout | default('') | lower) else 'FAIL'}] }}"

- name: "CC6.1: Verify MFA configuration"
  stat:
    path: /etc/pam.d/sshd
  register: pam_sshd

- name: "CC6.3: Check user access review evidence"
  stat:
    path: "{{ soc2_evidence_dir }}/user_access_review_{{ ansible_date_time.date[:7] }}.log"
  register: access_review

- name: "CC6.6: Verify firewall is configured"
  command: ufw status verbose
  register: firewall_status
  changed_when: false

- name: "CC6.8: Check intrusion detection"
  systemd:
    name: fail2ban
    state: started
  check_mode: yes
  register: fail2ban_status
  ignore_errors: yes
```

## Availability Criteria Checks

```yaml
# roles/soc2/tasks/availability.yml - A1: Availability Controls
---
- name: "A1.1: Check that monitoring is active"
  uri:
    url: "http://localhost:9100/metrics"
    status_code: 200
  register: monitoring_check
  ignore_errors: yes

- name: "A1.2: Check backup schedule exists"
  command: crontab -l -u root
  register: cron_list
  changed_when: false

- name: Verify backup cron is configured
  set_fact:
    soc2_results: "{{ soc2_results | default([]) + [{'criteria': 'A1.2', 'control': 'Automated backups configured', 'status': 'PASS' if 'backup' in (cron_list.stdout | default('') | lower) else 'FAIL'}] }}"

- name: "A1.2: Verify system uptime monitoring"
  set_fact:
    soc2_results: "{{ soc2_results | default([]) + [{'criteria': 'A1.2', 'control': 'Uptime monitoring active', 'status': 'PASS' if monitoring_check.status | default(0) == 200 else 'FAIL'}] }}"
```

## Report Generation

```yaml
# roles/soc2/tasks/report.yml - Generate SOC 2 evidence report
---
- name: Generate compliance evidence report
  template:
    src: soc2_report.j2
    dest: "{{ soc2_report_dir }}/{{ inventory_hostname }}_{{ ansible_date_time.date }}.txt"
    mode: '0600'
```

## Running the SOC 2 Audit

```bash
# Run SOC 2 compliance checks across all systems
ansible-playbook -i inventory/hosts.ini soc2-audit.yml

# Generate evidence for specific criteria
ansible-playbook -i inventory/hosts.ini soc2-audit.yml --tags "security,availability"
```

## Summary

SOC 2 compliance with Ansible focuses on verifying that your chosen controls are consistently implemented. The playbook generates evidence documentation that your auditor can review, showing the state of each control across every system in scope. Running these checks regularly, rather than just before an audit, ensures continuous compliance and makes audit preparation straightforward.

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

