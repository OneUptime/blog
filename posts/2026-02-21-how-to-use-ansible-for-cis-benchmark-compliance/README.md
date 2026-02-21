# How to Use Ansible for CIS Benchmark Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, CIS, Security, Compliance, Hardening

Description: Implement CIS benchmark security controls with Ansible for automated system hardening and compliance validation across your infrastructure.

---

CIS Benchmarks are consensus-based security configuration guidelines published by the Center for Internet Security. They provide prescriptive guidance for hardening operating systems, middleware, and applications. Ansible is the ideal tool for implementing these benchmarks because each recommendation maps naturally to an Ansible task.

## Using Existing CIS Roles

The community maintains CIS hardening roles on Ansible Galaxy:

```bash
# Install a CIS hardening role
ansible-galaxy install ansible-lockdown.rhel9_cis
```

```yaml
# playbooks/cis_hardening.yml
# Apply CIS benchmark hardening
- name: Apply CIS Level 1 benchmarks
  hosts: all
  become: true
  vars:
    rhel9cis_level_1: true
    rhel9cis_level_2: false
    rhel9cis_rule_1_1_1_1: true  # Disable cramfs
    rhel9cis_rule_1_1_1_2: true  # Disable squashfs
    rhel9cis_rule_5_2_1: true    # Configure SSH
  roles:
    - ansible-lockdown.rhel9_cis
```

## Custom CIS Implementation

```yaml
# roles/cis_hardening/tasks/filesystem.yml
# CIS Section 1: Filesystem Configuration
- name: "1.1.1.1 - Disable cramfs filesystem"
  ansible.builtin.lineinfile:
    path: /etc/modprobe.d/cis.conf
    line: "install cramfs /bin/true"
    create: true
    mode: '0644'

- name: "1.1.1.2 - Disable squashfs filesystem"
  ansible.builtin.lineinfile:
    path: /etc/modprobe.d/cis.conf
    line: "install squashfs /bin/true"

- name: "1.1.2 - Ensure /tmp is a separate partition"
  ansible.builtin.mount:
    path: /tmp
    src: tmpfs
    fstype: tmpfs
    opts: "defaults,nodev,nosuid,noexec"
    state: mounted
```

```yaml
# roles/cis_hardening/tasks/ssh.yml
# CIS Section 5.2: SSH Server Configuration
- name: "5.2.1 - Set SSH Protocol to 2"
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^Protocol'
    line: 'Protocol 2'
  notify: restart sshd

- name: "5.2.4 - Disable SSH root login"
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^PermitRootLogin'
    line: 'PermitRootLogin no'
  notify: restart sshd

- name: "5.2.5 - Set SSH MaxAuthTries"
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^MaxAuthTries'
    line: 'MaxAuthTries 4'
  notify: restart sshd
```

## Validation Playbook

```yaml
# playbooks/validate_cis.yml
# Validate CIS benchmark compliance
- name: Validate CIS compliance
  hosts: all
  become: true
  tasks:
    - name: Check cramfs is disabled
      ansible.builtin.command: modprobe -n -v cramfs
      register: cramfs_check
      changed_when: false
      failed_when: false

    - name: Assert cramfs is disabled
      ansible.builtin.assert:
        that:
          - "'install /bin/true' in cramfs_check.stdout"
        fail_msg: "CIS 1.1.1.1 FAIL: cramfs is not disabled"
        success_msg: "CIS 1.1.1.1 PASS: cramfs is disabled"

    - name: Check SSH root login
      ansible.builtin.command: sshd -T
      register: sshd_config
      changed_when: false

    - name: Assert root login is disabled
      ansible.builtin.assert:
        that:
          - "'permitrootlogin no' in sshd_config.stdout"
        fail_msg: "CIS 5.2.4 FAIL: Root login is permitted"
```

## Generating CIS Compliance Reports

```yaml
# playbooks/cis_report.yml
- name: Generate CIS compliance report
  hosts: all
  become: true
  tasks:
    - name: Run all CIS checks
      ansible.builtin.include_tasks: checks/{{ item }}.yml
      loop:
        - filesystem
        - network
        - logging
        - ssh
        - access_control
      register: all_checks

    - name: Generate report
      ansible.builtin.template:
        src: cis_report.html.j2
        dest: "/tmp/cis_report_{{ inventory_hostname }}.html"
      delegate_to: localhost
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

CIS benchmark compliance with Ansible is a matter of translating each CIS recommendation into an Ansible task. Use existing community roles as a starting point, customize for your environment, and build validation playbooks that can run on schedule to detect drift from the benchmark. The combination of Ansible's idempotent execution and CIS's prescriptive guidance gives you a reliable compliance automation framework.
