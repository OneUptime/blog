# How to Use Ansible to Enforce Password Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, Password Policy, Linux Administration

Description: Automate and enforce consistent password policies across your Linux infrastructure using Ansible with PAM, pwquality, and login.defs configuration.

---

Consistent password policies are a cornerstone of any security strategy. When you have dozens or hundreds of servers, manually configuring password requirements on each one is not practical. Ansible lets you define your password policy once and enforce it everywhere, every time.

This guide covers configuring password complexity, aging, history, and lockout policies using Ansible across your Linux fleet.

## Understanding Linux Password Policy Components

Linux password policies are spread across several configuration files and subsystems:

- `/etc/security/pwquality.conf` controls password complexity (length, character classes)
- `/etc/login.defs` controls password aging defaults for new accounts
- PAM (Pluggable Authentication Modules) ties everything together
- `/etc/pam.d/` contains PAM configuration files

## Installing Required Packages

Before configuring policies, make sure the necessary packages are present.

```yaml
# install_pwquality.yml - Ensure password quality packages are installed
---
- name: Install password policy packages
  hosts: all
  become: yes

  tasks:
    - name: Install libpwquality on Debian/Ubuntu
      ansible.builtin.apt:
        name:
          - libpam-pwquality
          - libpwquality-tools
        state: present
      when: ansible_os_family == "Debian"

    - name: Install libpwquality on RHEL/CentOS
      ansible.builtin.yum:
        name:
          - pam_pwquality
          - libpwquality
        state: present
      when: ansible_os_family == "RedHat"
```

## Enforcing Password Complexity with pwquality

The `pwquality.conf` file is where you define what constitutes a "strong enough" password.

```yaml
# enforce_complexity.yml - Configure password complexity requirements
---
- name: Enforce password complexity
  hosts: all
  become: yes

  vars:
    # Minimum password length
    pw_min_length: 14
    # Minimum number of character classes (uppercase, lowercase, digit, special)
    pw_min_class: 3
    # Maximum consecutive identical characters
    pw_max_repeat: 3
    # Minimum number of digits
    pw_min_digits: 1
    # Minimum number of uppercase letters
    pw_min_uppercase: 1
    # Minimum number of lowercase letters
    pw_min_lowercase: 1
    # Minimum number of special characters
    pw_min_special: 1
    # Number of characters that must differ from old password
    pw_difok: 5

  tasks:
    - name: Configure pwquality.conf
      ansible.builtin.template:
        src: pwquality.conf.j2
        dest: /etc/security/pwquality.conf
        owner: root
        group: root
        mode: '0644'
```

Create the template file:

```ini
# templates/pwquality.conf.j2 - Password quality configuration
# Managed by Ansible - do not edit manually

# Minimum password length
minlen = {{ pw_min_length }}

# Minimum number of required character classes
minclass = {{ pw_min_class }}

# Maximum number of consecutive identical characters
maxrepeat = {{ pw_max_repeat }}

# Require at least N digits
dcredit = -{{ pw_min_digits }}

# Require at least N uppercase characters
ucredit = -{{ pw_min_uppercase }}

# Require at least N lowercase characters
lcredit = -{{ pw_min_lowercase }}

# Require at least N special characters
ocredit = -{{ pw_min_special }}

# Number of characters in the new password that must not be in the old password
difok = {{ pw_difok }}

# Reject passwords containing the username
usercheck = 1

# Enforce for root user as well
enforce_for_root
```

Note the negative values for `dcredit`, `ucredit`, `lcredit`, and `ocredit`. When negative, these represent the minimum number of characters required from each class. Positive values would represent credit toward the minimum length.

## Configuring Password Aging Policies

Password aging determines how long a password can be used before it must be changed.

```yaml
# enforce_aging.yml - Configure password aging in login.defs
---
- name: Enforce password aging policies
  hosts: all
  become: yes

  vars:
    pass_max_days: 90
    pass_min_days: 7
    pass_warn_age: 14
    pass_min_len: 14

  tasks:
    - name: Set maximum password age
      ansible.builtin.lineinfile:
        path: /etc/login.defs
        regexp: '^PASS_MAX_DAYS'
        line: "PASS_MAX_DAYS\t{{ pass_max_days }}"
        state: present

    - name: Set minimum password age
      ansible.builtin.lineinfile:
        path: /etc/login.defs
        regexp: '^PASS_MIN_DAYS'
        line: "PASS_MIN_DAYS\t{{ pass_min_days }}"
        state: present

    - name: Set password warning period
      ansible.builtin.lineinfile:
        path: /etc/login.defs
        regexp: '^PASS_WARN_AGE'
        line: "PASS_WARN_AGE\t{{ pass_warn_age }}"
        state: present

    - name: Set minimum password length in login.defs
      ansible.builtin.lineinfile:
        path: /etc/login.defs
        regexp: '^PASS_MIN_LEN'
        line: "PASS_MIN_LEN\t{{ pass_min_len }}"
        state: present
```

These settings only apply to newly created accounts. For existing users, you need to use `chage`:

```yaml
    - name: Apply aging policy to existing users
      ansible.builtin.command:
        cmd: "chage --maxdays {{ pass_max_days }} --mindays {{ pass_min_days }} --warndays {{ pass_warn_age }} {{ item }}"
      loop:
        - deploy
        - admin
        - appuser
      changed_when: true
```

## Enforcing Password History

Password history prevents users from reusing recent passwords. This is configured through PAM.

```yaml
# enforce_history.yml - Prevent password reuse with PAM
---
- name: Enforce password history
  hosts: all
  become: yes

  vars:
    password_remember: 12

  tasks:
    - name: Configure PAM password history on Debian/Ubuntu
      ansible.builtin.lineinfile:
        path: /etc/pam.d/common-password
        regexp: '^password.*pam_unix.so'
        line: "password\t[success=1 default=ignore]\tpam_unix.so obscure use_authtok try_first_pass yescrypt remember={{ password_remember }}"
        backrefs: yes
      when: ansible_os_family == "Debian"

    - name: Configure PAM password history on RHEL/CentOS
      ansible.builtin.lineinfile:
        path: /etc/pam.d/system-auth
        regexp: '^password.*sufficient.*pam_unix.so'
        line: "password    sufficient    pam_unix.so sha512 shadow try_first_pass use_authtok remember={{ password_remember }}"
        backrefs: yes
      when: ansible_os_family == "RedHat"

    - name: Ensure opasswd file exists for password history storage
      ansible.builtin.file:
        path: /etc/security/opasswd
        state: touch
        owner: root
        group: root
        mode: '0600'
      changed_when: false
```

## Configuring Account Lockout

Lock accounts after too many failed login attempts to prevent brute force attacks.

```yaml
# enforce_lockout.yml - Configure account lockout after failed attempts
---
- name: Enforce account lockout policy
  hosts: all
  become: yes

  vars:
    lockout_attempts: 5
    lockout_time: 900
    unlock_time: 900

  tasks:
    - name: Configure faillock for account lockout on RHEL 8+
      ansible.builtin.template:
        src: faillock.conf.j2
        dest: /etc/security/faillock.conf
        owner: root
        group: root
        mode: '0644'
      when:
        - ansible_os_family == "RedHat"
        - ansible_distribution_major_version | int >= 8
```

The faillock template:

```ini
# templates/faillock.conf.j2 - Account lockout configuration
# Managed by Ansible

# Number of failed attempts before lockout
deny = {{ lockout_attempts }}

# Time in seconds before the counter resets
fail_interval = {{ lockout_time }}

# Time in seconds the account stays locked (0 = manual unlock required)
unlock_time = {{ unlock_time }}

# Log failed attempts to syslog
audit

# Also apply to root (comment out to exempt root)
# even_deny_root
```

## Building a Complete Policy Role

For real-world use, package all of this into an Ansible role.

```yaml
# roles/password_policy/defaults/main.yml - Sensible defaults
---
password_policy_min_length: 14
password_policy_min_class: 3
password_policy_max_repeat: 3
password_policy_max_days: 90
password_policy_min_days: 7
password_policy_warn_days: 14
password_policy_remember: 12
password_policy_lockout_attempts: 5
password_policy_lockout_time: 900
password_policy_existing_users: []
```

```yaml
# roles/password_policy/tasks/main.yml - Main task file
---
- name: Include package installation tasks
  ansible.builtin.include_tasks: packages.yml

- name: Include complexity configuration
  ansible.builtin.include_tasks: complexity.yml

- name: Include aging configuration
  ansible.builtin.include_tasks: aging.yml

- name: Include history configuration
  ansible.builtin.include_tasks: history.yml

- name: Include lockout configuration
  ansible.builtin.include_tasks: lockout.yml
```

## Auditing Policy Compliance

After applying your policies, verify compliance across the fleet.

```yaml
# audit_policy.yml - Check password policy compliance
---
- name: Audit password policy compliance
  hosts: all
  become: yes

  tasks:
    - name: Check pwquality configuration
      ansible.builtin.command:
        cmd: "grep -E '^minlen' /etc/security/pwquality.conf"
      register: pwquality_check
      changed_when: false
      failed_when: false

    - name: Report pwquality status
      ansible.builtin.debug:
        msg: "pwquality minlen setting: {{ pwquality_check.stdout | default('NOT CONFIGURED') }}"

    - name: Check password max age for specific users
      ansible.builtin.command:
        cmd: "chage -l {{ item }}"
      register: chage_results
      loop:
        - deploy
        - admin
      changed_when: false
      failed_when: false

    - name: Report aging policy status
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ item.stdout_lines[0] | default('User not found') }}"
      loop: "{{ chage_results.results }}"
      loop_control:
        label: "{{ item.item }}"
```

## Summary

Enforcing password policies with Ansible boils down to managing a handful of configuration files consistently. The key files are `pwquality.conf` for complexity, `login.defs` for aging defaults, and PAM configuration for history and lockout rules. By wrapping these into a role with sensible defaults, you get a policy that deploys in seconds and stays consistent across your entire infrastructure. Run the audit playbook periodically to catch any drift.
