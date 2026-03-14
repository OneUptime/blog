# How to Use Ansible to Configure Audit Logging (auditd)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Auditd, Security, Logging, Compliance

Description: Set up and manage the Linux audit daemon (auditd) with Ansible to track security events, file access, and system calls across your infrastructure.

---

If you need to know who did what on your Linux servers, auditd is the tool for the job. It is the Linux kernel's native auditing framework, and it can track everything from file modifications to system calls to user logins. The challenge is that configuring it consistently across a fleet of servers is tedious when done manually. Ansible solves that problem.

I have used auditd extensively in environments that require PCI DSS, HIPAA, or SOC 2 compliance. In this post, I will show you how to install, configure, and manage auditd rules using Ansible playbooks.

## What auditd Tracks

The audit daemon can monitor several types of events:

- File access and modifications (who read or changed a file)
- System calls (what programs are doing at the kernel level)
- User authentication events (logins, su, sudo usage)
- Network connections
- Changes to system configuration files

```mermaid
flowchart LR
    A[Kernel] -->|System calls| B[Audit Framework]
    C[File Access] -->|Watches| B
    D[User Actions] -->|Events| B
    B --> E[auditd Daemon]
    E --> F[/var/log/audit/audit.log]
    E --> G[Remote Syslog]
    F --> H[aureport / ausearch]
```

## Installing and Enabling auditd

First, make sure auditd is installed and running on all your servers.

This playbook installs auditd and its utilities, then starts the service:

```yaml
# install_auditd.yml - Install and enable the audit daemon
---
- name: Install and enable auditd
  hosts: all
  become: true

  tasks:
    - name: Install auditd on Debian/Ubuntu
      ansible.builtin.apt:
        name:
          - auditd
          - audispd-plugins
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Install auditd on RHEL/CentOS
      ansible.builtin.yum:
        name:
          - audit
          - audit-libs
        state: present
      when: ansible_os_family == "RedHat"

    - name: Enable and start auditd
      ansible.builtin.service:
        name: auditd
        state: started
        enabled: true

    - name: Set auditd to start early in boot
      ansible.builtin.command: systemctl enable auditd
      changed_when: false
```

## Configuring auditd.conf

The main configuration file controls how auditd behaves, including log file size, rotation, and what happens when the disk fills up.

This template deploys a production-ready auditd configuration:

```yaml
# configure_auditd.yml - Deploy auditd configuration
---
- name: Configure auditd
  hosts: all
  become: true

  vars:
    audit_log_file: /var/log/audit/audit.log
    audit_log_format: RAW
    audit_max_log_file: 50        # MB per log file
    audit_num_logs: 10            # Number of rotated logs
    audit_max_log_file_action: rotate
    audit_space_left: 75          # MB
    audit_space_left_action: email
    audit_action_mail_acct: root
    audit_admin_space_left: 50    # MB
    audit_admin_space_left_action: halt
    audit_disk_full_action: halt
    audit_disk_error_action: halt
    audit_buffer_size: 8192
    audit_flush: incremental_async
    audit_freq: 50

  tasks:
    - name: Deploy auditd.conf
      ansible.builtin.template:
        src: auditd.conf.j2
        dest: /etc/audit/auditd.conf
        owner: root
        group: root
        mode: '0640'
      notify: restart auditd

  handlers:
    - name: restart auditd
      ansible.builtin.command: service auditd restart
      changed_when: true
```

The auditd.conf template:

```ini
# templates/auditd.conf.j2 - Audit daemon configuration
# Managed by Ansible

log_file = {{ audit_log_file }}
log_format = {{ audit_log_format }}
log_group = root
priority_boost = 4
flush = {{ audit_flush }}
freq = {{ audit_freq }}
num_logs = {{ audit_num_logs }}
disp_qos = lossy
dispatcher = /sbin/audispd
name_format = hostname
max_log_file = {{ audit_max_log_file }}
max_log_file_action = {{ audit_max_log_file_action }}
space_left = {{ audit_space_left }}
space_left_action = {{ audit_space_left_action }}
action_mail_acct = {{ audit_action_mail_acct }}
admin_space_left = {{ audit_admin_space_left }}
admin_space_left_action = {{ audit_admin_space_left_action }}
disk_full_action = {{ audit_disk_full_action }}
disk_error_action = {{ audit_disk_error_action }}
tcp_listen_queue = 5
tcp_max_per_addr = 1
tcp_client_max_idle = 0
enable_krb5 = no
krb5_principal = auditd
```

## Deploying Audit Rules

Audit rules define what gets monitored. This is where you get the most value from auditd. Rules can watch files, monitor system calls, and track specific user actions.

This playbook deploys a comprehensive set of audit rules based on CIS benchmarks:

```yaml
# audit_rules.yml - Deploy audit rules
---
- name: Deploy audit rules
  hosts: all
  become: true

  tasks:
    - name: Deploy audit rules file
      ansible.builtin.copy:
        content: |
          # Audit rules - Managed by Ansible
          # Remove any existing rules
          -D

          # Set buffer size
          -b 8192

          # Failure mode: 1 = printk, 2 = panic
          -f 1

          # Monitor changes to user/group files
          -w /etc/passwd -p wa -k identity
          -w /etc/group -p wa -k identity
          -w /etc/shadow -p wa -k identity
          -w /etc/gshadow -p wa -k identity
          -w /etc/security/opasswd -p wa -k identity

          # Monitor changes to network configuration
          -w /etc/hosts -p wa -k network_config
          -w /etc/sysconfig/network -p wa -k network_config
          -w /etc/network/ -p wa -k network_config
          -a always,exit -F arch=b64 -S sethostname -S setdomainname -k network_config

          # Monitor changes to system configuration
          -w /etc/sysctl.conf -p wa -k sysctl
          -w /etc/sysctl.d/ -p wa -k sysctl

          # Monitor cron configuration
          -w /etc/crontab -p wa -k cron
          -w /etc/cron.d/ -p wa -k cron
          -w /etc/cron.daily/ -p wa -k cron
          -w /etc/cron.hourly/ -p wa -k cron
          -w /etc/cron.weekly/ -p wa -k cron
          -w /etc/cron.monthly/ -p wa -k cron

          # Monitor SSH configuration
          -w /etc/ssh/sshd_config -p wa -k sshd_config
          -w /etc/ssh/sshd_config.d/ -p wa -k sshd_config

          # Monitor sudo configuration
          -w /etc/sudoers -p wa -k sudoers
          -w /etc/sudoers.d/ -p wa -k sudoers

          # Monitor PAM configuration
          -w /etc/pam.d/ -p wa -k pam

          # Monitor login files
          -w /var/log/faillog -p wa -k logins
          -w /var/log/lastlog -p wa -k logins
          -w /var/log/tallylog -p wa -k logins

          # Monitor session initiation
          -w /var/run/utmp -p wa -k session
          -w /var/log/wtmp -p wa -k session
          -w /var/log/btmp -p wa -k session

          # Monitor privilege escalation
          -a always,exit -F arch=b64 -S execve -C uid!=euid -F euid=0 -k privilege_escalation
          -a always,exit -F arch=b32 -S execve -C uid!=euid -F euid=0 -k privilege_escalation

          # Monitor kernel module operations
          -w /sbin/insmod -p x -k kernel_modules
          -w /sbin/rmmod -p x -k kernel_modules
          -w /sbin/modprobe -p x -k kernel_modules
          -a always,exit -F arch=b64 -S init_module -S delete_module -k kernel_modules

          # Monitor file deletion by users
          -a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -F auid>=1000 -F auid!=4294967295 -k file_deletion

          # Monitor changes to audit configuration
          -w /etc/audit/ -p wa -k audit_config
          -w /etc/audisp/ -p wa -k audit_config

          # Make the audit configuration immutable (must be last rule)
          -e 2
        dest: /etc/audit/rules.d/99-ansible.rules
        owner: root
        group: root
        mode: '0640'
      notify: load audit rules

  handlers:
    - name: load audit rules
      ansible.builtin.command: augenrules --load
      changed_when: true
```

## Custom Rules for Specific Compliance Requirements

Different compliance frameworks have different requirements. Here is how to add rules for PCI DSS:

```yaml
# pci_audit_rules.yml - PCI DSS specific audit rules
---
- name: Deploy PCI DSS audit rules
  hosts: pci_servers
  become: true

  tasks:
    - name: Deploy PCI-specific rules
      ansible.builtin.copy:
        content: |
          # PCI DSS Audit Rules - Managed by Ansible

          # 10.2.1 - All individual user access to cardholder data
          -w /srv/cardholder_data/ -p rwxa -k pci_data_access

          # 10.2.2 - Actions taken by any individual with root/admin privileges
          -a always,exit -F arch=b64 -S execve -F euid=0 -F auid>=1000 -F auid!=4294967295 -k pci_root_actions

          # 10.2.3 - Access to all audit trails
          -w /var/log/audit/ -p wa -k pci_audit_access

          # 10.2.5 - Use of authentication mechanisms
          -w /var/log/auth.log -p wa -k pci_authentication
          -w /var/log/secure -p wa -k pci_authentication

          # 10.2.6 - Initialization of audit logs
          -w /var/log/audit/audit.log -p wa -k pci_audit_init

          # 10.2.7 - Creation and deletion of system-level objects
          -a always,exit -F arch=b64 -S mknod -k pci_system_objects
          -a always,exit -F arch=b64 -S mount -k pci_mounts
        dest: /etc/audit/rules.d/98-pci.rules
        owner: root
        group: root
        mode: '0640'
      notify: reload auditd rules

  handlers:
    - name: reload auditd rules
      ansible.builtin.command: augenrules --load
      changed_when: true
```

## Querying Audit Logs

Ansible can also help you query and report on audit data across your fleet:

```yaml
# query_audit.yml - Search audit logs across fleet
---
- name: Query audit logs
  hosts: all
  become: true

  vars:
    search_key: identity
    search_days: 7

  tasks:
    - name: Search for events by key
      ansible.builtin.command: >
        ausearch -k {{ search_key }}
        --start {{ '%Y-%m-%d' | strftime((ansible_date_time.epoch | int) - (search_days * 86400)) }}
        --format text
      register: audit_results
      changed_when: false
      failed_when: false

    - name: Generate audit summary report
      ansible.builtin.command: aureport --summary
      register: audit_summary
      changed_when: false

    - name: Show summary
      ansible.builtin.debug:
        msg: "{{ audit_summary.stdout_lines }}"
```

## Practical Advice

A few things I have learned from running auditd in production:

1. **Start with fewer rules and add more over time.** Too many rules at once can cause performance issues and generate overwhelming amounts of data.
2. **Watch the buffer size.** If you see `audit: backlog limit exceeded` in your logs, increase the buffer (`-b` parameter).
3. **Use the immutable flag carefully.** The `-e 2` rule makes audit rules unchangeable until reboot. This is great for security but means you need to reboot to change rules.
4. **Forward logs to a central location.** Local audit logs can be tampered with by an attacker who gains root access.
5. **Monitor disk usage.** Audit logs can fill a disk fast, especially with verbose rules.

Auditd with Ansible gives you consistent, auditable security monitoring across your entire infrastructure. Once you have the rules in place, you have a clear record of everything happening on your servers.
