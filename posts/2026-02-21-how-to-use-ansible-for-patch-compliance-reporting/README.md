# How to Use Ansible for Patch Compliance Reporting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Patching, Compliance, Reporting, DevOps

Description: Generate patch compliance reports with Ansible to track security update status across your fleet.

---

Compliance automation with Ansible turns manual audit checklists into executable code. Instead of documenting what should be configured and hoping someone follows the documentation, you write Ansible playbooks that enforce the configuration and validate it automatically.

## Building a Compliance Role

```yaml
# roles/compliance/tasks/main.yml
# Main compliance enforcement playbook
- name: Include compliance checks
  ansible.builtin.include_tasks: "{{ item }}.yml"
  loop:
    - access_control
    - encryption
    - logging
    - network_security
    - patch_management
```

## Compliance Check Pattern

Every compliance control follows the same pattern: check the current state, remediate if needed, and validate the result.

```yaml
# roles/compliance/tasks/access_control.yml
# Enforce access control requirements
- name: Ensure password complexity is configured
  ansible.builtin.lineinfile:
    path: /etc/security/pwquality.conf
    regexp: "^{{ item.key }}"
    line: "{{ item.key }} = {{ item.value }}"
  loop:
    - { key: minlen, value: "14" }
    - { key: dcredit, value: "-1" }
    - { key: ucredit, value: "-1" }
    - { key: lcredit, value: "-1" }

- name: Ensure SSH root login is disabled
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^PermitRootLogin'
    line: 'PermitRootLogin no'
  notify: restart sshd

- name: Ensure account lockout is configured
  ansible.builtin.lineinfile:
    path: /etc/security/faillock.conf
    regexp: '^deny'
    line: 'deny = 5'
```

## Validation Playbook

```yaml
# playbooks/validate_compliance.yml
# Validate compliance controls without making changes
- name: Validate compliance
  hosts: all
  become: true
  tasks:
    - name: Check SSH configuration
      ansible.builtin.command: sshd -T
      register: sshd_config
      changed_when: false

    - name: Assert SSH hardening
      ansible.builtin.assert:
        that:
          - "'permitrootlogin no' in sshd_config.stdout"
          - "'passwordauthentication no' in sshd_config.stdout"
        fail_msg: "SSH hardening controls are not in place"

    - name: Check auditd is running
      ansible.builtin.service_facts:

    - name: Assert audit logging is active
      ansible.builtin.assert:
        that:
          - ansible_facts.services['auditd.service'].state == 'running'
```

## Reporting

```yaml
# playbooks/compliance_report.yml
# Generate compliance status report
- name: Compliance report
  hosts: all
  become: true
  vars:
    report_results: []
  tasks:
    - name: Run compliance checks
      ansible.builtin.include_tasks: compliance_checks.yml

    - name: Generate HTML report
      ansible.builtin.template:
        src: compliance_report.html.j2
        dest: "/tmp/compliance_{{ inventory_hostname }}.html"
      delegate_to: localhost
```

## Scheduling Compliance Scans

```yaml
# Use cron or systemd timers to run compliance checks regularly
- name: Schedule weekly compliance scan
  ansible.builtin.cron:
    name: "Weekly compliance scan"
    minute: "0"
    hour: "2"
    weekday: "1"
    job: "ansible-playbook /opt/ansible/playbooks/validate_compliance.yml -i /opt/ansible/inventory >> /var/log/compliance_scan.log 2>&1"
    user: ansible
```

## CI/CD Integration

```yaml
# .github/workflows/compliance.yml
name: Compliance Validation
on:
  schedule:
    - cron: '0 6 * * 1'
  push:
    paths:
      - 'roles/compliance/**'
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run compliance validation
        run: ansible-playbook playbooks/validate_compliance.yml --check
```


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


## Conclusion

Compliance automation with Ansible transforms audit requirements from documentation into executable, testable code. Define your controls as Ansible tasks, validate them with assert modules, generate reports for auditors, and run scans on a schedule. This approach ensures continuous compliance rather than point-in-time assessments.
