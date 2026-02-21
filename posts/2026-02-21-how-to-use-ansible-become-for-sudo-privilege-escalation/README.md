# How to Use Ansible become for sudo Privilege Escalation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, sudo, Privilege Escalation, Linux, DevOps

Description: Master Ansible become directive to run tasks with sudo for root-level operations on remote Linux servers

---

Most Ansible tasks that do real work on a server need root privileges. Installing packages, managing services, editing system configuration files, creating users... all of these require elevated access. The `become` directive is how Ansible handles privilege escalation, and `sudo` is the default method it uses.

This guide covers everything you need to know about using `become` with sudo in Ansible, from basic usage to advanced patterns.

## How become Works with sudo

When Ansible encounters a task with `become: true`, here is what happens behind the scenes:

1. Ansible connects to the remote host as your configured SSH user (say, `deploy`)
2. For the task that needs escalation, Ansible wraps the command with `sudo`
3. The actual command executed looks something like: `sudo -H -S -n -u root /bin/bash -c 'the_actual_command'`
4. If a sudo password is needed, Ansible supplies it through stdin

The SSH user never changes. Only the execution context changes for the tasks that specify `become`.

## Basic become Usage

The simplest way to use become is at the play level.

```yaml
# playbooks/basic-become.yml
# All tasks in this play run as root via sudo
---
- name: System setup with sudo
  hosts: all
  become: true

  tasks:
    - name: Install essential packages
      ansible.builtin.apt:
        name:
          - vim
          - curl
          - wget
          - htop
        state: present
        update_cache: true

    - name: Ensure NTP is running
      ansible.builtin.service:
        name: ntp
        state: started
        enabled: true
```

Setting `become: true` at the play level means every task in that play runs with sudo. This is the most common pattern.

## Task-Level become

You can also enable become on individual tasks, which is useful when most tasks do not need root access.

```yaml
# playbooks/task-level-become.yml
# Only specific tasks escalate to root
---
- name: Application deployment
  hosts: webservers

  tasks:
    - name: Clone the application repository
      ansible.builtin.git:
        repo: "https://github.com/myorg/myapp.git"
        dest: /home/deploy/myapp
        version: main

    - name: Install system dependencies (needs root)
      ansible.builtin.apt:
        name:
          - python3-pip
          - python3-venv
        state: present
      become: true

    - name: Create virtualenv as deploy user
      ansible.builtin.pip:
        requirements: /home/deploy/myapp/requirements.txt
        virtualenv: /home/deploy/myapp/venv

    - name: Configure systemd service (needs root)
      ansible.builtin.template:
        src: templates/myapp.service.j2
        dest: /etc/systemd/system/myapp.service
        mode: '0644'
      become: true
      notify: reload systemd

    - name: Start the application (needs root)
      ansible.builtin.systemd:
        name: myapp
        state: started
        enabled: true
      become: true

  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: true
      become: true
```

## Configuration in ansible.cfg

You can set become defaults in your ansible.cfg so you do not need to specify them in every playbook.

```ini
# ansible.cfg
[privilege_escalation]
become = false
become_method = sudo
become_user = root
become_ask_pass = false
```

Setting `become = false` as the default and enabling it per-task or per-play is a good practice. It prevents accidental root execution.

## Inventory-Level become

Set become parameters per host or per group in your inventory.

```ini
# inventory/hosts.ini
[webservers]
web1 ansible_host=192.168.1.10
web2 ansible_host=192.168.1.11

[webservers:vars]
ansible_user=deploy
ansible_become=true
ansible_become_method=sudo
ansible_become_user=root

[databases]
db1 ansible_host=192.168.1.20 ansible_become=true ansible_become_user=postgres
```

Notice the database host escalates to `postgres` instead of root. This is useful when you need to run database commands as the database owner.

## Handling sudo Passwords

If your remote user needs a password for sudo, you have several options.

```bash
# Option 1: Prompt at runtime
ansible-playbook playbooks/setup.yml --ask-become-pass

# Shorthand
ansible-playbook playbooks/setup.yml -K
```

```yaml
# Option 2: Prompt within the playbook
---
- name: Tasks needing sudo password
  hosts: all
  become: true
  vars_prompt:
    - name: ansible_become_pass
      prompt: "Sudo password"
      private: true

  tasks:
    - name: Install package
      ansible.builtin.apt:
        name: nginx
        state: present
```

```yaml
# Option 3: Store in Ansible Vault (recommended for automation)
# group_vars/webservers/vault.yml (encrypted)
ansible_become_pass: "encrypted_sudo_password_here"
```

## Becoming a Non-Root User

sudo is not just for becoming root. You can become any user.

```yaml
# playbooks/become-app-user.yml
# Run tasks as different service accounts
---
- name: Manage application as service user
  hosts: webservers

  tasks:
    - name: Deploy application files as www-data
      ansible.builtin.copy:
        src: files/app/
        dest: /var/www/myapp/
        mode: '0644'
      become: true
      become_user: www-data

    - name: Run database migration as postgres
      ansible.builtin.command: psql -f /opt/migrations/001.sql
      become: true
      become_user: postgres

    - name: Restart application as root
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true
      become_user: root
```

## become with Handlers

Do not forget that handlers need `become` too if they perform privileged operations.

```yaml
# playbooks/with-handlers.yml
# Handlers also need become for privileged operations
---
- name: Configure nginx
  hosts: webservers
  become: true

  tasks:
    - name: Update nginx configuration
      ansible.builtin.template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        mode: '0644'
      notify:
        - validate nginx config
        - restart nginx

  handlers:
    - name: validate nginx config
      ansible.builtin.command: nginx -t
      # become is inherited from play level

    - name: restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted
      # become is inherited from play level
```

## Conditional become

You can use variables to conditionally enable become.

```yaml
# playbooks/conditional-become.yml
# Enable become based on the target environment
---
- name: Deploy with conditional privileges
  hosts: all
  become: "{{ use_sudo | default(true) }}"

  tasks:
    - name: Create application directory
      ansible.builtin.file:
        path: /opt/myapp
        state: directory
        mode: '0755'
```

Run with sudo disabled:

```bash
# Override become at runtime
ansible-playbook playbooks/conditional-become.yml -e "use_sudo=false"
```

## Debugging become Issues

When become is not working, verbose mode shows you exactly what sudo command is being run.

```bash
# See the exact sudo command Ansible generates
ansible webservers -m command -a "whoami" --become -vvvv

# Check if the remote user can sudo at all
ansible webservers -m shell -a "sudo -l" -v
```

Common sudo problems:

```
# Error: "sudo: a password is required"
# Fix: Provide the password with -K or ansible_become_pass

# Error: "sudo: sorry, you must have a tty to run sudo"
# Fix: Remove "Defaults requiretty" from /etc/sudoers or disable pipelining

# Error: "is not in the sudoers file"
# Fix: Add the user to sudoers on the remote host
```

## sudoers Configuration for Ansible

Here is a sudoers entry that works well with Ansible.

```
# /etc/sudoers.d/ansible on the remote host
# Allow the deploy user to sudo without a password
deploy ALL=(ALL) NOPASSWD: ALL
```

For more restrictive access, limit what commands the user can run.

```
# Allow only specific commands without a password
deploy ALL=(ALL) NOPASSWD: /usr/bin/apt-get, /usr/bin/systemctl, /usr/bin/cp, /usr/bin/mv, /usr/bin/mkdir
```

## Best Practices

1. Default to `become: false` and enable it only where needed
2. Use `become_user` to run as the least-privileged user that can do the job
3. Store sudo passwords in Ansible Vault, never in plaintext
4. Configure NOPASSWD sudo for dedicated Ansible service accounts
5. Audit which tasks actually need become and remove it from those that do not
6. Use `--check` mode to preview what tasks will run with elevated privileges before applying them

Following these practices keeps your Ansible automation secure while still getting the job done. The become directive with sudo is a powerful tool, and like any powerful tool, it works best when used precisely rather than broadly.
