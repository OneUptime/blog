# How to Use Ansible become with Specific sudoers Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, sudo, Security, Linux, Privilege Escalation

Description: Configure sudoers rules to work properly with Ansible become, including NOPASSWD, command restrictions, and secure configurations.

---

Getting Ansible's become to work smoothly with sudo depends entirely on how your sudoers file is configured. A poorly configured sudoers file leads to playbook failures, password prompts that hang forever, or security holes wide enough to drive a truck through. This guide walks through the sudoers configurations that work well with Ansible and how to set them up programmatically.

## Understanding How Ansible Uses sudo

When Ansible executes a task with `become: true`, it wraps the actual command in a sudo call. The exact command it sends looks something like this:

```bash
# What Ansible actually runs on the remote host
sudo -H -S -n -u root /bin/sh -c 'echo BECOME-SUCCESS-randomstring; /usr/bin/python3 /home/deploy/.ansible/tmp/ansible-tmp-xxx/AnsiballZ_command.py'
```

The flags matter:
- `-H` sets the HOME environment variable to the target user's home
- `-S` reads the password from stdin
- `-n` is non-interactive (no prompt if password is needed and not provided)
- `-u root` specifies the target user

Your sudoers configuration needs to allow this exact pattern, or parts of it will be blocked.

## Basic NOPASSWD Configuration

The simplest and most common setup for Ansible is passwordless sudo for the automation user. This avoids the need to pass `become_pass` and prevents interactive prompt issues.

Create a sudoers drop-in file for the Ansible user:

```bash
# /etc/sudoers.d/ansible - Basic NOPASSWD rule
# Allow the 'deploy' user to run any command as any user without a password
deploy ALL=(ALL) NOPASSWD: ALL
```

You can deploy this with Ansible itself (assuming you already have some level of access):

```yaml
---
# setup-sudoers.yml - Deploy sudoers configuration for Ansible
- name: Configure sudoers for Ansible automation
  hosts: all
  become: true
  tasks:
    - name: Create sudoers file for the deploy user
      ansible.builtin.copy:
        content: |
          # Ansible automation user - managed by Ansible
          deploy ALL=(ALL) NOPASSWD: ALL
        dest: /etc/sudoers.d/ansible
        owner: root
        group: root
        mode: '0440'
        validate: 'visudo -cf %s'
```

The `validate` parameter is critical. It runs `visudo -cf` on the file before putting it in place. If the syntax is wrong, Ansible will not deploy the file, saving you from locking yourself out.

## Restricting Commands in sudoers

Giving full `NOPASSWD: ALL` access might not be acceptable in your environment. You can restrict which commands the Ansible user is allowed to run. However, this requires careful thought because Ansible uses Python and shell wrappers for most operations.

Here is a more restrictive sudoers file that still allows Ansible to function:

```bash
# /etc/sudoers.d/ansible-restricted - Limited command access
# Command aliases for Ansible operations
Cmnd_Alias ANSIBLE_PACKAGE = /usr/bin/yum, /usr/bin/dnf, /usr/bin/apt-get, /usr/bin/apt
Cmnd_Alias ANSIBLE_SERVICE = /usr/bin/systemctl, /sbin/service
Cmnd_Alias ANSIBLE_FILE = /usr/bin/cp, /usr/bin/mv, /usr/bin/chmod, /usr/bin/chown, /usr/bin/mkdir
Cmnd_Alias ANSIBLE_PYTHON = /usr/bin/python3, /usr/bin/python

# Allow the deploy user to run only specific commands
deploy ALL=(ALL) NOPASSWD: ANSIBLE_PACKAGE, ANSIBLE_SERVICE, ANSIBLE_FILE, ANSIBLE_PYTHON
```

Deploy this restricted configuration:

```yaml
---
# setup-restricted-sudoers.yml - Deploy restricted sudoers
- name: Configure restricted sudoers for Ansible
  hosts: all
  become: true
  tasks:
    - name: Deploy restricted sudoers rules
      ansible.builtin.template:
        src: templates/sudoers-ansible.j2
        dest: /etc/sudoers.d/ansible
        owner: root
        group: root
        mode: '0440'
        validate: 'visudo -cf %s'
```

The Jinja2 template allows you to customize per environment:

```jinja2
# templates/sudoers-ansible.j2
# Ansible automation sudoers - managed by Ansible
# Environment: {{ ansible_environment | default('production') }}

# Command aliases
Cmnd_Alias ANSIBLE_PKG = {{ sudoers_package_commands | default('/usr/bin/dnf, /usr/bin/yum') }}
Cmnd_Alias ANSIBLE_SVC = /usr/bin/systemctl
Cmnd_Alias ANSIBLE_PYTHON = /usr/bin/python3

# User rule
{{ ansible_user | default('deploy') }} ALL=(ALL) NOPASSWD: ANSIBLE_PKG, ANSIBLE_SVC, ANSIBLE_PYTHON
```

## Handling the requiretty Setting

Some Linux distributions (older RHEL/CentOS in particular) ship with `requiretty` enabled in sudoers. This blocks Ansible because it connects over SSH without allocating a TTY by default.

Check and fix the requiretty setting:

```yaml
---
# fix-requiretty.yml - Disable requiretty for Ansible user
- name: Fix requiretty for Ansible
  hosts: all
  become: true
  tasks:
    - name: Check if requiretty is set globally
      ansible.builtin.command: grep -c "requiretty" /etc/sudoers
      register: requiretty_check
      changed_when: false
      failed_when: false

    - name: Add exception for deploy user (without removing global setting)
      ansible.builtin.copy:
        content: |
          # Disable requiretty for the Ansible user
          Defaults:deploy !requiretty
        dest: /etc/sudoers.d/ansible-notty
        owner: root
        group: root
        mode: '0440'
        validate: 'visudo -cf %s'
      when: requiretty_check.rc == 0
```

This approach is better than removing `requiretty` globally because it only affects the automation user.

## Configuring become_pass with sudoers

If NOPASSWD is not an option, you need to provide the sudo password to Ansible. There are several ways to do this.

Using a vault-encrypted variable:

```yaml
---
# group_vars/all/vault.yml (encrypted with ansible-vault)
ansible_become_pass: "{{ vault_become_pass }}"
vault_become_pass: "supersecretpassword"
```

Your playbook does not need any special configuration:

```yaml
---
# deploy.yml - Playbook that uses become with password
- name: Deploy application
  hosts: all
  become: true
  tasks:
    - name: Install application packages
      ansible.builtin.dnf:
        name: myapp
        state: present
```

Run the playbook with the vault password:

```bash
# Run with vault password prompt
ansible-playbook -i inventory.yml deploy.yml --ask-vault-pass

# Or use a vault password file
ansible-playbook -i inventory.yml deploy.yml --vault-password-file ~/.vault_pass
```

The matching sudoers entry for password-based sudo:

```bash
# /etc/sudoers.d/ansible - Password required
deploy ALL=(ALL) ALL
```

## Configuring sudo for Specific become_user Targets

Ansible does not always become root. Sometimes you need to become a specific application user. Your sudoers file needs to account for this.

```bash
# /etc/sudoers.d/ansible-app-users - Allow becoming specific users
# Allow deploy to become the webapp user
deploy ALL=(webapp) NOPASSWD: ALL

# Allow deploy to become root
deploy ALL=(root) NOPASSWD: ALL

# Allow deploy to become the database backup user
deploy ALL=(dbbackup) NOPASSWD: /usr/bin/pg_dump, /usr/bin/pg_restore
```

Use this in your playbook:

```yaml
---
# app-deploy.yml - Become different users for different tasks
- name: Deploy web application
  hosts: app_servers
  tasks:
    - name: Install system packages (become root)
      ansible.builtin.dnf:
        name: nodejs
        state: present
      become: true
      become_user: root

    - name: Deploy application code (become webapp user)
      ansible.builtin.git:
        repo: https://github.com/myorg/webapp.git
        dest: /home/webapp/app
        version: main
      become: true
      become_user: webapp

    - name: Run database backup (become dbbackup user)
      ansible.builtin.command: pg_dump -Fc mydb -f /backups/mydb.dump
      become: true
      become_user: dbbackup
```

## Secure Defaults for Ansible sudoers

Here is a comprehensive sudoers configuration that balances security with functionality:

```bash
# /etc/sudoers.d/ansible-secure - Production-ready sudoers config

# Set secure defaults for the Ansible user
Defaults:deploy !requiretty
Defaults:deploy env_reset
Defaults:deploy secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Defaults:deploy timestamp_timeout=0
Defaults:deploy logfile="/var/log/ansible-sudo.log"
Defaults:deploy log_input, log_output
Defaults:deploy iolog_dir="/var/log/sudo-io/%{user}"

# Grant access
deploy ALL=(ALL) NOPASSWD: ALL
```

Deploy this with the template module:

```yaml
---
# secure-sudoers.yml - Deploy hardened sudoers config
- name: Deploy secure sudoers configuration
  hosts: all
  become: true
  tasks:
    - name: Create sudo log directory
      ansible.builtin.file:
        path: /var/log/sudo-io
        state: directory
        owner: root
        group: root
        mode: '0700'

    - name: Deploy hardened sudoers config
      ansible.builtin.copy:
        src: files/ansible-secure-sudoers
        dest: /etc/sudoers.d/ansible
        owner: root
        group: root
        mode: '0440'
        validate: 'visudo -cf %s'

    - name: Set up log rotation for sudo logs
      ansible.builtin.copy:
        content: |
          /var/log/ansible-sudo.log {
              weekly
              rotate 12
              compress
              missingok
              notifempty
          }
        dest: /etc/logrotate.d/ansible-sudo
        owner: root
        group: root
        mode: '0644'
```

## Testing Your sudoers Configuration

After deploying sudoers changes, always verify that Ansible can still connect and escalate privileges. This quick smoke test does exactly that:

```yaml
---
# test-become.yml - Verify become works after sudoers changes
- name: Verify become is working
  hosts: all
  become: true
  gather_facts: false
  tasks:
    - name: Check who we are
      ansible.builtin.command: id
      register: id_result
      changed_when: false

    - name: Verify we are root
      ansible.builtin.assert:
        that:
          - "'root' in id_result.stdout"
        fail_msg: "become did not escalate to root. Got: {{ id_result.stdout }}"
        success_msg: "become is working correctly: {{ id_result.stdout }}"
```

## Wrapping Up

The sudoers file is the bridge between Ansible's become mechanism and your system's security policy. Get it right and automation flows smoothly. Get it wrong and you either lock yourself out or leave the door wide open. Always use `validate: 'visudo -cf %s'` when deploying sudoers files with Ansible, always test after making changes, and always keep a backup path to the system (console access, a separate admin account) in case something goes sideways.
