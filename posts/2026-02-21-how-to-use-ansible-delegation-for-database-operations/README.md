# How to Use Ansible Delegation for Database Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Database, Delegation, PostgreSQL, MySQL

Description: Learn how to use Ansible delegation to run database operations from a dedicated management host during application deployments.

---

Database operations during deployments need special handling. You rarely want every application server to run database migrations simultaneously. Instead, you delegate database tasks to a specific host, typically the database server itself, a management bastion, or the Ansible controller. Delegation ensures migrations run exactly once, from the right host, with proper credentials and network access.

## Why Delegate Database Operations

When deploying to 10 application servers, you want to:
1. Run database migrations once (not 10 times)
2. Run them from a host that has network access to the database
3. Run them with database credentials that are only available on specific hosts
4. Coordinate the migration with the application deployment sequence

Without delegation, you would need a separate play targeting the database host, which breaks the natural flow of your deployment playbook.

## PostgreSQL Operations with Delegation

Here is a deployment playbook that handles PostgreSQL database operations through delegation:

```yaml
# postgres-deploy.yml - Application deployment with PostgreSQL migration
---
- name: Deploy application with database migration
  hosts: appservers
  serial: 1
  vars:
    app_version: "3.2.0"
    db_host: db-primary.example.com
    db_name: myapp_production
    db_user: myapp
  tasks:
    - name: Check for pending migrations
      ansible.builtin.shell: |
        PGPASSWORD="{{ db_password }}" psql -h {{ db_host }} -U {{ db_user }} -d {{ db_name }} \
          -c "SELECT count(*) FROM schema_migrations WHERE applied = false;" -t | tr -d ' '
      register: pending_migrations
      delegate_to: "{{ db_host }}"
      run_once: true
      changed_when: false
      no_log: true

    - name: Create database backup before migration
      ansible.builtin.shell: |
        BACKUP_FILE="/var/backups/postgres/{{ db_name }}_pre_{{ app_version }}_$(date +%Y%m%d%H%M%S).dump"
        pg_dump -Fc -h localhost -U {{ db_user }} {{ db_name }} > "$BACKUP_FILE"
        echo "$BACKUP_FILE"
      register: backup_result
      delegate_to: "{{ db_host }}"
      run_once: true
      become: true
      become_user: postgres
      when: pending_migrations.stdout | int > 0

    - name: Run database migrations
      ansible.builtin.shell: |
        cd /opt/myapp-migrations
        ./run-migrations.sh \
          --database {{ db_name }} \
          --target-version {{ app_version }} \
          --host localhost
      register: migration_result
      delegate_to: "{{ db_host }}"
      run_once: true
      become: true
      become_user: "{{ db_user }}"
      when: pending_migrations.stdout | int > 0

    - name: Verify migration was successful
      ansible.builtin.shell: |
        PGPASSWORD="{{ db_password }}" psql -h {{ db_host }} -U {{ db_user }} -d {{ db_name }} \
          -c "SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1;" -t | tr -d ' '
      register: current_version
      delegate_to: "{{ db_host }}"
      run_once: true
      changed_when: false
      no_log: true

    - name: Fail if migration did not reach target version
      ansible.builtin.fail:
        msg: "Migration failed. Expected version {{ app_version }}, got {{ current_version.stdout }}"
      when:
        - pending_migrations.stdout | int > 0
        - current_version.stdout != app_version
      run_once: true

    - name: Deploy application code
      ansible.builtin.copy:
        src: "/releases/myapp-{{ app_version }}/"
        dest: /opt/myapp/
      become: true

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      become: true
```

## MySQL Operations with the mysql_db Module

Ansible has built-in modules for MySQL operations. You delegate these to the database server:

```yaml
# mysql-operations.yml - MySQL database management with delegation
---
- name: MySQL database operations during deployment
  hosts: appservers
  vars:
    db_host: mysql-primary.example.com
    db_name: myapp
    mysql_login_user: ansible_admin
    mysql_login_password: "{{ vault_mysql_password }}"
  tasks:
    - name: Create database if it does not exist
      community.mysql.mysql_db:
        name: "{{ db_name }}"
        state: present
        login_host: localhost
        login_user: "{{ mysql_login_user }}"
        login_password: "{{ mysql_login_password }}"
      delegate_to: "{{ db_host }}"
      run_once: true

    - name: Create application database user
      community.mysql.mysql_user:
        name: myapp_user
        password: "{{ vault_myapp_db_password }}"
        priv: "{{ db_name }}.*:SELECT,INSERT,UPDATE,DELETE"
        host: "%"
        login_host: localhost
        login_user: "{{ mysql_login_user }}"
        login_password: "{{ mysql_login_password }}"
        state: present
      delegate_to: "{{ db_host }}"
      run_once: true
      no_log: true

    - name: Import schema updates
      community.mysql.mysql_db:
        name: "{{ db_name }}"
        state: import
        target: "/opt/migrations/{{ app_version }}/schema.sql"
        login_host: localhost
        login_user: "{{ mysql_login_user }}"
        login_password: "{{ mysql_login_password }}"
      delegate_to: "{{ db_host }}"
      run_once: true

    - name: Deploy application
      ansible.builtin.copy:
        src: /releases/{{ app_version }}/
        dest: /opt/myapp/
      become: true
```

## Database Connection Check Before Deployment

Before running migrations, verify that the database is accessible and healthy:

```yaml
# db-health-check.yml - Pre-deployment database validation
---
- name: Pre-deployment database checks
  hosts: appservers
  vars:
    db_host: db-primary.example.com
    db_name: myapp_production
  tasks:
    - name: Check database connectivity
      community.postgresql.postgresql_ping:
        db: "{{ db_name }}"
        login_host: localhost
      delegate_to: "{{ db_host }}"
      run_once: true
      register: db_ping

    - name: Check replication status
      ansible.builtin.shell: |
        psql -U postgres -c "SELECT client_addr, state, sent_lsn, write_lsn, replay_lsn
                              FROM pg_stat_replication;" -t
      register: replication_status
      delegate_to: "{{ db_host }}"
      run_once: true
      become: true
      become_user: postgres
      changed_when: false

    - name: Display replication status
      ansible.builtin.debug:
        msg: "Replication status: {{ replication_status.stdout }}"
      run_once: true

    - name: Check for active locks that might block migration
      ansible.builtin.shell: |
        psql -U postgres -d {{ db_name }} -c "
          SELECT count(*) FROM pg_locks l
          JOIN pg_stat_activity a ON l.pid = a.pid
          WHERE l.granted = true AND a.state = 'active'
          AND l.mode IN ('AccessExclusiveLock', 'ExclusiveLock');" -t | tr -d ' '
      register: active_locks
      delegate_to: "{{ db_host }}"
      run_once: true
      become: true
      become_user: postgres
      changed_when: false

    - name: Warn about active exclusive locks
      ansible.builtin.fail:
        msg: >
          There are {{ active_locks.stdout }} active exclusive locks on {{ db_name }}.
          This may cause migration to hang. Investigate before proceeding.
      when: active_locks.stdout | int > 0
      run_once: true
```

## Handling Migration Rollbacks

If a migration fails, you need to roll back. Here is a pattern that handles this:

```yaml
# migration-rollback.yml - Database migration with rollback support
---
- name: Database migration with rollback
  hosts: appservers
  vars:
    db_host: db-primary.example.com
    db_name: myapp_production
  tasks:
    - name: Database migration
      block:
        - name: Record current schema version
          ansible.builtin.shell: |
            psql -U myapp -d {{ db_name }} -c \
              "SELECT max(version) FROM schema_migrations WHERE success = true;" -t | tr -d ' '
          register: pre_migration_version
          delegate_to: "{{ db_host }}"
          run_once: true
          changed_when: false

        - name: Create savepoint backup
          ansible.builtin.shell: |
            pg_dump -Fc -U postgres {{ db_name }} > /var/backups/{{ db_name }}_savepoint.dump
          delegate_to: "{{ db_host }}"
          run_once: true
          become: true
          become_user: postgres

        - name: Run forward migration
          ansible.builtin.shell: |
            cd /opt/migrations
            python3 migrate.py \
              --database {{ db_name }} \
              --direction forward \
              --to-version {{ target_version }}
          register: migration
          delegate_to: "{{ db_host }}"
          run_once: true

      rescue:
        - name: Migration failed - running rollback
          ansible.builtin.shell: |
            cd /opt/migrations
            python3 migrate.py \
              --database {{ db_name }} \
              --direction backward \
              --to-version {{ pre_migration_version.stdout }}
          delegate_to: "{{ db_host }}"
          run_once: true
          register: rollback

        - name: Report rollback status
          ansible.builtin.debug:
            msg: >
              Migration failed and was rolled back to version {{ pre_migration_version.stdout }}.
              Rollback output: {{ rollback.stdout }}
          run_once: true

        - name: Abort deployment
          ansible.builtin.fail:
            msg: "Database migration failed. Rolled back to {{ pre_migration_version.stdout }}. Deployment aborted."
          run_once: true
```

## Cross-Database Operations

Sometimes you need to coordinate operations across multiple databases:

```yaml
# cross-db-operations.yml - Operations spanning multiple databases
---
- name: Cross-database migration
  hosts: appservers
  vars:
    primary_db: db-primary.example.com
    analytics_db: analytics-db.example.com
  tasks:
    - name: Migrate primary database
      ansible.builtin.shell: |
        cd /opt/myapp && ./migrate.sh --database primary
      delegate_to: "{{ primary_db }}"
      run_once: true

    - name: Update analytics views after primary migration
      ansible.builtin.shell: |
        psql -U analytics -d analytics_db -f /opt/sql/refresh_materialized_views.sql
      delegate_to: "{{ analytics_db }}"
      run_once: true
      become: true
      become_user: postgres

    - name: Verify cross-database consistency
      ansible.builtin.shell: |
        psql -U myapp -d myapp_production -c "
          SELECT s.version as app_version
          FROM schema_version s
          ORDER BY s.applied_at DESC LIMIT 1;" -t
      register: db_version
      delegate_to: "{{ primary_db }}"
      run_once: true
      changed_when: false
```

## Summary

Delegating database operations in Ansible keeps your deployment playbooks cohesive while ensuring database tasks run from the right host, with the right credentials, exactly once. The key patterns are: use `run_once: true` to prevent duplicate migrations, delegate to the database server for direct access, create backups before migrations, implement rollback in `rescue` blocks, and verify the migration result before proceeding with application deployment. Whether you use PostgreSQL, MySQL, or any other database, the delegation pattern remains the same.
