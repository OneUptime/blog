# How to Use Ansible to Execute Commands with sudo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, sudo, Privilege Escalation, Linux

Description: A practical guide to running Ansible tasks with sudo using become, become_user, and become_method for privilege escalation.

---

When managing Linux servers with Ansible, most administrative tasks require root privileges. Installing packages, modifying system files, restarting services, managing users - all of these need elevated permissions. Ansible handles this through its privilege escalation system, which revolves around the `become` directive.

In this post, we will walk through everything you need to know about running Ansible commands with sudo, from basic usage to advanced scenarios like switching between users and handling password prompts.

## The Basics: become and become_user

The `become` directive tells Ansible to escalate privileges before running a task. By default, it uses sudo and escalates to root.

Here is the simplest example:

```yaml
# install a package using sudo (become escalates to root by default)
---
- name: Install packages with sudo
  hosts: webservers
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present

    - name: Start and enable nginx
      ansible.builtin.systemd:
        name: nginx
        state: started
        enabled: true
```

Setting `become: true` at the play level means every task in that play runs with sudo. If you only need sudo for specific tasks, set it at the task level instead:

```yaml
# apply sudo only to tasks that need it
---
- name: Mixed privilege tasks
  hosts: webservers
  tasks:
    - name: Check uptime (no sudo needed)
      ansible.builtin.command:
        cmd: uptime
      changed_when: false

    - name: Read syslog (requires sudo)
      ansible.builtin.command:
        cmd: tail -20 /var/log/syslog
      become: true
      changed_when: false
      register: syslog_output

    - name: Display syslog entries
      ansible.builtin.debug:
        var: syslog_output.stdout_lines
```

## Becoming a Different User

Sometimes you need to run commands as a specific user rather than root. The `become_user` directive controls which user you escalate to.

A common use case is running application commands as the service user:

```yaml
# run database commands as the postgres user
---
- name: Database maintenance
  hosts: db_servers
  tasks:
    - name: Run PostgreSQL vacuum
      ansible.builtin.command:
        cmd: psql -c "VACUUM ANALYZE;"
      become: true
      become_user: postgres
      changed_when: false

    - name: Check replication status
      ansible.builtin.command:
        cmd: psql -c "SELECT * FROM pg_stat_replication;"
      become: true
      become_user: postgres
      register: replication_status
      changed_when: false

    - name: Deploy application as app user
      ansible.builtin.copy:
        src: files/app-config.yaml
        dest: /opt/myapp/config.yaml
        owner: appuser
        group: appuser
        mode: '0640'
      become: true
      become_user: appuser
```

## Handling sudo Passwords

In production, many environments require a sudo password. You can provide it in several ways.

The most common approach is using the `--ask-become-pass` flag (or `-K`) when running the playbook:

```bash
# prompt for the sudo password at runtime
ansible-playbook deploy.yaml -K
```

For automated pipelines where interactive prompts are not possible, you can store the password in a variable and reference it. But never put passwords in plaintext. Use Ansible Vault:

```bash
# create an encrypted vault file for the sudo password
ansible-vault create secrets.yaml
```

Inside the vault file:

```yaml
# vault-encrypted file containing the sudo password
ansible_become_password: "your_sudo_password_here"
```

Then reference it in your playbook or pass it at runtime:

```bash
# run playbook with vault-encrypted sudo password
ansible-playbook deploy.yaml --extra-vars @secrets.yaml --ask-vault-pass
```

You can also set the become password per host in your inventory:

```ini
# inventory file with per-host sudo passwords (use vault for real deployments)
[webservers]
web1 ansible_host=10.0.1.10 ansible_become_password="{{ vault_web1_pass }}"
web2 ansible_host=10.0.1.11 ansible_become_password="{{ vault_web2_pass }}"
```

## Using become_method

While sudo is the default, Ansible supports other escalation methods. The `become_method` directive lets you switch between them.

```yaml
# use su instead of sudo for privilege escalation
---
- name: Tasks using su
  hosts: legacy_servers
  become: true
  become_method: su
  tasks:
    - name: Check root crontab
      ansible.builtin.command:
        cmd: crontab -l
      changed_when: false
```

Supported methods include `sudo`, `su`, `pbrun`, `pfexec`, `doas`, `dzdo`, `ksu`, and `runas` (for Windows). Most Linux environments use sudo, but you will encounter su on older systems or in certain security configurations.

## Passwordless sudo Configuration

For automation to work smoothly, you typically want passwordless sudo for the Ansible service account. Here is how to set that up with Ansible itself:

```yaml
# configure passwordless sudo for the ansible service account
---
- name: Configure sudo for Ansible
  hosts: all
  become: true
  tasks:
    - name: Create ansible service account
      ansible.builtin.user:
        name: ansible_svc
        shell: /bin/bash
        create_home: true
        state: present

    - name: Set up passwordless sudo for ansible_svc
      ansible.builtin.copy:
        content: "ansible_svc ALL=(ALL) NOPASSWD: ALL\n"
        dest: /etc/sudoers.d/ansible_svc
        owner: root
        group: root
        mode: '0440'
        validate: 'visudo -cf %s'

    - name: Deploy SSH authorized key
      ansible.builtin.authorized_key:
        user: ansible_svc
        key: "{{ lookup('file', '~/.ssh/ansible_svc.pub') }}"
        state: present
```

The `validate` parameter on the copy task is critical. It runs `visudo -cf` against the file before placing it. If the syntax is wrong, the task fails safely instead of breaking sudo on the system.

## Restricting sudo to Specific Commands

In security-conscious environments, you might not want full root access. You can limit sudo to specific commands:

```yaml
# configure restricted sudo that only allows specific commands
---
- name: Set up restricted sudo
  hosts: app_servers
  become: true
  tasks:
    - name: Create restricted sudoers entry for deploy user
      ansible.builtin.copy:
        content: |
          # Allow deploy user to restart services and read logs only
          deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart myapp
          deploy ALL=(root) NOPASSWD: /usr/bin/systemctl status myapp
          deploy ALL=(root) NOPASSWD: /usr/bin/journalctl -u myapp*
        dest: /etc/sudoers.d/deploy_user
        owner: root
        group: root
        mode: '0440'
        validate: 'visudo -cf %s'
```

## Debugging sudo Issues

When sudo is not working as expected, these techniques help track down the problem:

```yaml
# debug sudo configuration and connectivity
---
- name: Debug sudo access
  hosts: all
  tasks:
    - name: Check current user
      ansible.builtin.command:
        cmd: whoami
      changed_when: false
      register: current_user

    - name: Check sudo access
      ansible.builtin.command:
        cmd: sudo -l
      changed_when: false
      register: sudo_list
      become: false

    - name: Check who we become
      ansible.builtin.command:
        cmd: whoami
      become: true
      changed_when: false
      register: become_user

    - name: Display results
      ansible.builtin.debug:
        msg:
          - "Connected as: {{ current_user.stdout }}"
          - "Become user: {{ become_user.stdout }}"
          - "Sudo permissions: {{ sudo_list.stdout_lines }}"
```

## Setting become in ansible.cfg

If most of your playbooks need sudo, you can set it as a default in your `ansible.cfg`:

```ini
# ansible.cfg - set default privilege escalation
[privilege_escalation]
become = true
become_method = sudo
become_user = root
become_ask_pass = false
```

This saves you from adding `become: true` to every playbook, though being explicit in playbooks is generally better for readability.

## A Complete Example: System Hardening

Here is a practical playbook that combines several sudo patterns for system hardening:

```yaml
# system hardening playbook using various sudo patterns
---
- name: Harden server security
  hosts: all
  become: true
  vars:
    ssh_port: 22
    allowed_users:
      - admin
      - deploy
  tasks:
    - name: Update all packages
      ansible.builtin.apt:
        upgrade: dist
        update_cache: true
        cache_valid_time: 3600

    - name: Disable root SSH login
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^PermitRootLogin'
        line: 'PermitRootLogin no'
      notify: Restart sshd

    - name: Set SSH allowed users
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^AllowUsers'
        line: "AllowUsers {{ allowed_users | join(' ') }}"
      notify: Restart sshd

    - name: Configure sudo logging
      ansible.builtin.copy:
        content: |
          Defaults logfile="/var/log/sudo.log"
          Defaults log_input, log_output
        dest: /etc/sudoers.d/logging
        mode: '0440'
        validate: 'visudo -cf %s'

  handlers:
    - name: Restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted
```

## Summary

Running Ansible tasks with sudo is something you will do in almost every playbook. The key directives are `become: true` for escalation, `become_user` for targeting a specific user, and `become_method` for choosing the escalation mechanism. Always use Ansible Vault for storing sudo passwords, validate sudoers files with `visudo -cf`, and consider passwordless sudo for your automation service accounts. Setting `become` at the task level instead of the play level gives you finer control and makes your playbooks more readable.
