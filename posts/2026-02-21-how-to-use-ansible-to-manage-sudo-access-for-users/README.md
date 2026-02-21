# How to Use Ansible to Manage Sudo Access for Users

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, Sudo, Linux Administration

Description: Learn how to manage sudo privileges across your infrastructure with Ansible, including sudoers files, group-based access, and command restrictions.

---

Managing sudo access across a fleet of servers is one of those tasks that gets complicated fast. You start with a couple of admin accounts, then a deployment user needs specific permissions, then the monitoring team needs to run a few commands as root. Before long, you have inconsistent sudo configurations scattered across your infrastructure. Ansible brings order to this chaos by letting you define sudo policies centrally and apply them everywhere.

## Understanding Sudo Configuration

Sudo is configured through `/etc/sudoers` and drop-in files in `/etc/sudoers.d/`. The golden rule: never edit `/etc/sudoers` directly. Always use drop-in files in `/etc/sudoers.d/`, which makes management cleaner and less risky.

Ansible's approach to sudo management involves:

- Adding users to the `sudo` or `wheel` group for full sudo access
- Creating drop-in files in `/etc/sudoers.d/` for granular permissions
- Using the `template` or `copy` module with `validate` to prevent syntax errors

## Adding Users to Sudo/Wheel Group

The simplest form of sudo access is adding a user to the appropriate group.

```yaml
# manage_sudo_group.yml - Add or remove users from sudo group
---
- name: Manage sudo group membership
  hosts: all
  become: yes

  vars:
    sudo_users:
      - alice
      - bob
      - charlie

  tasks:
    - name: Determine the sudo group name
      ansible.builtin.set_fact:
        sudo_group_name: "{{ 'wheel' if ansible_os_family == 'RedHat' else 'sudo' }}"

    - name: Add users to sudo group
      ansible.builtin.user:
        name: "{{ item }}"
        groups: "{{ sudo_group_name }}"
        append: yes
      loop: "{{ sudo_users }}"

    - name: Remove unauthorized users from sudo group
      ansible.builtin.command:
        cmd: "gpasswd -d {{ item }} {{ sudo_group_name }}"
      loop: "{{ removed_sudo_users | default([]) }}"
      failed_when: false
      changed_when: true
```

The `append: yes` parameter is critical. Without it, the user module would replace all group memberships, potentially breaking things.

## Creating Sudoers Drop-in Files

For fine-grained control, create files in `/etc/sudoers.d/`. Always use the `validate` parameter to prevent deploying broken sudoers syntax.

```yaml
# manage_sudoers_dropin.yml - Create sudoers drop-in files with validation
---
- name: Manage sudoers drop-in files
  hosts: all
  become: yes

  tasks:
    - name: Ensure sudoers.d directory exists and is included
      ansible.builtin.lineinfile:
        path: /etc/sudoers
        line: "#includedir /etc/sudoers.d"
        state: present
        validate: /usr/sbin/visudo -cf %s

    - name: Deploy sudoers file for deploy user
      ansible.builtin.copy:
        content: |
          # Managed by Ansible - deploy user sudo permissions
          deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart myapp
          deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl status myapp
          deploy ALL=(ALL) NOPASSWD: /usr/bin/journalctl -u myapp*
        dest: /etc/sudoers.d/deploy
        owner: root
        group: root
        mode: '0440'
        validate: /usr/sbin/visudo -cf %s

    - name: Deploy sudoers file for monitoring user
      ansible.builtin.copy:
        content: |
          # Managed by Ansible - monitoring user sudo permissions
          monitoring ALL=(ALL) NOPASSWD: /usr/bin/ss -tlnp
          monitoring ALL=(ALL) NOPASSWD: /usr/bin/netstat -tlnp
          monitoring ALL=(ALL) NOPASSWD: /usr/sbin/iptables -L -n
          monitoring ALL=(ALL) NOPASSWD: /usr/bin/docker ps
        dest: /etc/sudoers.d/monitoring
        owner: root
        group: root
        mode: '0440'
        validate: /usr/sbin/visudo -cf %s
```

The `validate: /usr/sbin/visudo -cf %s` parameter is the safety net. If the content has a syntax error, Ansible will refuse to write the file, saving you from locking yourself out.

## Using Templates for Complex Sudo Rules

When sudo rules vary by environment or role, templates give you flexibility.

```yaml
# manage_sudoers_template.yml - Deploy templated sudoers configuration
---
- name: Deploy sudoers from templates
  hosts: all
  become: yes

  vars:
    sudo_rules:
      - user: deploy
        commands:
          - /usr/bin/systemctl restart *
          - /usr/bin/systemctl stop *
          - /usr/bin/systemctl start *
          - /usr/bin/journalctl *
        nopasswd: true
      - user: dbadmin
        commands:
          - /usr/bin/pg_dump *
          - /usr/bin/pg_restore *
          - /usr/bin/systemctl restart postgresql
        nopasswd: true
      - user: securityteam
        commands:
          - /usr/bin/aureport *
          - /usr/sbin/auditctl -l
          - /usr/bin/fail2ban-client status *
        nopasswd: false

  tasks:
    - name: Deploy custom sudoers rules
      ansible.builtin.template:
        src: sudoers_custom.j2
        dest: /etc/sudoers.d/custom_rules
        owner: root
        group: root
        mode: '0440'
        validate: /usr/sbin/visudo -cf %s
```

The template:

```
# templates/sudoers_custom.j2 - Custom sudo rules managed by Ansible
# Do not edit manually

{% for rule in sudo_rules %}
# Rules for {{ rule.user }}
{% for cmd in rule.commands %}
{{ rule.user }} ALL=(ALL) {{ 'NOPASSWD: ' if rule.nopasswd }}{{ cmd }}
{% endfor %}

{% endfor %}
```

## Managing Sudo Defaults

Sudo defaults control behavior like password timeouts, logging, and environment variables.

```yaml
# manage_sudo_defaults.yml - Configure sudo default settings
---
- name: Configure sudo defaults
  hosts: all
  become: yes

  tasks:
    - name: Set sudo defaults
      ansible.builtin.copy:
        content: |
          # Managed by Ansible - sudo default overrides

          # Require password re-entry after 5 minutes
          Defaults timestamp_timeout=5

          # Log all sudo commands to a dedicated file
          Defaults logfile=/var/log/sudo.log

          # Show custom message when wrong password entered
          Defaults badpass_message="Wrong password. This attempt has been logged."

          # Require tty for sudo (prevents some automated exploits)
          Defaults requiretty

          # Exempt specific users from requiretty
          Defaults:deploy !requiretty
          Defaults:ansible !requiretty

          # Preserve specific environment variables
          Defaults env_keep += "HTTP_PROXY HTTPS_PROXY NO_PROXY"
        dest: /etc/sudoers.d/00-defaults
        owner: root
        group: root
        mode: '0440'
        validate: /usr/sbin/visudo -cf %s
```

The filename `00-defaults` ensures it loads before other drop-in files since files are processed in lexicographic order.

## Removing Stale Sudo Access

Part of managing sudo is cleaning up access that should no longer exist.

```yaml
# cleanup_sudo.yml - Remove unauthorized sudoers files
---
- name: Clean up unauthorized sudo configurations
  hosts: all
  become: yes

  vars:
    allowed_sudoers_files:
      - "00-defaults"
      - "custom_rules"
      - "deploy"
      - "monitoring"

  tasks:
    - name: Find all files in sudoers.d
      ansible.builtin.find:
        paths: /etc/sudoers.d
        patterns: "*"
        file_type: file
      register: existing_sudoers

    - name: Remove unauthorized sudoers files
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: absent
      loop: "{{ existing_sudoers.files }}"
      loop_control:
        label: "{{ item.path }}"
      when: item.path | basename not in allowed_sudoers_files

    - name: Report removed files
      ansible.builtin.debug:
        msg: "Removed unauthorized sudoers file: {{ item.path }}"
      loop: "{{ existing_sudoers.files }}"
      loop_control:
        label: "{{ item.path }}"
      when: item.path | basename not in allowed_sudoers_files
```

## Building a Complete Sudo Management Role

Here is how to structure this as a reusable role.

```yaml
# roles/sudo_management/defaults/main.yml
---
sudo_full_access_users: []
sudo_custom_rules: []
sudo_allowed_files:
  - "00-defaults"
  - "custom_rules"
sudo_cleanup_enabled: true
sudo_log_enabled: true
sudo_timestamp_timeout: 5
```

```yaml
# roles/sudo_management/tasks/main.yml
---
- name: Add users to sudo group
  ansible.builtin.user:
    name: "{{ item }}"
    groups: "{{ 'wheel' if ansible_os_family == 'RedHat' else 'sudo' }}"
    append: yes
  loop: "{{ sudo_full_access_users }}"

- name: Deploy sudo defaults
  ansible.builtin.template:
    src: defaults.j2
    dest: /etc/sudoers.d/00-defaults
    owner: root
    group: root
    mode: '0440'
    validate: /usr/sbin/visudo -cf %s

- name: Deploy custom sudo rules
  ansible.builtin.template:
    src: custom_rules.j2
    dest: /etc/sudoers.d/custom_rules
    owner: root
    group: root
    mode: '0440'
    validate: /usr/sbin/visudo -cf %s
  when: sudo_custom_rules | length > 0

- name: Clean up unauthorized sudoers files
  ansible.builtin.include_tasks: cleanup.yml
  when: sudo_cleanup_enabled
```

## Verifying Sudo Configuration

After deploying, verify that sudo works as expected.

```yaml
# verify_sudo.yml - Test sudo configuration
---
- name: Verify sudo configuration
  hosts: all
  become: yes

  tasks:
    - name: Validate complete sudoers configuration
      ansible.builtin.command:
        cmd: visudo -c
      register: visudo_check
      changed_when: false

    - name: Report validation result
      ansible.builtin.debug:
        msg: "Sudoers validation: {{ visudo_check.stdout }}"

    - name: Check what deploy user can run with sudo
      ansible.builtin.command:
        cmd: "sudo -l -U deploy"
      register: deploy_sudo
      changed_when: false

    - name: Report deploy user sudo permissions
      ansible.builtin.debug:
        msg: "{{ deploy_sudo.stdout_lines }}"
```

## Summary

Managing sudo access with Ansible comes down to three practices: use drop-in files in `/etc/sudoers.d/` instead of editing the main sudoers file, always use the `validate` parameter to catch syntax errors before deployment, and clean up stale permissions as part of your regular runs. Wrapping this in a role with sensible defaults gives you a repeatable, auditable process for privilege management across your entire fleet.
