# How to Use the tasks_from Parameter in Ansible Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Tasks, Automation

Description: Master the tasks_from parameter in Ansible roles to selectively run specific task files instead of the default main.yml entry point.

---

By default, when Ansible executes a role, it runs `tasks/main.yml`. That is the entry point, and for simple roles it works fine. But what happens when your role has multiple distinct operations? Maybe your database role needs to handle installation, backup, restoration, and user creation as separate workflows. Running everything through a single `main.yml` quickly becomes a mess. The `tasks_from` parameter lets you point Ansible at a specific task file within a role, giving you much finer control over what actually runs.

## The Default Behavior

When you include a role the standard way, Ansible loads `tasks/main.yml`:

```yaml
# This runs roles/postgresql/tasks/main.yml
- hosts: databases
  roles:
    - postgresql
```

There is nothing wrong with this for straightforward roles. But consider a PostgreSQL role that handles:

- Installing PostgreSQL
- Creating databases
- Managing users
- Running backups
- Performing restores
- Upgrading between versions

Stuffing all of that into `main.yml` (even with includes) means every playbook that uses the role gets the full treatment. That is not always what you want.

## Splitting a Role into Multiple Task Files

First, organize your role with separate task files for each operation:

```
roles/postgresql/
  tasks/
    main.yml          # Default entry point - full installation
    install.yml       # Just install PostgreSQL
    create_db.yml     # Create databases
    manage_users.yml  # Create and manage database users
    backup.yml        # Run a backup
    restore.yml       # Restore from backup
    upgrade.yml       # Upgrade PostgreSQL version
  defaults/
    main.yml
  templates/
    pg_hba.conf.j2
    postgresql.conf.j2
  handlers/
    main.yml
```

Here is what each file might look like:

```yaml
# roles/postgresql/tasks/main.yml
# Full installation and configuration - the default entry point
- name: Install PostgreSQL packages
  ansible.builtin.apt:
    name:
      - "postgresql-{{ pg_version }}"
      - "postgresql-client-{{ pg_version }}"
      - python3-psycopg2
    state: present
    update_cache: yes

- name: Ensure PostgreSQL is started and enabled
  ansible.builtin.systemd:
    name: postgresql
    state: started
    enabled: yes

- name: Deploy PostgreSQL configuration
  ansible.builtin.template:
    src: postgresql.conf.j2
    dest: "/etc/postgresql/{{ pg_version }}/main/postgresql.conf"
  notify: restart postgresql

- name: Deploy pg_hba.conf
  ansible.builtin.template:
    src: pg_hba.conf.j2
    dest: "/etc/postgresql/{{ pg_version }}/main/pg_hba.conf"
  notify: restart postgresql
```

```yaml
# roles/postgresql/tasks/create_db.yml
# Create databases without running full installation
- name: Create application databases
  community.postgresql.postgresql_db:
    name: "{{ item.name }}"
    encoding: "{{ item.encoding | default('UTF8') }}"
    lc_collate: "{{ item.lc_collate | default('en_US.UTF-8') }}"
    lc_ctype: "{{ item.lc_ctype | default('en_US.UTF-8') }}"
    state: present
  become_user: postgres
  loop: "{{ pg_databases }}"
```

```yaml
# roles/postgresql/tasks/backup.yml
# Run a pg_dump backup of specified databases
- name: Create backup directory
  ansible.builtin.file:
    path: "{{ pg_backup_dir }}"
    state: directory
    owner: postgres
    group: postgres
    mode: '0750'

- name: Run pg_dump for each database
  ansible.builtin.command:
    cmd: >
      pg_dump -U postgres -Fc
      -f {{ pg_backup_dir }}/{{ item }}_{{ ansible_date_time.date }}.dump
      {{ item }}
  become_user: postgres
  loop: "{{ pg_backup_databases }}"
  changed_when: true

- name: Remove backups older than retention period
  ansible.builtin.find:
    paths: "{{ pg_backup_dir }}"
    age: "{{ pg_backup_retention_days }}d"
    patterns: "*.dump"
  register: old_backups

- name: Delete old backup files
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ old_backups.files }}"
```

## Using tasks_from with include_role

The `tasks_from` parameter works with `include_role`. Here is how you call specific task files:

```yaml
# backup-playbook.yml
# Only run the backup tasks from the postgresql role
- hosts: databases
  become: yes
  tasks:
    - name: Run PostgreSQL backup
      ansible.builtin.include_role:
        name: postgresql
        tasks_from: backup.yml
      vars:
        pg_backup_dir: /var/backups/postgresql
        pg_backup_databases:
          - app_production
          - app_analytics
        pg_backup_retention_days: 30
```

Notice that we are not running the full role. We skip installation, configuration, and everything else. We just run the backup tasks.

## Using tasks_from with import_role

You can also use `tasks_from` with `import_role`, which processes the tasks at playbook parse time rather than runtime:

```yaml
# user-management.yml
# Only manage database users
- hosts: databases
  become: yes
  tasks:
    - name: Manage PostgreSQL users
      ansible.builtin.import_role:
        name: postgresql
        tasks_from: manage_users.yml
      vars:
        pg_users:
          - name: app_user
            password: "{{ vault_app_db_password }}"
            databases:
              - app_production
          - name: readonly_user
            password: "{{ vault_readonly_db_password }}"
            databases:
              - app_production
            privileges: SELECT
```

The difference between `include_role` and `import_role` matters here. With `import_role`, the tasks are merged into the playbook at parse time, so `when` conditions on the `import_role` task apply to every task inside the role. With `include_role`, the tasks are processed at runtime, so `when` conditions only determine whether the entire include happens or not.

## Using tasks_from in the roles Directive

You can also use `tasks_from` directly in the `roles` section of a play:

```yaml
# Only run the install tasks from the postgresql role
- hosts: databases
  become: yes
  roles:
    - role: postgresql
      tasks_from: install.yml
```

This is cleaner when you know at playbook design time which task file you need.

## Combining Multiple tasks_from Calls

A powerful pattern is calling the same role multiple times with different task files:

```yaml
# full-db-setup.yml
# Set up a database server step by step
- hosts: databases
  become: yes
  tasks:
    - name: Install PostgreSQL
      ansible.builtin.include_role:
        name: postgresql
        tasks_from: install.yml

    - name: Create databases
      ansible.builtin.include_role:
        name: postgresql
        tasks_from: create_db.yml
      vars:
        pg_databases:
          - name: app_production
          - name: app_staging

    - name: Set up database users
      ansible.builtin.include_role:
        name: postgresql
        tasks_from: manage_users.yml
      vars:
        pg_users:
          - name: app_user
            password: "{{ vault_app_db_password }}"
            databases:
              - app_production
              - app_staging
```

This approach gives you explicit control over the order and what variables are passed to each step.

## Using main.yml as a Router

Another pattern is to use `main.yml` as a dispatcher that includes specific task files based on a variable:

```yaml
# roles/postgresql/tasks/main.yml
# Route to the appropriate task file based on the requested action
- name: Include installation tasks
  ansible.builtin.include_tasks: install.yml
  when: pg_action == "install" or pg_action == "all"

- name: Include database creation tasks
  ansible.builtin.include_tasks: create_db.yml
  when: pg_action == "create_db" or pg_action == "all"

- name: Include user management tasks
  ansible.builtin.include_tasks: manage_users.yml
  when: pg_action == "manage_users" or pg_action == "all"

- name: Include backup tasks
  ansible.builtin.include_tasks: backup.yml
  when: pg_action == "backup"
```

```yaml
# roles/postgresql/defaults/main.yml
pg_action: "all"
pg_version: 16
pg_backup_dir: /var/backups/postgresql
pg_backup_retention_days: 14
```

This way, the default behavior still runs everything, but you can limit it:

```yaml
# Only run backups
- hosts: databases
  roles:
    - role: postgresql
      vars:
        pg_action: backup
```

## File Extension Note

You do not need to include the `.yml` extension in `tasks_from`. Both of these work:

```yaml
# Both are valid
- ansible.builtin.include_role:
    name: postgresql
    tasks_from: backup.yml

- ansible.builtin.include_role:
    name: postgresql
    tasks_from: backup
```

Ansible will search for `backup.yml`, `backup.yaml`, and `backup` in the role's `tasks/` directory.

## When to Use tasks_from

Use `tasks_from` when your role has clearly distinct operations that different playbooks need independently. Database roles, application deployment roles, and infrastructure roles are great candidates. If your role is small and focused on a single task (like installing a specific package), you probably do not need this pattern. Keep it simple until the complexity justifies the split.
