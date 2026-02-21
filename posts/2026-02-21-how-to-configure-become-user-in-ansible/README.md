# How to Configure become_user in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Privilege Escalation, Linux, DevOps

Description: Configure the become_user directive in Ansible to run tasks as specific system users for service accounts and applications

---

The `become_user` directive in Ansible controls which user you escalate to when `become` is enabled. While most people default to `become_user: root`, real-world infrastructure management often requires running tasks as specific service accounts like `postgres`, `www-data`, `nginx`, or custom application users. Getting `become_user` right is essential for proper file ownership, correct process execution, and following the principle of least privilege.

## Understanding become_user

When you set `become: true` without specifying `become_user`, Ansible defaults to root. The `become_user` directive changes that target user. Behind the scenes, Ansible translates `become_user` into the appropriate sudo command.

```bash
# What Ansible does when become_user is set:
# become_user: root    -> sudo -H -S -n -u root /bin/bash -c 'command'
# become_user: postgres -> sudo -H -S -n -u postgres /bin/bash -c 'command'
# become_user: www-data -> sudo -H -S -n -u www-data /bin/bash -c 'command'
```

## Basic become_user Configuration

Here is a playbook that demonstrates running tasks as different users.

```yaml
# playbooks/multi-user.yml
# Run different tasks as different system users
---
- name: Multi-user task execution
  hosts: all

  tasks:
    - name: Install packages as root
      ansible.builtin.apt:
        name:
          - postgresql
          - nginx
        state: present
      become: true
      become_user: root

    - name: Initialize database as postgres
      ansible.builtin.command: initdb -D /var/lib/postgresql/data
      become: true
      become_user: postgres

    - name: Deploy web content as www-data
      ansible.builtin.copy:
        src: files/index.html
        dest: /var/www/html/index.html
        mode: '0644'
      become: true
      become_user: www-data
```

## Setting become_user at Different Levels

You can set `become_user` at multiple levels in the Ansible hierarchy. More specific settings override more general ones.

```yaml
# playbooks/hierarchy.yml
# become_user set at play level, overridden at task level
---
- name: Default to running as appuser
  hosts: webservers
  become: true
  become_user: appuser

  tasks:
    - name: This runs as appuser (inherited from play)
      ansible.builtin.command: whoami
      register: result1

    - name: This runs as root (task override)
      ansible.builtin.apt:
        name: curl
        state: present
      become_user: root

    - name: This runs as www-data (task override)
      ansible.builtin.file:
        path: /var/www/html/uploads
        state: directory
        mode: '0755'
      become_user: www-data

    - name: Back to appuser (inherited from play)
      ansible.builtin.command: whoami
      register: result2

    - name: Show results
      ansible.builtin.debug:
        msg: "Task 1: {{ result1.stdout }}, Task 4: {{ result2.stdout }}"
```

## Configuring in ansible.cfg

Set a global default `become_user` in your configuration file.

```ini
# ansible.cfg
[privilege_escalation]
become = true
become_method = sudo
become_user = root
become_ask_pass = false
```

## Configuring in Inventory

Set `become_user` per host or per group.

```ini
# inventory/hosts.ini
[webservers]
web1 ansible_host=192.168.1.10
web2 ansible_host=192.168.1.11

[webservers:vars]
ansible_become=true
ansible_become_user=www-data

[databases]
db1 ansible_host=192.168.1.20 ansible_become_user=postgres
db2 ansible_host=192.168.1.21 ansible_become_user=postgres

[databases:vars]
ansible_become=true
```

With this setup, tasks on webservers default to running as `www-data`, and tasks on database servers default to running as `postgres`.

## Practical Example: Database Management

A common use case is managing PostgreSQL, where most commands need to run as the `postgres` user.

```yaml
# playbooks/postgres-setup.yml
# Manage PostgreSQL as the postgres system user
---
- name: Configure PostgreSQL
  hosts: databases
  become: true

  tasks:
    - name: Install PostgreSQL
      ansible.builtin.apt:
        name:
          - postgresql
          - postgresql-contrib
        state: present
      become_user: root

    - name: Ensure PostgreSQL is running
      ansible.builtin.service:
        name: postgresql
        state: started
        enabled: true
      become_user: root

    - name: Create application database
      community.postgresql.postgresql_db:
        name: myapp_production
        encoding: UTF-8
        lc_collate: en_US.UTF-8
        lc_ctype: en_US.UTF-8
      become_user: postgres

    - name: Create application database user
      community.postgresql.postgresql_user:
        db: myapp_production
        name: myapp
        password: "{{ db_password }}"
        priv: ALL
      become_user: postgres

    - name: Configure pg_hba for application access
      ansible.builtin.lineinfile:
        path: /etc/postgresql/14/main/pg_hba.conf
        line: "host myapp_production myapp 10.0.0.0/24 md5"
      become_user: root
      notify: restart postgresql

  handlers:
    - name: restart postgresql
      ansible.builtin.service:
        name: postgresql
        state: restarted
      become_user: root
```

## Practical Example: Web Application Deployment

Deploying web applications often involves multiple user contexts.

```yaml
# playbooks/web-deploy.yml
# Deploy a web application with proper user contexts
---
- name: Deploy web application
  hosts: webservers
  become: true

  vars:
    app_user: myapp
    app_dir: /opt/myapp

  tasks:
    - name: Create application user
      ansible.builtin.user:
        name: "{{ app_user }}"
        system: true
        shell: /bin/bash
        home: "{{ app_dir }}"
        create_home: true
      become_user: root

    - name: Clone application code
      ansible.builtin.git:
        repo: "https://github.com/myorg/myapp.git"
        dest: "{{ app_dir }}/current"
        version: "{{ app_version | default('main') }}"
      become_user: "{{ app_user }}"

    - name: Install Python dependencies
      ansible.builtin.pip:
        requirements: "{{ app_dir }}/current/requirements.txt"
        virtualenv: "{{ app_dir }}/venv"
      become_user: "{{ app_user }}"

    - name: Create log directory
      ansible.builtin.file:
        path: /var/log/myapp
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: '0755'
      become_user: root

    - name: Deploy systemd service file
      ansible.builtin.template:
        src: templates/myapp.service.j2
        dest: /etc/systemd/system/myapp.service
        mode: '0644'
      become_user: root
      notify:
        - reload systemd
        - restart myapp

  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: true
      become_user: root

    - name: restart myapp
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become_user: root
```

## Using Variables for become_user

For flexible playbooks, use variables for `become_user`.

```yaml
# playbooks/flexible-user.yml
# Use variables to determine which user to become
---
- name: Deploy with configurable user
  hosts: all
  become: true

  vars:
    service_user: "{{ lookup('env', 'SERVICE_USER') | default('appuser', true) }}"

  tasks:
    - name: Run application tasks as the service user
      ansible.builtin.command: /opt/app/bin/healthcheck
      become_user: "{{ service_user }}"

    - name: Run maintenance tasks as the service user
      ansible.builtin.command: /opt/app/bin/cleanup
      become_user: "{{ service_user }}"
```

## sudoers Requirements for become_user

Your connecting user needs sudo permission to become the target user. This is configured in sudoers.

```
# /etc/sudoers.d/ansible
# Allow deploy user to become specific service accounts

# Become any user (broad permission)
deploy ALL=(ALL) NOPASSWD: ALL

# Or, become only specific users (more secure)
deploy ALL=(root) NOPASSWD: ALL
deploy ALL=(postgres) NOPASSWD: ALL
deploy ALL=(www-data) NOPASSWD: ALL
deploy ALL=(myapp) NOPASSWD: ALL
```

The syntax is `user ALL=(target_users) commands`. The parenthetical specifies which users the deploy account is allowed to become.

## Troubleshooting become_user

Common issues and their fixes.

```bash
# Error: "Sorry, user deploy is not allowed to execute ... as postgres"
# The sudoers file does not allow becoming that user
# Fix: Add appropriate sudoers entry

# Error: "No such user: appuser"
# The target user does not exist on the remote host
# Fix: Create the user first, or check for typos

# Verify what the deploy user can sudo as
ansible webservers -m shell -a "sudo -l" -v
```

```yaml
# Playbook to diagnose become_user issues
---
- name: Diagnose become_user
  hosts: all
  gather_facts: false

  tasks:
    - name: Check current SSH user
      ansible.builtin.command: whoami
      register: ssh_user

    - name: Check become to root
      ansible.builtin.command: whoami
      become: true
      become_user: root
      register: root_user
      ignore_errors: true

    - name: Check become to postgres
      ansible.builtin.command: whoami
      become: true
      become_user: postgres
      register: pg_user
      ignore_errors: true

    - name: Report results
      ansible.builtin.debug:
        msg: |
          SSH user: {{ ssh_user.stdout }}
          Root become: {{ root_user.stdout | default('FAILED') }}
          Postgres become: {{ pg_user.stdout | default('FAILED') }}
```

## Best Practices

1. Always use the least-privileged user for each task. Do not run everything as root when a service account would suffice.
2. Use `become_user: root` only for tasks that genuinely need root (package installs, service management, system file edits).
3. Create dedicated service accounts for applications and use `become_user` to run tasks as those accounts.
4. Keep sudoers configuration tight by specifying exactly which users the Ansible user can become.
5. Document which tasks need which user and why, especially in shared playbooks.

The `become_user` directive gives you granular control over the execution context of each task. Using it properly results in playbooks that respect file ownership, process isolation, and security boundaries on your systems.
