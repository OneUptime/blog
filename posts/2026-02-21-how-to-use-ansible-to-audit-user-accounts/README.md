# How to Use Ansible to Audit User Accounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, User Audit, Compliance

Description: Automate user account auditing across your infrastructure with Ansible to detect stale accounts, privilege issues, and compliance violations.

---

Auditing user accounts is a critical part of maintaining a secure infrastructure. Compliance frameworks like SOC 2 and PCI-DSS require periodic access reviews, and doing them manually across dozens or hundreds of servers is painful. Ansible lets you pull together a complete picture of user accounts, permissions, and activity across your entire fleet in minutes.

## What to Audit

A thorough user account audit should cover:

- Which user accounts exist on each system
- Which accounts have elevated privileges (sudo, wheel group membership)
- Which accounts have not logged in recently (stale accounts)
- Which accounts have password issues (expired, never set, too old)
- Which accounts have SSH keys configured
- Which accounts have shells that allow login vs. nologin accounts

## Gathering Basic User Information

Start by collecting the user database from each host.

```yaml
# audit_users_basic.yml - Collect basic user account information
---
- name: Audit user accounts across all hosts
  hosts: all
  become: yes

  tasks:
    - name: Get all user accounts from passwd database
      ansible.builtin.getent:
        database: passwd

    - name: Build list of human user accounts (UID >= 1000)
      ansible.builtin.set_fact:
        human_users: >-
          {{ getent_passwd | dict2items
             | selectattr('value.1', 'ge', '1000')
             | rejectattr('value.1', 'eq', '65534')
             | map(attribute='key')
             | list }}

    - name: Display human users on this host
      ansible.builtin.debug:
        msg: "Human users on {{ inventory_hostname }}: {{ human_users }}"

    - name: Get system accounts with login shells
      ansible.builtin.set_fact:
        system_login_accounts: >-
          {{ getent_passwd | dict2items
             | selectattr('value.1', 'lt', '1000')
             | rejectattr('value.5', 'search', 'nologin')
             | rejectattr('value.5', 'search', '/bin/false')
             | map(attribute='key')
             | list }}

    - name: Flag system accounts with login shells
      ansible.builtin.debug:
        msg: "WARNING - System accounts with login shells on {{ inventory_hostname }}: {{ system_login_accounts }}"
      when: system_login_accounts | length > 0
```

## Auditing Sudo and Privilege Access

Knowing which users have sudo access is essential for compliance.

```yaml
# audit_sudo.yml - Check sudo access for all users
---
- name: Audit sudo access
  hosts: all
  become: yes

  tasks:
    - name: Get members of sudo group (Debian/Ubuntu)
      ansible.builtin.command:
        cmd: getent group sudo
      register: sudo_group
      changed_when: false
      failed_when: false

    - name: Get members of wheel group (RHEL/CentOS)
      ansible.builtin.command:
        cmd: getent group wheel
      register: wheel_group
      changed_when: false
      failed_when: false

    - name: Parse sudo group members
      ansible.builtin.set_fact:
        sudo_users: "{{ (sudo_group.stdout | default('')).split(':')[-1].split(',') | select() | list }}"
      when: sudo_group.rc == 0

    - name: Parse wheel group members
      ansible.builtin.set_fact:
        wheel_users: "{{ (wheel_group.stdout | default('')).split(':')[-1].split(',') | select() | list }}"
      when: wheel_group.rc == 0

    - name: Report privileged users
      ansible.builtin.debug:
        msg: |
          Privileged users on {{ inventory_hostname }}:
            sudo group: {{ sudo_users | default([]) }}
            wheel group: {{ wheel_users | default([]) }}

    - name: Check for custom sudoers files
      ansible.builtin.find:
        paths: /etc/sudoers.d/
        patterns: "*"
      register: custom_sudoers

    - name: Report custom sudoers files
      ansible.builtin.debug:
        msg: "Custom sudoers files on {{ inventory_hostname }}: {{ custom_sudoers.files | map(attribute='path') | list }}"

    - name: Read content of each custom sudoers file
      ansible.builtin.command:
        cmd: "cat {{ item.path }}"
      register: sudoers_contents
      loop: "{{ custom_sudoers.files }}"
      loop_control:
        label: "{{ item.path }}"
      changed_when: false
```

## Detecting Stale Accounts

Accounts that have not been used in a long time should be reviewed for deactivation.

```yaml
# audit_stale.yml - Find accounts that haven't logged in recently
---
- name: Audit stale user accounts
  hosts: all
  become: yes

  vars:
    stale_threshold_days: 90

  tasks:
    - name: Get last login information for all users
      ansible.builtin.command:
        cmd: lastlog
      register: lastlog_output
      changed_when: false

    - name: Get current timestamp
      ansible.builtin.command:
        cmd: date +%s
      register: current_time
      changed_when: false

    - name: Check each human user's last login via lastlog
      ansible.builtin.shell:
        cmd: |
          lastlog -u {{ item }} | tail -1 | awk '{print $4, $5, $6, $9}'
      register: user_lastlogin
      loop: "{{ human_users | default([]) }}"
      changed_when: false
      failed_when: false

    - name: Report stale accounts
      ansible.builtin.debug:
        msg: "{{ item.item }} last login: {{ item.stdout | default('Never') }}"
      loop: "{{ user_lastlogin.results }}"
      loop_control:
        label: "{{ item.item }}"
      when: "'Never' in item.stdout or item.stdout == ''"

    - name: Check for accounts with no password set
      ansible.builtin.command:
        cmd: "awk -F: '($2 == \"\" || $2 == \"!\") {print $1}' /etc/shadow"
      register: no_password_accounts
      changed_when: false

    - name: Report accounts without passwords
      ansible.builtin.debug:
        msg: "Accounts with no password on {{ inventory_hostname }}: {{ no_password_accounts.stdout_lines }}"
      when: no_password_accounts.stdout_lines | length > 0
```

## Auditing Password Age and Expiry

Check how old passwords are and which ones are past their expiry.

```yaml
# audit_password_age.yml - Check password age for compliance
---
- name: Audit password ages
  hosts: all
  become: yes

  vars:
    max_password_age_days: 90

  tasks:
    - name: Get password aging info for each user
      ansible.builtin.command:
        cmd: "chage -l {{ item }}"
      register: chage_results
      loop: "{{ human_users | default([]) }}"
      changed_when: false
      failed_when: false

    - name: Parse and report password status
      ansible.builtin.debug:
        msg: |
          User: {{ item.item }}
          {{ item.stdout }}
      loop: "{{ chage_results.results }}"
      loop_control:
        label: "{{ item.item }}"

    - name: Check for passwords that have never been changed
      ansible.builtin.shell:
        cmd: |
          awk -F: '{if ($3 == 0 || $3 == "") print $1}' /etc/shadow
      register: never_changed
      changed_when: false

    - name: Report users who never changed password
      ansible.builtin.debug:
        msg: "Users who never changed password on {{ inventory_hostname }}: {{ never_changed.stdout_lines }}"
      when: never_changed.stdout_lines | length > 0
```

## Auditing SSH Keys

SSH key auditing tells you which users can authenticate via key-based login.

```yaml
# audit_ssh_keys.yml - Check authorized SSH keys for all users
---
- name: Audit SSH authorized keys
  hosts: all
  become: yes

  tasks:
    - name: Find all authorized_keys files
      ansible.builtin.find:
        paths: /home
        patterns: "authorized_keys"
        recurse: yes
        hidden: yes
      register: auth_keys_files

    - name: Read authorized keys for each user
      ansible.builtin.command:
        cmd: "cat {{ item.path }}"
      register: auth_keys_content
      loop: "{{ auth_keys_files.files }}"
      loop_control:
        label: "{{ item.path }}"
      changed_when: false

    - name: Report SSH key count per user
      ansible.builtin.debug:
        msg: "{{ item.item.path }}: {{ item.stdout_lines | length }} keys"
      loop: "{{ auth_keys_content.results }}"
      loop_control:
        label: "{{ item.item.path }}"

    - name: Check root authorized_keys
      ansible.builtin.stat:
        path: /root/.ssh/authorized_keys
      register: root_keys

    - name: Warn if root has authorized keys
      ansible.builtin.debug:
        msg: "WARNING: root has authorized_keys on {{ inventory_hostname }}"
      when: root_keys.stat.exists
```

## Generating a Consolidated Audit Report

Pull everything together into a single report saved as a file.

```yaml
# audit_report.yml - Generate consolidated user audit report
---
- name: Generate user account audit report
  hosts: all
  become: yes

  tasks:
    - name: Gather all audit data
      ansible.builtin.shell:
        cmd: |
          echo "=== User Audit Report for $(hostname) ==="
          echo "Date: $(date)"
          echo ""
          echo "--- Human Users ---"
          awk -F: '$3 >= 1000 && $3 < 65534 {print $1, "UID="$3, "Shell="$7}' /etc/passwd
          echo ""
          echo "--- Privileged Users ---"
          getent group sudo 2>/dev/null || getent group wheel 2>/dev/null
          echo ""
          echo "--- Last Login ---"
          lastlog | grep -v "Never"
          echo ""
          echo "--- Password Status ---"
          for user in $(awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd); do
            echo "User: $user"
            chage -l "$user" 2>/dev/null | head -3
          done
      register: audit_report
      changed_when: false

    - name: Save audit report locally
      ansible.builtin.copy:
        content: "{{ audit_report.stdout }}"
        dest: "/tmp/user_audit_{{ inventory_hostname }}_{{ ansible_date_time.date }}.txt"
      delegate_to: localhost

    - name: Display report summary
      ansible.builtin.debug:
        msg: "{{ audit_report.stdout_lines[:20] }}"
```

## Automating Regular Audits

Schedule the audit to run weekly or monthly from your CI/CD pipeline or a cron job.

```bash
# Run audit weekly and email the results
0 9 * * 1 cd /opt/ansible && ansible-playbook audit_report.yml -o > /tmp/weekly_audit.txt 2>&1 && mail -s "Weekly User Audit" security@company.com < /tmp/weekly_audit.txt
```

## Summary

User account auditing with Ansible covers everything from basic account enumeration to password age compliance, privilege detection, SSH key inventory, and stale account identification. By running these playbooks regularly, you maintain a clear picture of who has access to what across your infrastructure. The key is combining the `getent` module for structured data, `command`/`shell` for parsing system files, and `debug` or local file writes for reporting. Build these into a role, schedule them, and you have continuous compliance monitoring without any manual effort.
