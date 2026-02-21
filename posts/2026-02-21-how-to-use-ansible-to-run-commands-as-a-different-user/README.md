# How to Use Ansible to Run Commands as a Different User

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Become, User Switching, Privilege Escalation

Description: Learn how to run Ansible tasks as different users with become, become_user, and sudo to manage permissions and run application-specific commands.

---

In many environments, different tasks need to run as different users. Database commands run as `postgres`, application tasks run as `deploy`, and system-level configuration runs as `root`. Ansible provides several mechanisms for switching users during playbook execution, and understanding when to use each one will save you from permission headaches.

## The Basics of become and become_user

Ansible uses two key directives for user switching:

- `become: yes` - Enables privilege escalation (usually to root via sudo)
- `become_user: username` - Specifies which user to switch to

```yaml
# basic_become.yml - Basic user switching examples
---
- name: Run tasks as different users
  hosts: all

  tasks:
    - name: Run a command as root
      ansible.builtin.command:
        cmd: whoami
      become: yes
      register: root_result

    - name: Run a command as the deploy user
      ansible.builtin.command:
        cmd: whoami
      become: yes
      become_user: deploy
      register: deploy_result

    - name: Run a command as postgres
      ansible.builtin.command:
        cmd: whoami
      become: yes
      become_user: postgres
      register: postgres_result

    - name: Show who ran each command
      ansible.builtin.debug:
        msg: |
          Root task: {{ root_result.stdout }}
          Deploy task: {{ deploy_result.stdout }}
          Postgres task: {{ postgres_result.stdout }}
```

When you set `become: yes` without `become_user`, it defaults to root. When you add `become_user`, Ansible escalates to root first (via sudo), then switches to the target user (via su or sudo -u).

## Play-Level vs Task-Level become

You can set `become` at the play level for all tasks, or at the task level for individual tasks.

```yaml
# play_vs_task_level.yml - Different levels of become
---
# All tasks in this play run as root
- name: System configuration (all tasks as root)
  hosts: all
  become: yes

  tasks:
    - name: Install packages
      ansible.builtin.apt:
        name: nginx
        state: present

    - name: Configure nginx
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf

# Tasks run as the connecting user unless overridden
- name: Application deployment (mixed users)
  hosts: all

  tasks:
    - name: Create application directory (as root)
      ansible.builtin.file:
        path: /opt/myapp
        state: directory
        owner: deploy
        group: deploy
      become: yes

    - name: Deploy application code (as deploy user)
      ansible.builtin.git:
        repo: https://github.com/example/myapp.git
        dest: /opt/myapp
      become: yes
      become_user: deploy

    - name: Install dependencies (as deploy user)
      ansible.builtin.command:
        cmd: npm install --production
        chdir: /opt/myapp
      become: yes
      become_user: deploy
```

## Running Database Commands as postgres

A very common scenario is running PostgreSQL commands as the `postgres` system user.

```yaml
# postgres_commands.yml - Database operations as postgres user
---
- name: PostgreSQL administration
  hosts: db_servers
  become: yes

  tasks:
    - name: Create a database
      ansible.builtin.command:
        cmd: createdb myapp_production
      become_user: postgres
      register: create_db
      changed_when: create_db.rc == 0
      failed_when:
        - create_db.rc != 0
        - "'already exists' not in create_db.stderr"

    - name: Create a database user
      ansible.builtin.command:
        cmd: "psql -c \"CREATE USER myapp WITH PASSWORD 'securepass';\""
      become_user: postgres
      register: create_user
      changed_when: create_user.rc == 0
      failed_when:
        - create_user.rc != 0
        - "'already exists' not in create_user.stderr"
      no_log: true

    - name: Grant privileges
      ansible.builtin.command:
        cmd: "psql -c \"GRANT ALL PRIVILEGES ON DATABASE myapp_production TO myapp;\""
      become_user: postgres

    - name: Run a backup
      ansible.builtin.shell:
        cmd: "pg_dump myapp_production | gzip > /backup/myapp_$(date +%Y%m%d).sql.gz"
      become_user: postgres

    - name: Run database maintenance
      ansible.builtin.command:
        cmd: "psql -d myapp_production -c 'VACUUM ANALYZE;'"
      become_user: postgres
      changed_when: true
```

## Application Tasks as a Service User

Applications should run as dedicated service users, not root.

```yaml
# app_user_tasks.yml - Application management as service user
---
- name: Application management
  hosts: app_servers
  become: yes

  tasks:
    - name: Pull latest code
      ansible.builtin.git:
        repo: https://github.com/example/myapp.git
        dest: /opt/myapp
        version: main
      become_user: deploy

    - name: Install Python dependencies in virtualenv
      ansible.builtin.command:
        cmd: /opt/myapp/venv/bin/pip install -r requirements.txt
        chdir: /opt/myapp
      become_user: deploy

    - name: Run database migrations
      ansible.builtin.command:
        cmd: /opt/myapp/venv/bin/python manage.py migrate
        chdir: /opt/myapp
      become_user: deploy
      environment:
        DATABASE_URL: "{{ database_url }}"
        DJANGO_SETTINGS_MODULE: "myapp.settings.production"

    - name: Collect static files
      ansible.builtin.command:
        cmd: /opt/myapp/venv/bin/python manage.py collectstatic --noinput
        chdir: /opt/myapp
      become_user: deploy
      environment:
        DJANGO_SETTINGS_MODULE: "myapp.settings.production"

    - name: Restart the application service (needs root)
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      # No become_user here, so it runs as root (the play-level become)
```

## Using become_method

By default, Ansible uses `sudo` for privilege escalation. You can change this.

```yaml
# become_methods.yml - Different escalation methods
---
- name: Different become methods
  hosts: all

  tasks:
    - name: Use sudo (default)
      ansible.builtin.command:
        cmd: whoami
      become: yes
      become_method: sudo

    - name: Use su instead of sudo
      ansible.builtin.command:
        cmd: whoami
      become: yes
      become_user: deploy
      become_method: su

    - name: Use pbrun (PowerBroker)
      ansible.builtin.command:
        cmd: whoami
      become: yes
      become_method: pbrun
      when: false  # Only on systems with PowerBroker

    - name: Use doas (OpenBSD alternative to sudo)
      ansible.builtin.command:
        cmd: whoami
      become: yes
      become_method: doas
      when: false  # Only on systems with doas
```

## Handling Passwords for Privilege Escalation

Sometimes switching users requires a password.

```yaml
# become_with_password.yml - Privilege escalation with passwords
---
- name: Tasks requiring escalation password
  hosts: all
  become: yes
  # Pass via command line: --ask-become-pass
  # Or set in inventory: ansible_become_password

  vars:
    ansible_become_password: "{{ vault_sudo_password }}"

  tasks:
    - name: Task that requires sudo password
      ansible.builtin.command:
        cmd: cat /etc/shadow
      register: shadow_content
      no_log: true
```

From the command line:

```bash
# Prompt for the sudo password at runtime
ansible-playbook playbook.yml --ask-become-pass

# Use a vault-encrypted password file
ansible-playbook playbook.yml -e @vault_passwords.yml --ask-vault-pass
```

## Block-Level User Switching

Use `block` to group tasks that all run as the same user.

```yaml
# block_become.yml - Group tasks by user with blocks
---
- name: Grouped user switching with blocks
  hosts: all
  become: yes

  tasks:
    - name: Root tasks
      block:
        - name: Install system packages
          ansible.builtin.apt:
            name:
              - build-essential
              - libssl-dev
            state: present

        - name: Create application directories
          ansible.builtin.file:
            path: "{{ item }}"
            state: directory
            owner: deploy
            group: deploy
          loop:
            - /opt/myapp
            - /opt/myapp/logs
            - /opt/myapp/data

    - name: Deploy user tasks
      block:
        - name: Clone repository
          ansible.builtin.git:
            repo: https://github.com/example/myapp.git
            dest: /opt/myapp/src

        - name: Build application
          ansible.builtin.command:
            cmd: make build
            chdir: /opt/myapp/src

        - name: Run tests
          ansible.builtin.command:
            cmd: make test
            chdir: /opt/myapp/src
          changed_when: false
      become_user: deploy

    - name: Postgres tasks
      block:
        - name: Create database
          ansible.builtin.command:
            cmd: createdb myapp_prod
          failed_when: false

        - name: Run migrations
          ansible.builtin.command:
            cmd: "psql -d myapp_prod -f /opt/myapp/src/schema.sql"
      become_user: postgres
```

## Debugging User Context Issues

When things go wrong with user switching, these tasks help diagnose the problem.

```yaml
# debug_user_context.yml - Debug user switching issues
---
- name: Debug user context
  hosts: all
  become: yes

  tasks:
    - name: Show current user context
      ansible.builtin.shell:
        cmd: |
          echo "whoami: $(whoami)"
          echo "id: $(id)"
          echo "HOME: $HOME"
          echo "USER: $USER"
          echo "PWD: $(pwd)"
      register: user_context
      become_user: deploy
      changed_when: false

    - name: Display context
      ansible.builtin.debug:
        msg: "{{ user_context.stdout_lines }}"

    - name: Check sudo permissions for deploy user
      ansible.builtin.command:
        cmd: "sudo -l -U deploy"
      register: sudo_perms
      changed_when: false

    - name: Show deploy user sudo permissions
      ansible.builtin.debug:
        msg: "{{ sudo_perms.stdout_lines }}"
```

## Summary

Running commands as different users in Ansible revolves around the `become` and `become_user` directives. Set `become: yes` at the play level for tasks that mostly run as root, then override with `become_user` at the task or block level for specific users. Use blocks to group tasks that share the same user context. Remember that `become_user` requires `become: yes` to work, since Ansible needs to escalate privileges first before switching to another user. For database operations, application management, and service-specific tasks, always run as the appropriate user rather than root to follow the principle of least privilege.
