# How to Configure Ansible become for Non-Root Users

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Privilege Escalation, Security, Linux, DevOps

Description: Configure Ansible become to escalate to non-root service accounts instead of root for improved security and isolation

---

The default behavior of Ansible become is to escalate to root, but that is not always what you need. Many tasks should run as a specific service account rather than root. Think about it: when you deploy a Python application, you want the files owned by the app user. When you manage PostgreSQL, commands should run as the postgres user. When you work with Nginx content, the www-data user makes more sense.

Configuring become for non-root users follows the principle of least privilege and results in better service isolation on your servers.

## Why Target Non-Root Users?

Running everything as root is the easy path, but it creates problems:

1. Files end up owned by root when they should be owned by service accounts
2. Processes started as root have unnecessary system access
3. One misconfigured task could damage the entire system
4. Audit logs show everything as root, making it hard to trace which service did what

Targeting specific users for specific tasks keeps your server clean and your security team happy.

## Basic become to a Non-Root User

```yaml
# playbooks/non-root-basic.yml
# Run tasks as a non-root service account
---
- name: Manage application as service user
  hosts: app_servers

  tasks:
    - name: Deploy application code
      ansible.builtin.git:
        repo: "https://github.com/myorg/myapp.git"
        dest: /opt/myapp/current
        version: main
      become: true
      become_user: appuser

    - name: Install dependencies in virtualenv
      ansible.builtin.pip:
        requirements: /opt/myapp/current/requirements.txt
        virtualenv: /opt/myapp/venv
      become: true
      become_user: appuser

    - name: Run database migrations
      ansible.builtin.command: /opt/myapp/venv/bin/python manage.py migrate
      args:
        chdir: /opt/myapp/current
      become: true
      become_user: appuser
```

## How the Escalation Path Works

When you set `become_user` to a non-root user, the escalation path depends on the `become_method`:

With sudo (default): The SSH user uses sudo to become the target user.

```bash
# Ansible executes something like:
sudo -H -S -n -u appuser /bin/bash -c 'command'
```

With su: The SSH user uses su, typically through root first, then to the target user.

For sudo to work, the SSH user needs a sudoers entry that allows becoming the target user.

```
# /etc/sudoers.d/ansible
# Allow deploy to become specific non-root users
deploy ALL=(appuser) NOPASSWD: ALL
deploy ALL=(postgres) NOPASSWD: ALL
deploy ALL=(www-data) NOPASSWD: ALL
```

## Play-Level Non-Root become

If an entire playbook operates as a specific service account, set become_user at the play level.

```yaml
# playbooks/appuser-play.yml
# Entire play runs as the appuser account
---
- name: Application management
  hosts: app_servers
  become: true
  become_user: appuser

  tasks:
    - name: Check current application version
      ansible.builtin.command: cat /opt/myapp/current/VERSION
      register: current_version
      changed_when: false

    - name: Update application code
      ansible.builtin.git:
        repo: "https://github.com/myorg/myapp.git"
        dest: /opt/myapp/current
        version: "{{ target_version }}"
      when: current_version.stdout != target_version

    - name: Install updated dependencies
      ansible.builtin.pip:
        requirements: /opt/myapp/current/requirements.txt
        virtualenv: /opt/myapp/venv
        state: latest

    - name: Collect static files
      ansible.builtin.command: /opt/myapp/venv/bin/python manage.py collectstatic --noinput
      args:
        chdir: /opt/myapp/current
```

All four tasks run as `appuser`. Files created are owned by `appuser`. Environment variables reflect `appuser`'s environment.

## Managing PostgreSQL as the postgres User

PostgreSQL is the most common use case for non-root become.

```yaml
# playbooks/postgres-management.yml
# All database tasks run as the postgres system user
---
- name: PostgreSQL database management
  hosts: database_servers

  tasks:
    - name: Create application databases
      community.postgresql.postgresql_db:
        name: "{{ item }}"
        encoding: UTF-8
        template: template0
      loop:
        - myapp_production
        - myapp_staging
      become: true
      become_user: postgres

    - name: Create database roles
      community.postgresql.postgresql_user:
        name: "{{ item.name }}"
        password: "{{ item.password }}"
        role_attr_flags: "{{ item.flags | default('') }}"
      loop:
        - { name: myapp_rw, password: "{{ vault_rw_pass }}", flags: "CREATEDB" }
        - { name: myapp_ro, password: "{{ vault_ro_pass }}" }
      become: true
      become_user: postgres
      no_log: true

    - name: Set database access privileges
      community.postgresql.postgresql_privs:
        database: myapp_production
        type: table
        objs: ALL_IN_SCHEMA
        privs: SELECT,INSERT,UPDATE,DELETE
        role: myapp_rw
        schema: public
      become: true
      become_user: postgres

    - name: Create read-only access
      community.postgresql.postgresql_privs:
        database: myapp_production
        type: table
        objs: ALL_IN_SCHEMA
        privs: SELECT
        role: myapp_ro
        schema: public
      become: true
      become_user: postgres

    - name: Run a backup as postgres
      ansible.builtin.command: pg_dump myapp_production -f /var/backups/myapp_production.sql
      become: true
      become_user: postgres
```

## Managing Web Content as www-data

```yaml
# playbooks/web-content.yml
# Deploy web content as the www-data user
---
- name: Deploy web content
  hosts: webservers

  tasks:
    - name: Create content directories
      ansible.builtin.file:
        path: "{{ item }}"
        state: directory
        mode: '0755'
      loop:
        - /var/www/mysite
        - /var/www/mysite/assets
        - /var/www/mysite/uploads
      become: true
      become_user: www-data

    - name: Deploy website files
      ansible.builtin.synchronize:
        src: files/website/
        dest: /var/www/mysite/
        delete: true
        rsync_opts:
          - "--chmod=F644,D755"
      become: true
      become_user: www-data

    - name: Generate sitemap
      ansible.builtin.command: /usr/local/bin/generate-sitemap /var/www/mysite
      become: true
      become_user: www-data
```

## Creating the Service Account First

If the non-root user does not exist yet, you need root access to create it before you can become it.

```yaml
# playbooks/setup-service-accounts.yml
# Create service accounts, then switch to them
---
- name: Setup service accounts and deploy
  hosts: app_servers

  tasks:
    - name: Create the appuser account (needs root)
      ansible.builtin.user:
        name: appuser
        system: true
        shell: /bin/bash
        home: /opt/myapp
        create_home: true
      become: true
      become_user: root

    - name: Setup sudoers for deploy to become appuser
      ansible.builtin.copy:
        content: "deploy ALL=(appuser) NOPASSWD: ALL\n"
        dest: /etc/sudoers.d/deploy-appuser
        mode: '0440'
        validate: "visudo -cf %s"
      become: true
      become_user: root

    - name: Now deploy as appuser
      ansible.builtin.git:
        repo: "https://github.com/myorg/myapp.git"
        dest: /opt/myapp/current
        version: main
      become: true
      become_user: appuser
```

## Inventory Configuration for Non-Root become

Set non-root become as the default for specific host groups.

```ini
# inventory/hosts.ini
[app_servers]
app1 ansible_host=192.168.1.10
app2 ansible_host=192.168.1.11

[app_servers:vars]
ansible_become=true
ansible_become_user=appuser
ansible_become_method=sudo

[database_servers]
db1 ansible_host=192.168.1.20

[database_servers:vars]
ansible_become=true
ansible_become_user=postgres
ansible_become_method=sudo
```

With this inventory, tasks on app_servers default to running as appuser, and tasks on database_servers default to running as postgres. Individual tasks can still override with `become_user: root` when needed.

## Handling Environment Variables

Non-root users have different environment variables than root. Using `become_flags: '-i'` gives you the target user's login environment.

```yaml
# playbooks/with-user-env.yml
# Access the target user's environment variables
---
- name: Tasks needing user environment
  hosts: app_servers

  tasks:
    - name: Run app command with user's PATH and environment
      ansible.builtin.command: /opt/myapp/venv/bin/python manage.py check
      args:
        chdir: /opt/myapp/current
      become: true
      become_user: appuser
      become_flags: '-i'
      environment:
        DJANGO_SETTINGS_MODULE: myapp.settings.production
        DATABASE_URL: "{{ vault_database_url }}"
```

## Troubleshooting Non-Root become

```bash
# Verify the user exists on the remote host
ansible app_servers -m command -a "id appuser" -v

# Verify sudo permissions for the transition
ansible app_servers -m command -a "sudo -l -U deploy" --become -v

# Test becoming the non-root user directly
ansible app_servers -m command -a "whoami" --become --become-user=appuser -v

# Check if the user's home directory exists and has correct permissions
ansible app_servers -m command -a "ls -la /opt/myapp" --become -v
```

Common issues:

- "Sorry, user deploy is not allowed to execute as appuser" means the sudoers file needs updating
- "No such user" means the target user does not exist on the remote host
- Permission denied on files usually means the previous tasks created files as root instead of the target user

## Best Practices

1. Create dedicated service accounts for each application or service
2. Use system accounts (no login shell, no password) for services
3. Grant the minimum sudo permissions needed (specific user transitions only)
4. Use `become_flags: '-i'` when the target user's environment setup matters
5. Always use absolute paths in tasks to avoid confusion about which user's home directory is active

Targeting non-root users with Ansible become is a hallmark of well-structured infrastructure automation. It takes a bit more effort than running everything as root, but the payoff in security, proper file ownership, and service isolation is worth it.
