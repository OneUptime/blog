# How to Debug Ansible Privilege Escalation Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, sudo, Privilege Escalation, Security

Description: Learn how to diagnose and fix Ansible privilege escalation failures including sudo permission errors, password prompts, and become method issues.

---

Privilege escalation in Ansible means running tasks as a different user, usually root, via sudo. When it fails, the error messages can be misleading because the problem might be the sudo configuration on the remote host, a missing password, a TTY requirement, or a dozen other things. This post covers every common privilege escalation failure and how to fix each one.

## How Become Works

When you set `become: true` on a task, Ansible wraps the command in a privilege escalation method (sudo by default):

```yaml
# This task runs as root via sudo
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
  become: true
```

Behind the scenes, Ansible runs something like:

```bash
sudo -H -S -n -u root /bin/sh -c 'echo BECOME-SUCCESS-xyz; /usr/bin/python3 /tmp/ansible-module-abc.py'
```

## Common Error: Missing sudo Password

```
fatal: [web-01]: FAILED! => {"msg": "Missing sudo password"}
```

This happens when the remote user requires a password for sudo but Ansible does not have one.

**Fix 1: Provide the password interactively:**

```bash
ansible-playbook deploy.yml --ask-become-pass
# or the short form
ansible-playbook deploy.yml -K
```

**Fix 2: Set the password in the inventory (less secure):**

```ini
# inventory
[webservers:vars]
ansible_become_password=mysecretpassword
```

**Fix 3: Use Ansible Vault for the password:**

```yaml
# group_vars/webservers/vault.yml (encrypted with ansible-vault)
ansible_become_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  ...encrypted data...
```

**Fix 4: Configure passwordless sudo on the remote host (recommended):**

```bash
# On the remote host, add to /etc/sudoers.d/deploy
# deploy ALL=(ALL) NOPASSWD: ALL
```

You can automate this with an initial playbook:

```yaml
# Run this once with --ask-become-pass to set up passwordless sudo
- name: Configure passwordless sudo
  hosts: all
  become: true

  tasks:
    - name: Add deploy user to sudoers with NOPASSWD
      ansible.builtin.copy:
        content: "deploy ALL=(ALL) NOPASSWD: ALL"
        dest: /etc/sudoers.d/deploy
        mode: "0440"
        validate: visudo -cf %s
```

## Common Error: sudo Requires a TTY

```
fatal: [web-01]: FAILED! => {"msg": "Timeout (12s) waiting for privilege escalation prompt"}
```

Some systems (particularly RHEL/CentOS with default sudoers) require a TTY for sudo:

```
# In /etc/sudoers
Defaults requiretty
```

**Fix 1: Disable requiretty for the Ansible user:**

```bash
# On the remote host, add to /etc/sudoers.d/deploy
Defaults:deploy !requiretty
```

**Fix 2: Tell Ansible to use a PTY:**

```ini
# ansible.cfg
[ssh_connection]
# Force pseudo-terminal allocation
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -tt
```

**Fix 3: Use pipelining (which avoids the issue):**

```ini
# ansible.cfg
[connection]
pipelining = True
```

Note: Pipelining requires `requiretty` to be disabled in sudoers.

## Common Error: User Not in sudoers

```
fatal: [web-01]: FAILED! => {"msg": "deploy is not in the sudoers file. This incident will be reported."}
```

The remote user does not have sudo privileges.

**Fix: Add the user to the sudo group:**

```bash
# On the remote host (as root)
usermod -aG sudo deploy   # Debian/Ubuntu
usermod -aG wheel deploy  # RHEL/CentOS
```

Or add a specific sudoers entry:

```bash
# /etc/sudoers.d/deploy
deploy ALL=(ALL) NOPASSWD: ALL
```

## Common Error: Incorrect become_method

By default, Ansible uses `sudo`. But some systems use `su`, `pbrun`, `doas`, or other methods:

```yaml
# Using su instead of sudo
- name: Run as root via su
  ansible.builtin.command:
    cmd: whoami
  become: true
  become_method: su
  become_password: "{{ root_password }}"
```

Available become methods:

```yaml
# ansible.cfg or per-task/play
become_method: sudo    # Default, most common
become_method: su      # Switch user with su
become_method: pbrun   # PowerBroker
become_method: pfexec  # Solaris
become_method: doas    # OpenBSD
become_method: runas   # Windows
```

## Common Error: Become User Does Not Exist

```
fatal: [web-01]: FAILED! => {"msg": "Failed to set permissions on the temporary files Ansible needs to create when becoming an unprivileged user"}
```

When using `become_user` to become a specific non-root user:

```yaml
- name: Run as postgres
  ansible.builtin.command:
    cmd: psql -c "SELECT version()"
  become: true
  become_user: postgres
```

**Debugging:**

```bash
# Verify the user exists on the remote host
ansible web-01 -m command -a "id postgres" --become

# Check if sudo allows switching to that user
ansible web-01 -m command -a "sudo -u postgres whoami" --become
```

**Fix: Ensure sudoers allows the user switch:**

```
# /etc/sudoers.d/deploy
deploy ALL=(ALL) NOPASSWD: ALL
# Or more restrictive:
deploy ALL=(postgres) NOPASSWD: ALL
```

## Common Error: Temporary File Permission Issues

```
fatal: [web-01]: FAILED! => {"msg": "Failed to set permissions on the temporary files Ansible needs to create when becoming an unprivileged user (rc: 1, err: chmod: changing permissions of '/tmp/ansible-tmp-xyz/': Operation not permitted)"}
```

This happens when `become_user` is a non-root user and the temp directory has restrictive permissions.

**Fix 1: Allow world-executable temp directories:**

```ini
# ansible.cfg
[defaults]
allow_world_readable_tmpfiles = true
```

**Fix 2: Use pipelining (avoids temp files):**

```ini
# ansible.cfg
[connection]
pipelining = True
```

**Fix 3: Change the remote tmp directory:**

```ini
# ansible.cfg
[defaults]
remote_tmp = /tmp/.ansible/tmp
```

## Debugging with Verbose Output

Use maximum verbosity to see the exact sudo command:

```bash
ansible web-01 -m command -a "whoami" --become -vvvv
```

Look for the `BECOME` line:

```
<web-01> SSH: EXEC ssh ... '/bin/sh -c '"'"'echo BECOME-SUCCESS-abcdef123;
  /usr/bin/sudo -H -S -n -u root /bin/sh -c '"'"'"'"'"'"'"'"'echo BECOME-SUCCESS-abcdef123;
  /usr/bin/python3 /home/deploy/.ansible/tmp/...'"'"'"'"'"'"'"'"''"'"''
```

If sudo is failing, you might see:

```
<web-01> (1, '', 'sudo: a password is required\n')
```

## Testing Privilege Escalation

Here is a diagnostic playbook:

```yaml
---
- name: Test privilege escalation
  hosts: all
  gather_facts: false

  tasks:
    - name: Test connection without become
      ansible.builtin.command:
        cmd: whoami
      register: no_become
      changed_when: false

    - name: Show current user
      ansible.builtin.debug:
        msg: "Connected as: {{ no_become.stdout }}"

    - name: Test become to root
      ansible.builtin.command:
        cmd: whoami
      become: true
      register: with_become
      changed_when: false

    - name: Show become user
      ansible.builtin.debug:
        msg: "Become user: {{ with_become.stdout }}"

    - name: Test become to specific user
      ansible.builtin.command:
        cmd: whoami
      become: true
      become_user: nobody
      register: become_nobody
      changed_when: false
      ignore_errors: true

    - name: Show specific become result
      ansible.builtin.debug:
        msg: "Become nobody: {{ become_nobody.stdout | default('FAILED: ' + become_nobody.msg | default('unknown')) }}"

    - name: Check sudo configuration
      ansible.builtin.command:
        cmd: sudo -l
      register: sudo_list
      changed_when: false

    - name: Show sudo privileges
      ansible.builtin.debug:
        var: sudo_list.stdout_lines
```

## Ansible Configuration for Privilege Escalation

Here are all the relevant settings:

```ini
# ansible.cfg
[privilege_escalation]
become = false              # Default become setting
become_method = sudo        # Default method
become_user = root          # Default target user
become_ask_pass = false     # Whether to ask for password

[defaults]
# Timeout waiting for privilege escalation prompt
timeout = 30
```

Per-host in inventory:

```ini
# inventory
[webservers:vars]
ansible_become=true
ansible_become_method=sudo
ansible_become_user=root
ansible_become_password={{ vault_sudo_password }}
```

## Summary

Privilege escalation failures in Ansible come down to: missing passwords, sudo not being configured for the user, TTY requirements, wrong become method, or temporary file permission issues. Debug by first testing sudo manually on the remote host, then running Ansible with `-vvvv` to see the exact sudo command and its error. The most reliable setup is passwordless sudo for your deployment user combined with pipelining enabled in ansible.cfg. For environments where passwordless sudo is not possible, use Ansible Vault to store the become password securely.
