# How to Use Ansible for Compliance Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Compliance, Security, CIS Benchmarks

Description: Automate compliance checks and remediation with Ansible to enforce CIS benchmarks, SOC 2 controls, and security baselines across your infrastructure.

---

Compliance is not a checkbox you tick once. It requires continuous verification that your systems meet security standards. Ansible can both check compliance status and remediate violations, turning compliance from a periodic audit exercise into continuous enforcement.

This post covers automating compliance with Ansible.

## Compliance Framework

```mermaid
graph TD
    A[Define Standards] --> B[Write Ansible Roles]
    B --> C[Check Mode Audit]
    C --> D[Generate Report]
    D --> E[Remediate Violations]
    E --> F[Verify Compliance]
    F --> C
```

## CIS Benchmark Implementation

The CIS (Center for Internet Security) benchmarks define security configurations. Here is how to implement them as Ansible tasks:

```yaml
# roles/cis_baseline/tasks/main.yml
# CIS Level 1 Server Benchmark for Ubuntu 22.04
---
- name: "CIS 1.1.1 - Disable unused filesystems"
  ansible.builtin.template:
    src: disable-filesystems.conf.j2
    dest: /etc/modprobe.d/cis-disable-filesystems.conf
    mode: '0644'
  tags: [cis, cis-1.1.1]

- name: "CIS 1.4.1 - Ensure permissions on bootloader config"
  ansible.builtin.file:
    path: /boot/grub/grub.cfg
    owner: root
    group: root
    mode: '0400'
  tags: [cis, cis-1.4.1]

- name: "CIS 3.4.1 - Ensure TCP wrappers installed"
  ansible.builtin.apt:
    name: tcpd
    state: present
  tags: [cis, cis-3.4.1]

- name: "CIS 5.2.1 - Ensure SSH Protocol is set to 2"
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^Protocol'
    line: 'Protocol 2'
  notify: restart sshd
  tags: [cis, cis-5.2.1, ssh]

- name: "CIS 5.2.2 - Ensure SSH LogLevel is set to INFO"
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^LogLevel'
    line: 'LogLevel INFO'
  notify: restart sshd
  tags: [cis, cis-5.2.2, ssh]

- name: "CIS 5.2.3 - Set SSH MaxAuthTries to 4"
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^MaxAuthTries'
    line: 'MaxAuthTries 4'
  notify: restart sshd
  tags: [cis, cis-5.2.3, ssh]

- name: "CIS 5.2.5 - Disable SSH root login"
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^PermitRootLogin'
    line: 'PermitRootLogin no'
  notify: restart sshd
  tags: [cis, cis-5.2.5, ssh]

- name: "CIS 5.2.8 - Disable SSH empty passwords"
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: '^PermitEmptyPasswords'
    line: 'PermitEmptyPasswords no'
  notify: restart sshd
  tags: [cis, cis-5.2.8, ssh]

- name: "CIS 5.4.1.1 - Ensure password expiration is 365 days"
  ansible.builtin.lineinfile:
    path: /etc/login.defs
    regexp: '^PASS_MAX_DAYS'
    line: 'PASS_MAX_DAYS 365'
  tags: [cis, cis-5.4.1.1, passwords]

- name: "CIS 6.1.2 - Ensure permissions on /etc/passwd"
  ansible.builtin.file:
    path: /etc/passwd
    owner: root
    group: root
    mode: '0644'
  tags: [cis, cis-6.1.2]

- name: "CIS 6.1.3 - Ensure permissions on /etc/shadow"
  ansible.builtin.file:
    path: /etc/shadow
    owner: root
    group: shadow
    mode: '0640'
  tags: [cis, cis-6.1.3]
```

## Compliance Audit Mode

Run compliance checks without making changes:

```yaml
# playbooks/compliance-audit.yml
# Audit compliance without remediation
---
- name: Compliance audit
  hosts: all
  become: true

  tasks:
    - name: Run CIS baseline in check mode
      ansible.builtin.include_role:
        name: cis_baseline
      check_mode: true
      register: cis_results

    - name: Collect compliance status
      ansible.builtin.set_fact:
        compliance_status:
          host: "{{ inventory_hostname }}"
          compliant: "{{ not cis_results.changed | default(false) }}"
          findings: "{{ cis_results.results | default([]) | selectattr('changed', 'equalto', true) | list }}"

    - name: Report findings
      ansible.builtin.debug:
        msg: |
          Host: {{ inventory_hostname }}
          Status: {{ 'COMPLIANT' if compliance_status.compliant else 'NON-COMPLIANT' }}
          Findings: {{ compliance_status.findings | length }}
```

## Compliance Reporting

Generate detailed compliance reports:

```yaml
# playbooks/compliance-report.yml
# Generate compliance reports for auditors
---
- name: Generate compliance report
  hosts: all
  become: true

  tasks:
    - name: Check SSH configuration compliance
      ansible.builtin.command: sshd -T
      register: sshd_config
      changed_when: false

    - name: Check file permissions
      ansible.builtin.stat:
        path: "{{ item }}"
      register: file_perms
      loop:
        - /etc/passwd
        - /etc/shadow
        - /etc/group
        - /etc/gshadow
        - /boot/grub/grub.cfg

    - name: Check for unnecessary services
      ansible.builtin.service_facts:

    - name: Identify unauthorized services
      ansible.builtin.set_fact:
        unauthorized_services: >-
          {{ ansible_facts.services | dict2items
             | selectattr('value.state', 'equalto', 'running')
             | map(attribute='key')
             | difference(approved_services)
             | list }}

    - name: Compile host compliance data
      ansible.builtin.set_fact:
        host_compliance:
          hostname: "{{ inventory_hostname }}"
          ssh_root_login: "{{ 'no' in sshd_config.stdout }}"
          file_permissions_ok: "{{ file_perms.results | selectattr('stat.mode', 'defined') | list | length == file_perms.results | length }}"
          unauthorized_services: "{{ unauthorized_services }}"
          timestamp: "{{ ansible_date_time.iso8601 }}"

- name: Compile and distribute report
  hosts: localhost
  connection: local
  tasks:
    - name: Generate HTML compliance report
      ansible.builtin.template:
        src: compliance-report.html.j2
        dest: "./reports/compliance-{{ ansible_date_time.date }}.html"
        mode: '0644'

    - name: Send report to compliance team
      community.general.mail:
        host: "{{ smtp_host }}"
        to: compliance@example.com
        subject: "Compliance Report - {{ ansible_date_time.date }}"
        body: "See attached compliance report."
        attach: "./reports/compliance-{{ ansible_date_time.date }}.html"
```

## Automated Remediation

When violations are found, fix them:

```yaml
# playbooks/remediate-compliance.yml
# Fix compliance violations
---
- name: Remediate compliance violations
  hosts: all
  become: true

  tasks:
    - name: Apply CIS baseline (full remediation)
      ansible.builtin.include_role:
        name: cis_baseline
      diff: true
      register: remediation_result

    - name: Log remediation actions
      ansible.builtin.lineinfile:
        path: /var/log/compliance-remediation.log
        line: "{{ ansible_date_time.iso8601 }} - {{ item.invocation.module_name | default('unknown') }} - {{ item.item | default('') }}"
        create: true
        mode: '0644'
      loop: "{{ remediation_result.results | default([]) | selectattr('changed', 'equalto', true) | list }}"
      when: remediation_result.changed | default(false)
```

## Schedule Continuous Compliance

```yaml
# roles/compliance_scheduler/tasks/main.yml
---
- name: Schedule daily compliance audit
  ansible.builtin.cron:
    name: "Daily compliance audit"
    hour: "6"
    minute: "0"
    job: >
      ansible-playbook /opt/ansible/playbooks/compliance-audit.yml
      --check --diff
      >> /var/log/compliance-audit.log 2>&1

- name: Schedule weekly remediation
  ansible.builtin.cron:
    name: "Weekly compliance remediation"
    weekday: "0"
    hour: "2"
    minute: "0"
    job: >
      ansible-playbook /opt/ansible/playbooks/remediate-compliance.yml
      >> /var/log/compliance-remediation.log 2>&1
```

## Key Takeaways

Compliance automation with Ansible turns security standards like CIS benchmarks into executable code. Run compliance checks in audit mode (check mode) to generate reports without making changes. Use full runs for remediation. Schedule daily audits and weekly remediation. Generate reports that auditors can use during compliance reviews. The key benefit is that compliance becomes continuous rather than periodic, catching violations when they happen instead of months later during an audit.
