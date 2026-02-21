# How to Use Ansible to Run SQL Commands on Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SQL, Database Administration, PostgreSQL, MySQL

Description: Learn how to execute SQL commands on PostgreSQL, MySQL, and other databases using Ansible modules and command-line tools for database management.

---

Database management is a core part of infrastructure automation. Whether you need to create databases, run migrations, execute queries, or perform maintenance, Ansible gives you several ways to run SQL commands on remote database servers. You can use dedicated database modules for common operations or fall back to the `command` and `shell` modules for raw SQL execution.

## Dedicated Database Modules

Ansible ships with modules specifically built for database operations. These are always the preferred approach because they handle idempotency and error reporting properly.

### PostgreSQL Operations

```yaml
# postgres_modules.yml - PostgreSQL management with dedicated modules
---
- name: PostgreSQL management
  hosts: db_servers
  become: yes
  become_user: postgres

  tasks:
    - name: Create a database
      community.postgresql.postgresql_db:
        name: myapp_production
        encoding: UTF-8
        lc_collate: en_US.UTF-8
        lc_ctype: en_US.UTF-8
        state: present

    - name: Create a database user
      community.postgresql.postgresql_user:
        name: myapp
        password: "{{ vault_db_password }}"
        state: present
      no_log: true

    - name: Grant privileges
      community.postgresql.postgresql_privs:
        database: myapp_production
        type: database
        roles: myapp
        privs: ALL
        state: present

    - name: Run a SQL query
      community.postgresql.postgresql_query:
        db: myapp_production
        query: "SELECT count(*) as total FROM users"
      register: user_count

    - name: Show query result
      ansible.builtin.debug:
        msg: "Total users: {{ user_count.query_result[0].total }}"
```

### MySQL Operations

```yaml
# mysql_modules.yml - MySQL management with dedicated modules
---
- name: MySQL management
  hosts: db_servers
  become: yes

  tasks:
    - name: Create a database
      community.mysql.mysql_db:
        name: myapp_production
        encoding: utf8mb4
        collation: utf8mb4_unicode_ci
        state: present
        login_user: root
        login_password: "{{ vault_mysql_root_password }}"

    - name: Create a database user
      community.mysql.mysql_user:
        name: myapp
        password: "{{ vault_mysql_app_password }}"
        priv: 'myapp_production.*:ALL'
        host: '%'
        state: present
        login_user: root
        login_password: "{{ vault_mysql_root_password }}"
      no_log: true

    - name: Run a SQL query
      community.mysql.mysql_query:
        login_db: myapp_production
        login_user: myapp
        login_password: "{{ vault_mysql_app_password }}"
        query: "SELECT COUNT(*) as total FROM orders WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)"
      register: recent_orders

    - name: Show result
      ansible.builtin.debug:
        msg: "Orders in last 24h: {{ recent_orders.query_result[0][0].total }}"
```

## Running Raw SQL with Command Module

When dedicated modules do not cover your use case, use command-line database clients.

### PostgreSQL with psql

```yaml
# raw_psql.yml - Run SQL with psql command
---
- name: Run raw SQL on PostgreSQL
  hosts: db_servers
  become: yes
  become_user: postgres

  tasks:
    - name: Run a single SQL statement
      ansible.builtin.command:
        cmd: psql -d myapp_production -c "SELECT version();"
      register: pg_version
      changed_when: false

    - name: Run multiple SQL statements
      ansible.builtin.shell:
        cmd: |
          psql -d myapp_production << 'SQL'
          BEGIN;
          CREATE TABLE IF NOT EXISTS audit_log (
            id SERIAL PRIMARY KEY,
            action VARCHAR(100) NOT NULL,
            performed_by VARCHAR(100),
            performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
          CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(performed_at);
          COMMIT;
          SQL
      register: create_table
      changed_when: "'CREATE TABLE' in create_table.stderr or 'CREATE INDEX' in create_table.stderr"

    - name: Run SQL from a file
      ansible.builtin.command:
        cmd: "psql -d myapp_production -f /opt/myapp/sql/migrations/001_create_tables.sql"
      register: migration
      changed_when: "'CREATE' in migration.stderr or 'ALTER' in migration.stderr"

    - name: Run query and get CSV output
      ansible.builtin.shell:
        cmd: |
          psql -d myapp_production -t -A -F',' -c "
            SELECT username, email, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 10
          "
      register: user_csv
      changed_when: false

    - name: Display query results
      ansible.builtin.debug:
        msg: "{{ user_csv.stdout_lines }}"
```

### MySQL with mysql Client

```yaml
# raw_mysql.yml - Run SQL with mysql command
---
- name: Run raw SQL on MySQL
  hosts: db_servers
  become: yes

  tasks:
    - name: Run a single query
      ansible.builtin.shell:
        cmd: "mysql -u myapp -p'{{ vault_mysql_password }}' myapp_production -e 'SHOW TABLES;'"
      register: tables
      changed_when: false
      no_log: true

    - name: Run a multi-line SQL script
      ansible.builtin.shell:
        cmd: |
          mysql -u myapp -p'{{ vault_mysql_password }}' myapp_production << 'SQL'
          CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(64) PRIMARY KEY,
            user_id INT NOT NULL,
            data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            INDEX idx_sessions_user (user_id),
            INDEX idx_sessions_expiry (expires_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
          SQL
      register: create_session_table
      changed_when: "'Query OK' in create_session_table.stdout"
      no_log: true

    - name: Import SQL dump
      ansible.builtin.shell:
        cmd: "mysql -u root -p'{{ vault_mysql_root_password }}' myapp_production < /backup/myapp_latest.sql"
      register: import_result
      no_log: true
```

## Running Database Migrations

Automate migration execution across your database fleet.

```yaml
# run_migrations.yml - Database migration workflow
---
- name: Run database migrations
  hosts: db_servers
  become: yes
  become_user: postgres

  vars:
    migration_dir: /opt/myapp/sql/migrations
    database: myapp_production

  tasks:
    - name: Ensure migrations tracking table exists
      ansible.builtin.shell:
        cmd: |
          psql -d {{ database }} -c "
            CREATE TABLE IF NOT EXISTS schema_migrations (
              version VARCHAR(255) PRIMARY KEY,
              applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          "
      changed_when: false

    - name: Get list of applied migrations
      ansible.builtin.shell:
        cmd: "psql -d {{ database }} -t -A -c 'SELECT version FROM schema_migrations ORDER BY version;'"
      register: applied_migrations
      changed_when: false

    - name: Find all migration files
      ansible.builtin.find:
        paths: "{{ migration_dir }}"
        patterns: "*.sql"
      register: migration_files

    - name: Apply pending migrations
      ansible.builtin.shell:
        cmd: |
          VERSION="{{ item.path | basename | splitext | first }}"
          if ! psql -d {{ database }} -t -A -c "SELECT 1 FROM schema_migrations WHERE version='${VERSION}';" | grep -q 1; then
            echo "Applying migration: ${VERSION}"
            psql -d {{ database }} -f "{{ item.path }}"
            psql -d {{ database }} -c "INSERT INTO schema_migrations (version) VALUES ('${VERSION}');"
            echo "APPLIED"
          else
            echo "SKIP: ${VERSION} already applied"
          fi
      loop: "{{ migration_files.files | sort(attribute='path') }}"
      loop_control:
        label: "{{ item.path | basename }}"
      register: migration_results
      changed_when: "'APPLIED' in item.stdout | default('')"
```

## Database Backup and Restore with SQL

Backup and restore operations using SQL tools.

```yaml
# backup_restore.yml - SQL backup and restore operations
---
- name: Database backup and restore
  hosts: db_servers
  become: yes
  become_user: postgres

  tasks:
    - name: Full PostgreSQL backup with pg_dump
      ansible.builtin.shell:
        cmd: |
          BACKUP_FILE="/backup/myapp_$(date +%Y%m%d_%H%M%S).sql.gz"
          pg_dump -Fc myapp_production > "${BACKUP_FILE}"
          echo "Backup saved: ${BACKUP_FILE}"
          ls -lh "${BACKUP_FILE}"
      register: backup_result

    - name: Backup specific tables
      ansible.builtin.shell:
        cmd: |
          pg_dump -d myapp_production \
            --table=users \
            --table=orders \
            --table=products \
            | gzip > /backup/core_tables_$(date +%Y%m%d).sql.gz
      register: table_backup

    - name: Backup schema only (no data)
      ansible.builtin.command:
        cmd: "pg_dump -d myapp_production --schema-only -f /backup/schema_$(date +%Y%m%d).sql"

    - name: Restore from backup
      ansible.builtin.shell:
        cmd: |
          pg_restore -d myapp_staging --clean --if-exists /backup/myapp_latest.dump
      register: restore_result
      failed_when:
        - restore_result.rc != 0
        - "'errors ignored' not in restore_result.stderr"
```

## Database Maintenance Queries

Run regular maintenance SQL commands.

```yaml
# maintenance.yml - Database maintenance operations
---
- name: Database maintenance
  hosts: db_servers
  become: yes
  become_user: postgres

  tasks:
    - name: Run VACUUM ANALYZE on PostgreSQL
      ansible.builtin.command:
        cmd: psql -d myapp_production -c "VACUUM ANALYZE;"
      changed_when: true

    - name: Check table sizes
      ansible.builtin.shell:
        cmd: |
          psql -d myapp_production -c "
            SELECT
              schemaname || '.' || tablename AS table,
              pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
              pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS data_size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
            LIMIT 10;
          "
      register: table_sizes
      changed_when: false

    - name: Show table sizes
      ansible.builtin.debug:
        msg: "{{ table_sizes.stdout }}"

    - name: Check for long-running queries
      ansible.builtin.shell:
        cmd: |
          psql -d myapp_production -c "
            SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
            FROM pg_stat_activity
            WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
            AND state != 'idle'
            ORDER BY duration DESC;
          "
      register: long_queries
      changed_when: false

    - name: Kill long-running queries if needed
      ansible.builtin.shell:
        cmd: |
          psql -d myapp_production -c "
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE (now() - pg_stat_activity.query_start) > interval '30 minutes'
            AND state != 'idle'
            AND pid != pg_backend_pid();
          "
      register: killed_queries
      changed_when: "'t' in killed_queries.stdout"

    - name: Check replication status
      ansible.builtin.shell:
        cmd: |
          psql -c "
            SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn
            FROM pg_stat_replication;
          "
      register: replication_status
      changed_when: false
      failed_when: false
```

## SQL with Connection Strings

Use environment variables for database connections to keep credentials secure.

```yaml
# connection_strings.yml - Use connection strings for SQL execution
---
- name: SQL execution with connection strings
  hosts: app_servers
  become: yes

  tasks:
    - name: Run migration with connection string
      ansible.builtin.command:
        cmd: "psql '{{ vault_database_url }}' -c 'SELECT 1;'"
      register: db_test
      changed_when: false
      no_log: true

    - name: Run SQL with environment-based credentials
      ansible.builtin.shell:
        cmd: |
          psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "
            SELECT count(*) FROM information_schema.tables
            WHERE table_schema = 'public';
          "
      environment:
        PGHOST: "{{ db_host }}"
        PGPORT: "{{ db_port | default('5432') }}"
        PGUSER: "{{ db_user }}"
        PGPASSWORD: "{{ vault_db_password }}"
        PGDATABASE: "{{ db_name }}"
      register: table_count
      changed_when: false
      no_log: true
```

## Handling SQL Output

Parse and use SQL query results in subsequent Ansible tasks.

```yaml
# parse_sql_output.yml - Parse SQL query results
---
- name: Parse and use SQL output
  hosts: db_servers
  become: yes
  become_user: postgres

  tasks:
    - name: Get database statistics as JSON
      ansible.builtin.shell:
        cmd: |
          psql -d myapp_production -t -A -c "
            SELECT json_agg(row_to_json(t)) FROM (
              SELECT datname, numbackends, xact_commit, xact_rollback,
                     blks_read, blks_hit, tup_returned, tup_fetched
              FROM pg_stat_database
              WHERE datname = 'myapp_production'
            ) t;
          "
      register: db_stats_json
      changed_when: false

    - name: Parse JSON stats
      ansible.builtin.set_fact:
        db_stats: "{{ db_stats_json.stdout | from_json }}"
      when: db_stats_json.stdout | trim | length > 2

    - name: Display parsed stats
      ansible.builtin.debug:
        msg: |
          Active connections: {{ db_stats[0].numbackends }}
          Commits: {{ db_stats[0].xact_commit }}
          Rollbacks: {{ db_stats[0].xact_rollback }}
          Cache hit ratio: {{ ((db_stats[0].blks_hit | float) / ((db_stats[0].blks_hit | float) + (db_stats[0].blks_read | float) + 0.0001) * 100) | round(2) }}%
      when: db_stats is defined
```

## Summary

Running SQL commands in Ansible ranges from using dedicated database modules (the cleanest approach) to raw SQL execution via `psql`, `mysql`, and other command-line clients. Dedicated modules like `community.postgresql.postgresql_query` and `community.mysql.mysql_query` handle idempotency and connection management automatically. For raw SQL, use the `command` module for simple queries and `shell` for here-documents and pipes. Always use `no_log: true` when commands contain passwords, store credentials in Ansible Vault, and use environment variables like `PGPASSWORD` instead of embedding passwords in command strings. For structured output, use JSON formatting in your SQL queries and parse results with Ansible's `from_json` filter.
