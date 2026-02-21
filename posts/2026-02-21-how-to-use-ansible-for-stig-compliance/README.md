# How to Use Ansible for STIG Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, STIG, Security, DoD, Compliance

Description: Automate DISA STIG compliance checks and remediation with Ansible for Department of Defense security requirements.

---

Security Technical Implementation Guides (STIGs) are configuration standards published by the Defense Information Systems Agency (DISA). They are mandatory for Department of Defense systems and widely adopted in government and regulated industries. Ansible automates both the remediation and validation of STIG requirements.

## Using STIG Automation Content

DISA and the community provide Ansible content for STIGs:

```bash
# Install STIG hardening role
ansible-galaxy install ansible-lockdown.rhel9_stig
```

```yaml
# playbooks/stig_hardening.yml
- name: Apply STIG hardening
  hosts: all
  become: true
  vars:
    rhel9stig_cat1_patch: true   # Critical findings
    rhel9stig_cat2_patch: true   # Medium findings
    rhel9stig_cat3_patch: false  # Low findings (optional)
  roles:
    - ansible-lockdown.rhel9_stig
```

## Custom STIG Remediation Tasks

```yaml
# roles/stig/tasks/authentication.yml
# STIG authentication controls
- name: "V-230234 - Set password minimum length"
  ansible.builtin.lineinfile:
    path: /etc/security/pwquality.conf
    regexp: '^minlen'
    line: 'minlen = 15'

- name: "V-230235 - Require password complexity"
  ansible.builtin.lineinfile:
    path: /etc/security/pwquality.conf
    regexp: "^{{ item.key }}"
    line: "{{ item.key }} = {{ item.value }}"
  loop:
    - { key: 'dcredit', value: '-1' }
    - { key: 'ucredit', value: '-1' }
    - { key: 'lcredit', value: '-1' }
    - { key: 'ocredit', value: '-1' }

- name: "V-230269 - Set account lockout threshold"
  ansible.builtin.lineinfile:
    path: /etc/security/faillock.conf
    regexp: '^deny'
    line: 'deny = 3'
```

```yaml
# roles/stig/tasks/audit.yml
# STIG audit logging requirements
- name: "V-230386 - Enable auditd"
  ansible.builtin.service:
    name: auditd
    state: started
    enabled: true

- name: "V-230392 - Audit privileged commands"
  ansible.builtin.copy:
    dest: /etc/audit/rules.d/stig.rules
    content: |
      -a always,exit -F arch=b64 -S execve -C uid!=euid -F euid=0 -k execpriv
      -a always,exit -F arch=b64 -S execve -C gid!=egid -F egid=0 -k execpriv
      -w /etc/passwd -p wa -k identity
      -w /etc/group -p wa -k identity
      -w /etc/shadow -p wa -k identity
      -w /etc/sudoers -p wa -k actions
    mode: '0640'
  notify: restart auditd
```

## STIG Validation

```yaml
# playbooks/validate_stig.yml
- name: Validate STIG compliance
  hosts: all
  become: true
  tasks:
    - name: Check minimum password length
      ansible.builtin.command: grep -E '^minlen' /etc/security/pwquality.conf
      register: minlen
      changed_when: false

    - name: Assert minimum password length meets STIG
      ansible.builtin.assert:
        that:
          - "'minlen = 15' in minlen.stdout or (minlen.stdout.split('=')[1] | trim | int) >= 15"
        fail_msg: "V-230234 FAIL: Password minimum length not set to 15+"

    - name: Check auditd is running
      ansible.builtin.service_facts:

    - name: Assert auditd is active
      ansible.builtin.assert:
        that:
          - ansible_facts.services['auditd.service'].state == 'running'
        fail_msg: "V-230386 FAIL: auditd is not running"
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

STIG compliance with Ansible follows the same pattern as CIS benchmarks: translate each STIG finding into an Ansible task, organize by category, and build validation playbooks. The key difference is that STIGs are categorized by severity (CAT I, II, III) which maps naturally to Ansible variable toggles for controlling which remediations to apply.
