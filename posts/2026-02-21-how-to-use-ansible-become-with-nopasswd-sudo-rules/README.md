# How to Use Ansible become with NOPASSWD sudo Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, sudo, NOPASSWD, Security, Linux

Description: Configure NOPASSWD sudo rules for Ansible become with proper security boundaries and command restrictions

---

NOPASSWD sudo rules let Ansible run tasks without prompting for a password. This is the standard configuration for automated Ansible workflows, and nearly every production Ansible setup uses it. But there is a big difference between a wide-open NOPASSWD rule that grants unrestricted root access and a properly scoped rule that limits what the Ansible user can do.

This guide covers how to write NOPASSWD sudo rules that balance automation needs with security.

## The Basic NOPASSWD Rule

The simplest NOPASSWD sudoers entry looks like this:

```
# /etc/sudoers.d/ansible
# Allow the deploy user to run any command as any user without a password
deploy ALL=(ALL) NOPASSWD: ALL
```

Breaking down the syntax:

```
deploy       ALL       =       (ALL)       NOPASSWD:       ALL
  |           |                  |             |             |
  user    hosts where      target users   no password    commands
          rule applies     to become      required       allowed
```

This grants the deploy user full root access without a password. It works, but it is the least restrictive option.

## Writing Restrictive NOPASSWD Rules

For better security, limit which commands the Ansible user can run without a password.

```
# /etc/sudoers.d/ansible-restricted
# Package management
deploy ALL=(root) NOPASSWD: /usr/bin/apt-get update, /usr/bin/apt-get install *, /usr/bin/apt-get remove *
deploy ALL=(root) NOPASSWD: /usr/bin/dpkg -i *

# Service management
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl start *, /usr/bin/systemctl stop *, /usr/bin/systemctl restart *, /usr/bin/systemctl reload *, /usr/bin/systemctl enable *, /usr/bin/systemctl disable *
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl daemon-reload

# File operations
deploy ALL=(root) NOPASSWD: /usr/bin/cp, /usr/bin/mv, /usr/bin/mkdir, /usr/bin/rm
deploy ALL=(root) NOPASSWD: /usr/bin/chmod, /usr/bin/chown, /usr/bin/chgrp

# Non-root user switching
deploy ALL=(postgres) NOPASSWD: ALL
deploy ALL=(www-data) NOPASSWD: ALL
deploy ALL=(appuser) NOPASSWD: ALL
```

## Using Ansible to Deploy NOPASSWD Rules

Rather than manually editing sudoers on every host, use Ansible to deploy the rules.

```yaml
# playbooks/configure-sudoers.yml
# Deploy NOPASSWD sudo rules for the Ansible user
---
- name: Configure sudo for Ansible
  hosts: all
  become: true

  vars:
    ansible_service_user: deploy
    nopasswd_commands:
      - /usr/bin/apt-get
      - /usr/bin/apt
      - /usr/bin/dpkg
      - /usr/bin/systemctl
      - /usr/bin/cp
      - /usr/bin/mv
      - /usr/bin/mkdir
      - /usr/bin/rm
      - /usr/bin/chmod
      - /usr/bin/chown
      - /usr/bin/tee
      - /usr/sbin/service
    nopasswd_users:
      - root
      - postgres
      - www-data

  tasks:
    - name: Deploy sudoers configuration
      ansible.builtin.template:
        src: templates/ansible-sudoers.j2
        dest: /etc/sudoers.d/ansible
        mode: '0440'
        owner: root
        group: root
        validate: "visudo -cf %s"

    - name: Ensure requiretty is disabled for Ansible user
      ansible.builtin.lineinfile:
        path: /etc/sudoers.d/ansible
        line: "Defaults:{{ ansible_service_user }} !requiretty"
        validate: "visudo -cf %s"
```

The template:

```jinja2
# templates/ansible-sudoers.j2
# Sudoers configuration for Ansible automation
# Managed by Ansible - do not edit manually

# Disable requiretty for the Ansible user
Defaults:{{ ansible_service_user }} !requiretty

# Allow specific commands without password
{% for cmd in nopasswd_commands %}
{{ ansible_service_user }} ALL=(root) NOPASSWD: {{ cmd }} *
{% endfor %}

# Allow becoming specific non-root users
{% for user in nopasswd_users %}
{{ ansible_service_user }} ALL=({{ user }}) NOPASSWD: ALL
{% endfor %}
```

## Understanding Ansible's sudo Command

To write effective NOPASSWD rules, you need to understand how Ansible actually calls sudo. With verbose output, you can see the exact command:

```bash
# See the actual sudo command Ansible generates
ansible web1 -m command -a "whoami" --become -vvvv 2>&1 | grep "sudo"
```

Ansible typically executes something like:

```bash
sudo -H -S -n -u root /bin/bash -c '/usr/bin/python3 /tmp/.ansible/tmp/AnsiballZ_command.py'
```

This means Ansible actually runs Python scripts through `/bin/bash -c`. If you want to restrict by command path, you need to understand that the direct commands your playbook tasks reference are not what sudo sees. Sudo sees `/bin/bash` or `/bin/sh`.

This is why restrictive command-based NOPASSWD rules can be tricky with Ansible. In practice, you have two realistic options:

1. Grant unrestricted NOPASSWD access (the common approach)
2. Restrict by target user rather than by command

## Restricting by Target User

A practical middle ground is to limit which users the Ansible account can become, rather than which commands it can run.

```
# /etc/sudoers.d/ansible
# Allow deploy to become root and specific service accounts only
deploy ALL=(root) NOPASSWD: ALL
deploy ALL=(postgres) NOPASSWD: ALL
deploy ALL=(www-data) NOPASSWD: ALL

# Prevent deploy from becoming other users
# (sudo denies by default, so omitting other users is sufficient)
```

This way, even if the deploy account is compromised, it cannot become arbitrary users.

## Environment-Specific NOPASSWD Rules

Different environments might warrant different levels of access.

```yaml
# group_vars/production/sudo.yml
sudo_nopasswd_rule: "deploy ALL=(root,postgres,www-data) NOPASSWD: ALL"
sudo_extra_restrictions: true

# group_vars/development/sudo.yml
sudo_nopasswd_rule: "deploy ALL=(ALL) NOPASSWD: ALL"
sudo_extra_restrictions: false
```

```yaml
# playbooks/configure-sudo.yml
# Deploy environment-appropriate sudo rules
---
- name: Configure environment-specific sudo
  hosts: all
  become: true

  tasks:
    - name: Deploy sudo rule
      ansible.builtin.copy:
        content: |
          # Ansible automation sudo rules
          Defaults:deploy !requiretty
          {{ sudo_nopasswd_rule }}
        dest: /etc/sudoers.d/ansible
        mode: '0440'
        validate: "visudo -cf %s"

    - name: Enable sudo logging in production
      ansible.builtin.copy:
        content: |
          Defaults log_output
          Defaults!/usr/bin/sudoreplay !log_output
          Defaults logfile=/var/log/sudo.log
        dest: /etc/sudoers.d/logging
        mode: '0440'
        validate: "visudo -cf %s"
      when: sudo_extra_restrictions | bool
```

## Testing NOPASSWD Rules

After deploying NOPASSWD rules, verify they work correctly.

```yaml
# playbooks/test-nopasswd.yml
# Verify NOPASSWD sudo rules are working
---
- name: Test NOPASSWD sudo
  hosts: all
  gather_facts: false

  tasks:
    - name: Test sudo to root (should work without password)
      ansible.builtin.command: whoami
      become: true
      become_user: root
      register: root_test
      ignore_errors: true

    - name: Test sudo to postgres (should work without password)
      ansible.builtin.command: whoami
      become: true
      become_user: postgres
      register: pg_test
      ignore_errors: true

    - name: Test that sudo -n works (non-interactive)
      ansible.builtin.command: sudo -n -u root whoami
      register: noninteractive_test
      ignore_errors: true

    - name: Display results
      ansible.builtin.debug:
        msg: |
          Root become: {{ root_test.stdout | default('FAILED') }}
          Postgres become: {{ pg_test.stdout | default('FAILED') }}
          Non-interactive: {{ noninteractive_test.stdout | default('FAILED') }}

    - name: Fail if any test failed
      ansible.builtin.assert:
        that:
          - root_test is not failed
          - pg_test is not failed
          - noninteractive_test is not failed
        fail_msg: "NOPASSWD sudo is not configured correctly"
        success_msg: "All NOPASSWD sudo tests passed"
```

## ansible.cfg for NOPASSWD Environments

When all your hosts have NOPASSWD configured, your ansible.cfg can be optimized.

```ini
# ansible.cfg - optimized for NOPASSWD sudo
[defaults]
remote_user = deploy
host_key_checking = true
forks = 20

[privilege_escalation]
become = false
become_method = sudo
become_user = root
become_ask_pass = false

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = true
```

The `pipelining = true` setting is safe with NOPASSWD because pipelining conflicts arise from sudo password prompt interaction, which NOPASSWD eliminates. This results in faster playbook execution.

## Security Hardening for NOPASSWD

NOPASSWD access is powerful. Here are ways to limit the blast radius.

```
# /etc/sudoers.d/ansible-hardened
# Disable requiretty
Defaults:deploy !requiretty

# Log all sudo commands
Defaults:deploy log_output
Defaults:deploy logfile=/var/log/ansible-sudo.log

# Set a limited PATH for sudo commands
Defaults:deploy secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Prevent environment variable injection
Defaults:deploy env_reset
Defaults:deploy !env_keep

# Grant NOPASSWD access
deploy ALL=(root,postgres,www-data) NOPASSWD: ALL
```

Additional server-side hardening:

```yaml
# playbooks/harden-sudo.yml
# Apply security hardening around NOPASSWD sudo
---
- name: Harden sudo configuration
  hosts: all
  become: true

  tasks:
    - name: Restrict SSH access for deploy user by IP
      ansible.builtin.blockinfile:
        path: /etc/ssh/sshd_config
        block: |
          Match User deploy
              AllowTCPForwarding no
              X11Forwarding no
              PermitTunnel no
        marker: "# {mark} ANSIBLE SSH RESTRICTIONS"
      notify: restart sshd

    - name: Set up sudo command logging
      ansible.builtin.copy:
        content: |
          Defaults log_output
          Defaults!/usr/bin/sudoreplay !log_output
        dest: /etc/sudoers.d/sudo-logging
        mode: '0440'
        validate: "visudo -cf %s"

    - name: Configure log rotation for sudo logs
      ansible.builtin.copy:
        content: |
          /var/log/ansible-sudo.log {
              rotate 30
              daily
              compress
              missingok
              notifempty
          }
        dest: /etc/logrotate.d/ansible-sudo
        mode: '0644'

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

## Auditing NOPASSWD Usage

Monitor what Ansible does with its NOPASSWD access.

```bash
# View sudo log on the remote host
tail -f /var/log/sudo.log

# Check auth log for sudo events
grep sudo /var/log/auth.log | tail -20

# List sudo replay sessions (if log_output is enabled)
sudoreplay -l
```

NOPASSWD sudo is a necessary trade-off for Ansible automation. The key is to pair it with other security controls: SSH key-only authentication, IP-based access restrictions, sudo command logging, and the principle of least privilege for which users the Ansible account can become. With those layers in place, NOPASSWD access is both practical and secure.
