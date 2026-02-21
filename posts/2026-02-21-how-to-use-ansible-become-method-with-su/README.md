# How to Use Ansible become_method with su

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Privilege Escalation, Linux, su

Description: Configure Ansible to use su instead of sudo for privilege escalation on systems where sudo is unavailable

---

Not every Linux system has sudo installed or configured. Older systems, minimal installations, and some security-hardened environments rely on `su` (substitute user) for privilege escalation. Ansible supports `su` as a `become_method`, letting you manage these systems without installing sudo.

This guide shows how to configure Ansible to use `su` for privilege escalation, including handling the root password, mixing `su` with other methods, and dealing with the common gotchas.

## When to Use su Instead of sudo

There are several situations where `su` is the right choice:

- Legacy systems (CentOS 5, older Debian) that do not have sudo installed
- Minimal Docker containers or embedded systems without sudo
- Environments where security policy mandates `su` over sudo
- Systems where only the root password is known, not a user-level sudo password

The main difference between `su` and `sudo` is that `su` requires the target user's password (typically root's password), while `sudo` requires the current user's password.

## Basic su Configuration

Here is how to configure Ansible to use `su` at different levels.

```ini
# ansible.cfg
[privilege_escalation]
become = true
become_method = su
become_user = root
become_ask_pass = true
```

Or in your inventory:

```ini
# inventory/hosts.ini
[legacy_servers]
legacy1 ansible_host=192.168.1.50 ansible_user=operator
legacy2 ansible_host=192.168.1.51 ansible_user=operator

[legacy_servers:vars]
ansible_become=true
ansible_become_method=su
ansible_become_user=root
```

## Running a Playbook with su

When using `su`, you need to provide the root password (or the target user's password). Use the `--ask-become-pass` flag.

```bash
# Run with interactive password prompt for su
ansible-playbook -i inventory/hosts.ini playbooks/setup.yml --ask-become-pass

# The prompt will ask for the "BECOME password"
# Enter the root password (not the operator user's password)
```

## Playbook with su become_method

Here is a complete playbook that uses su for privilege escalation.

```yaml
# playbooks/su-setup.yml
# System setup using su instead of sudo
---
- name: Configure legacy servers using su
  hosts: legacy_servers
  become: true
  become_method: su
  become_user: root

  tasks:
    - name: Update package lists
      ansible.builtin.yum:
        name: '*'
        state: latest
        update_only: true

    - name: Install essential tools
      ansible.builtin.yum:
        name:
          - vim
          - wget
          - net-tools
        state: present

    - name: Set timezone
      ansible.builtin.command: timedatectl set-timezone UTC
      changed_when: false

    - name: Ensure crond is running
      ansible.builtin.service:
        name: crond
        state: started
        enabled: true
```

## Storing the su Password Securely

For automated runs, store the root password in Ansible Vault.

```bash
# Create encrypted vault file for the root password
ansible-vault create group_vars/legacy_servers/vault.yml
```

```yaml
# group_vars/legacy_servers/vault.yml (encrypted)
# Root password used for su escalation
ansible_become_pass: "the_root_password"
```

Now you can run the playbook without the interactive prompt.

```bash
# Run using the vaulted password
ansible-playbook -i inventory/hosts.ini playbooks/su-setup.yml --ask-vault-pass
```

## su vs sudo: Key Differences in Ansible

The behavior of `su` and `sudo` differs in several ways that affect your Ansible configuration.

```yaml
# playbooks/su-differences.yml
# Demonstrating su-specific behavior
---
- name: su-specific considerations
  hosts: legacy_servers
  become: true
  become_method: su

  tasks:
    - name: Show the environment (su starts a login shell)
      ansible.builtin.command: env
      register: env_output

    - name: Show current user
      ansible.builtin.command: whoami
      register: user_info

    - name: Display results
      ansible.builtin.debug:
        msg: |
          Running as: {{ user_info.stdout }}
          HOME: {{ ansible_env.HOME | default('not set') }}
```

Key differences:

- `su` starts a new login shell by default, which means environment variables are reset
- `su` requires the target user's password, not the calling user's password
- `su` does not have fine-grained command restrictions like sudoers
- `su` does not log commands by default (unlike sudo's audit trail)

## Becoming Non-Root Users with su

You can use `su` to become any user, not just root. But remember: `su` to a non-root user still requires the target user's password (or root access).

```yaml
# playbooks/su-nonroot.yml
# Become a service account using su
---
- name: Run tasks as service accounts
  hosts: legacy_servers

  tasks:
    - name: Run database backup as postgres
      ansible.builtin.command: pg_dump mydb > /tmp/backup.sql
      become: true
      become_method: su
      become_user: postgres

    - name: Check web server files as apache
      ansible.builtin.command: ls -la /var/www/html
      become: true
      become_method: su
      become_user: apache
```

In practice, you usually `su` to root first and then to the target user. This is the default Ansible behavior with `su`: it escalates to root, then switches to the specified user.

## Mixing su and sudo in the Same Playbook

Some environments have a mix of systems, some with sudo and some with only su. You can handle this with per-host or per-group settings.

```ini
# inventory/mixed.ini
[modern_servers]
modern1 ansible_host=192.168.1.10

[modern_servers:vars]
ansible_become_method=sudo

[legacy_servers]
legacy1 ansible_host=192.168.1.50

[legacy_servers:vars]
ansible_become_method=su
ansible_become_pass={{ vault_root_password }}
```

Or at the task level:

```yaml
# playbooks/mixed-methods.yml
# Different escalation methods for different scenarios
---
- name: Tasks on legacy servers
  hosts: legacy_servers

  tasks:
    - name: Install package using su to root
      ansible.builtin.yum:
        name: httpd
        state: present
      become: true
      become_method: su
      become_user: root
```

## Pipelining with su

Pipelining can be tricky with `su` because it changes how Ansible sends commands to the remote host. If you encounter issues, try disabling pipelining.

```ini
# ansible.cfg
[ssh_connection]
pipelining = false
```

If your `su` setup requires a TTY (which is common), you also need to disable pipelining because the pseudo-TTY allocation conflicts with pipelining.

## Handling su Password Prompts

The `su` command has different password prompt strings depending on the OS and locale. Ansible usually handles this automatically, but if you encounter prompt matching issues, you can configure the expected prompt.

```yaml
# playbooks/custom-prompt.yml
# Handle non-standard su password prompts
---
- name: Handle custom su prompts
  hosts: legacy_servers
  become: true
  become_method: su
  become_flags: '-'

  vars:
    ansible_su_prompt_l10n:
      - "Password:"
      - "Mot de passe:"
      - "Contraseña:"

  tasks:
    - name: Test connectivity
      ansible.builtin.ping:
```

## Troubleshooting su Issues

```bash
# Test su manually on the remote host
ssh operator@192.168.1.50 "su - root -c 'whoami'"

# Run Ansible with maximum verbosity
ansible legacy_servers -m ping --become --become-method=su -K -vvvv

# Check if su is available on the remote host
ansible legacy_servers -m shell -a "which su"
```

Common errors:

```
# "su: Authentication failure"
# The become password is wrong
# Fix: Verify you are entering the ROOT password, not the operator password

# "su: cannot set groups: Operation not permitted"
# Happens in some container environments
# Fix: May need nsenter or a different escalation approach

# Timeout waiting for privilege escalation password prompt
# Ansible cannot detect the su prompt
# Fix: Check locale settings, try become_flags: '-'
```

## Installing sudo as a Bootstrap Step

If you are using `su` only because sudo is not installed, you can bootstrap sudo installation using `su` and then switch to sudo for subsequent runs.

```yaml
# playbooks/bootstrap-sudo.yml
# Install sudo using su, then transition to sudo
---
- name: Bootstrap sudo on legacy servers
  hosts: legacy_servers
  become: true
  become_method: su

  tasks:
    - name: Install sudo
      ansible.builtin.yum:
        name: sudo
        state: present

    - name: Configure sudoers for the operator user
      ansible.builtin.lineinfile:
        path: /etc/sudoers.d/operator
        line: "operator ALL=(ALL) NOPASSWD: ALL"
        create: true
        mode: '0440'
        validate: "visudo -cf %s"

    - name: Verify sudo works
      ansible.builtin.command: sudo -u root whoami
      become: false
      register: sudo_test

    - name: Report
      ansible.builtin.debug:
        msg: "sudo is now available. Switch become_method to sudo for future runs."
      when: sudo_test.stdout == "root"
```

Using `su` with Ansible is straightforward once you understand the password model (target user's password instead of current user's password) and account for the environmental differences. For new infrastructure, sudo is the better choice, but `su` remains a perfectly valid escalation method when sudo is not an option.
