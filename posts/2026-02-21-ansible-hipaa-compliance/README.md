# How to Use Ansible to Automate HIPAA Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HIPAA, Compliance, Healthcare, Security

Description: Automate HIPAA security rule compliance with Ansible covering access controls, encryption, audit logging, and PHI protection measures.

---

HIPAA (Health Insurance Portability and Accountability Act) requires organizations handling protected health information (PHI) to implement specific security controls. The HIPAA Security Rule has 54 implementation specifications organized into administrative, physical, and technical safeguards. Ansible helps automate the technical safeguards, ensuring every server that touches PHI meets the required security baseline.

## Technical Safeguards

```yaml
# roles/hipaa/defaults/main.yml - HIPAA compliance settings
hipaa_audit_enabled: true
hipaa_encryption_at_rest: true
hipaa_session_timeout: 900
hipaa_password_min_length: 12
hipaa_password_complexity: true
hipaa_auto_lock_after_failures: 5
hipaa_phi_data_dirs:
  - /opt/app/data
  - /var/lib/postgresql
hipaa_auto_remediate: false
```

## Access Controls (164.312(a))

```yaml
# roles/hipaa/tasks/access_controls.yml - HIPAA access controls
---
- name: "164.312(a)(1): Unique user identification"
  command: "awk -F: '{ if ($3 >= 1000 && $3 < 65534) print $1 }' /etc/passwd"
  register: system_users
  changed_when: false

- name: Verify no shared accounts exist
  set_fact:
    hipaa_results: "{{ hipaa_results | default([]) + [{'section': '164.312(a)(1)', 'check': 'No shared accounts', 'status': 'PASS'}] }}"

- name: "164.312(a)(2)(i): Emergency access procedure"
  stat:
    path: /opt/hipaa/emergency-access-procedure.md
  register: emergency_doc

- name: "164.312(a)(2)(iii): Automatic logoff"
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^ClientAliveInterval'
    line: "ClientAliveInterval {{ hipaa_session_timeout }}"
  when: hipaa_auto_remediate
  notify: restart sshd

- name: Check auto logoff configuration
  command: grep ClientAliveInterval /etc/ssh/sshd_config
  register: alive_interval
  changed_when: false
  ignore_errors: yes

- name: Record auto logoff compliance
  set_fact:
    hipaa_results: "{{ hipaa_results | default([]) + [{'section': '164.312(a)(2)(iii)', 'check': 'Automatic logoff configured', 'status': 'PASS' if hipaa_session_timeout | string in (alive_interval.stdout | default('')) else 'FAIL'}] }}"
```

## Audit Controls (164.312(b))

```yaml
# roles/hipaa/tasks/audit_controls.yml - HIPAA audit logging
---
- name: "164.312(b): Ensure auditd is installed and running"
  apt:
    name: auditd
    state: present

- name: "164.312(b): Configure audit rules for PHI access"
  template:
    src: hipaa-audit.rules.j2
    dest: /etc/audit/rules.d/hipaa.rules
    mode: '0640'
  notify: restart auditd

- name: "164.312(b): Ensure log integrity"
  file:
    path: /var/log/audit
    owner: root
    group: root
    mode: '0700'
```

## Encryption (164.312(a)(2)(iv) and 164.312(e))

```yaml
# roles/hipaa/tasks/encryption.yml - HIPAA encryption requirements
---
- name: "164.312(a)(2)(iv): Verify disk encryption"
  command: lsblk -o NAME,FSTYPE,MOUNTPOINT
  register: disk_info
  changed_when: false

- name: Check for LUKS encryption on PHI data volumes
  command: "cryptsetup isLuks /dev/{{ item }}"
  loop: "{{ hipaa_encrypted_volumes | default(['sda2']) }}"
  register: luks_check
  ignore_errors: yes
  changed_when: false

- name: "164.312(e)(1): Verify TLS for data in transit"
  command: >
    openssl s_client -connect localhost:443 -brief
  register: tls_check
  changed_when: false
  ignore_errors: yes
```

## Running the Compliance Check

```bash
# Run HIPAA compliance audit
ansible-playbook -i inventory/hipaa-systems.ini hipaa-audit.yml

# Generate compliance report
ansible-playbook -i inventory/hipaa-systems.ini hipaa-audit.yml --tags report
```

## Summary

HIPAA compliance automation with Ansible ensures that every system handling PHI consistently meets the Security Rule's technical safeguards. The playbook checks access controls, audit logging, encryption, and session management, generating detailed reports for compliance documentation. Running these checks regularly keeps your systems in compliance between formal risk assessments.

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

