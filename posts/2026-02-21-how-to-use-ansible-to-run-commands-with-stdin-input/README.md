# How to Use Ansible to Run Commands with stdin Input

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, stdin, Command Execution, Automation

Description: Learn how to pass stdin input to commands in Ansible using the shell module, expect module, and stdin parameter.

---

Some commands need input on stdin to function. Think of password prompts, interactive tools like `mysql` that read SQL from stdin, or utilities that accept data from pipes. Since Ansible runs non-interactively, you have to get creative about feeding input to these commands.

This post walks through the different ways to provide stdin data to commands in Ansible, from simple piping with the shell module to the `stdin` parameter in the command module and the `expect` module for truly interactive programs.

## Using the stdin Parameter

Starting with Ansible 2.4, the `command` and `shell` modules support a `stdin` parameter. This is the cleanest way to pass input to a command:

```yaml
# pass a SQL query via stdin to the mysql command
---
- name: Database operations via stdin
  hosts: db_servers
  tasks:
    - name: Run SQL query through stdin
      ansible.builtin.command:
        cmd: mysql -u admin -p{{ db_password }} mydb
        stdin: "SELECT COUNT(*) AS total_users FROM users WHERE active = 1;"
      register: query_result
      changed_when: false
      no_log: true  # hide the password from logs

    - name: Show query result
      ansible.builtin.debug:
        var: query_result.stdout_lines
```

The `stdin` parameter can also handle multi-line input:

```yaml
# pass multi-line SQL via stdin
- name: Run multiple SQL statements
  ansible.builtin.command:
    cmd: psql -U postgres -d myapp
    stdin: |
      BEGIN;
      UPDATE settings SET value = 'true' WHERE key = 'maintenance_mode';
      INSERT INTO audit_log (action, timestamp) VALUES ('maintenance_enabled', NOW());
      COMMIT;
  register: sql_result
  become: true
  become_user: postgres
```

## Using the stdin_add_newline Parameter

By default, Ansible appends a newline to the stdin data. Some programs are sensitive to this. You can control it with `stdin_add_newline`:

```yaml
# control whether a trailing newline is added to stdin
- name: Send exact input without trailing newline
  ansible.builtin.command:
    cmd: /opt/tools/checksum_validator
    stdin: "abc123def456"
    stdin_add_newline: false
  register: validation

- name: Send input with trailing newline (default behavior)
  ansible.builtin.command:
    cmd: /opt/tools/line_processor
    stdin: "process this line"
    stdin_add_newline: true  # this is the default
  register: processed
```

## Piping Input with the shell Module

The shell module lets you use standard shell piping to feed data to commands:

```yaml
# pipe data to commands using shell module
---
- name: Piping examples
  hosts: all
  tasks:
    # Pipe a password to chpasswd for user password changes
    - name: Set user password via stdin pipe
      ansible.builtin.shell:
        cmd: "echo '{{ username }}:{{ new_password }}' | chpasswd"
      become: true
      no_log: true
      vars:
        username: deploy
        new_password: "{{ vault_deploy_password }}"

    # Pipe JSON to jq for processing
    - name: Process JSON data through jq
      ansible.builtin.shell:
        cmd: "echo '{{ api_response | to_json }}' | jq '.results[] | .name'"
      register: parsed_names
      changed_when: false
      vars:
        api_response:
          results:
            - name: server1
              status: active
            - name: server2
              status: inactive

    # Pipe content to a command that reads from stdin
    - name: Import GPG key from stdin
      ansible.builtin.shell:
        cmd: "curl -fsSL https://packages.example.com/gpg.key | gpg --import"
      become: true
```

## Using Here Documents with the shell Module

For longer inputs, here documents work well in the shell module:

```yaml
# use a here document to pass multi-line input
- name: Create database schema via here document
  ansible.builtin.shell:
    cmd: |
      psql -U postgres -d myapp << 'EOSQL'
      CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(50) NOT NULL,
          payload JSONB,
          created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
      EOSQL
    executable: /bin/bash
  become: true
  become_user: postgres
```

## The expect Module for Interactive Commands

Some commands are truly interactive and need different responses at different prompts. The `expect` module handles this using Python's pexpect library:

```yaml
# handle interactive prompts with the expect module
---
- name: Interactive command handling
  hosts: all
  tasks:
    - name: Ensure pexpect is installed
      ansible.builtin.pip:
        name: pexpect
        state: present
      become: true

    - name: Initialize application with interactive setup
      ansible.builtin.expect:
        command: /opt/myapp/bin/setup --init
        responses:
          "Enter database host:": "db.internal"
          "Enter database port:": "5432"
          "Enter database name:": "myapp_production"
          "Enter admin email:": "admin@example.com"
          "Confirm settings\\? \\(yes/no\\)": "yes"
        timeout: 30
      no_log: true
```

The `responses` dictionary maps regex patterns to the answers Ansible should type when it sees that prompt. The patterns are regular expressions, so special characters need escaping.

Here is a more complex example with password changes:

```yaml
# change a system password using expect
- name: Change user password interactively
  ansible.builtin.expect:
    command: passwd {{ username }}
    responses:
      "New password:": "{{ new_password }}"
      "Retype new password:": "{{ new_password }}"
      "passwd: password updated successfully": ""
  become: true
  no_log: true
  vars:
    username: appuser
    new_password: "{{ vault_app_password }}"
```

## Feeding Files as stdin

You can redirect file contents to a command as stdin input:

```yaml
# feed file contents as stdin to commands
---
- name: File as stdin examples
  hosts: db_servers
  tasks:
    # Deploy SQL file first, then execute it via stdin redirect
    - name: Copy SQL migration file
      ansible.builtin.copy:
        src: migrations/001_create_tables.sql
        dest: /tmp/migration.sql
        mode: '0644'

    - name: Execute SQL file via stdin redirect
      ansible.builtin.shell:
        cmd: "mysql -u admin -p{{ db_password }} mydb < /tmp/migration.sql"
      no_log: true

    # Alternative: pipe file contents to a command
    - name: Import data file
      ansible.builtin.shell:
        cmd: "cat /tmp/data_export.csv | python3 /opt/scripts/import_data.py --format csv"
      register: import_result

    - name: Clean up temporary files
      ansible.builtin.file:
        path: "{{ item }}"
        state: absent
      loop:
        - /tmp/migration.sql
```

## Using stdin with Variables and Templates

You can dynamically generate stdin content using Ansible variables and Jinja2:

```yaml
# generate stdin input dynamically from variables
---
- name: Dynamic stdin generation
  hosts: app_servers
  vars:
    app_config:
      database:
        host: db.internal
        port: 5432
        name: production
      cache:
        host: redis.internal
        port: 6379
      features:
        - user_auth
        - api_v2
        - webhooks
  tasks:
    - name: Feed YAML config to validator via stdin
      ansible.builtin.command:
        cmd: python3 /opt/tools/validate_config.py
        stdin: "{{ app_config | to_nice_yaml }}"
      register: validation
      changed_when: false

    - name: Feed JSON config to setup tool via stdin
      ansible.builtin.command:
        cmd: /opt/myapp/bin/configure --stdin --format json
        stdin: "{{ app_config | to_json }}"
      register: setup_result
```

## Handling Passwords Safely with stdin

One of the most common uses of stdin in Ansible is passing passwords to commands without them appearing in process lists:

```yaml
# pass passwords safely via stdin instead of command line arguments
---
- name: Secure password handling
  hosts: all
  tasks:
    # BAD: password visible in process list with ps aux
    # - name: Login (insecure)
    #   command: myapp-cli login --password {{ secret }}

    # GOOD: password passed via stdin, not visible in ps
    - name: Login securely via stdin
      ansible.builtin.command:
        cmd: myapp-cli login --password-stdin
        stdin: "{{ vault_app_secret }}"
      no_log: true
      register: login_result

    # Docker login is a real-world example of this pattern
    - name: Docker registry login via stdin
      ansible.builtin.command:
        cmd: docker login registry.example.com -u {{ docker_user }} --password-stdin
        stdin: "{{ vault_docker_password }}"
      no_log: true
      changed_when: "'Login Succeeded' in login_result.stdout"
      register: login_result
```

## Handling Commands That Expect EOF

Some commands read all of stdin until EOF before processing. The `command` module with `stdin` handles this naturally since it closes the input after writing:

```yaml
# commands that read until EOF work naturally with the stdin parameter
- name: Process all input until EOF
  ansible.builtin.command:
    cmd: sort -u
    stdin: |
      banana
      apple
      cherry
      apple
      banana
      date
  register: sorted_output
  changed_when: false

- name: Show sorted unique output
  ansible.builtin.debug:
    var: sorted_output.stdout_lines
```

## A Practical Example: Automated Database Setup

Here is a complete playbook that ties several stdin techniques together for setting up a database:

```yaml
# complete database setup using various stdin techniques
---
- name: Set up PostgreSQL database
  hosts: db_servers
  become: true
  become_user: postgres
  vars:
    db_name: myapp
    db_user: myapp_svc
    db_password: "{{ vault_db_password }}"
  tasks:
    - name: Create database
      ansible.builtin.command:
        cmd: createdb {{ db_name }}
      register: create_db
      failed_when: create_db.rc != 0 and 'already exists' not in create_db.stderr
      changed_when: create_db.rc == 0

    - name: Create database user with password via stdin
      ansible.builtin.command:
        cmd: psql -d {{ db_name }}
        stdin: |
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '{{ db_user }}') THEN
              CREATE ROLE {{ db_user }} WITH LOGIN PASSWORD '{{ db_password }}';
            END IF;
          END
          $$;
          GRANT ALL PRIVILEGES ON DATABASE {{ db_name }} TO {{ db_user }};
      no_log: true

    - name: Load schema via stdin
      ansible.builtin.command:
        cmd: psql -d {{ db_name }}
        stdin: |
          CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              email VARCHAR(255) UNIQUE NOT NULL,
              name VARCHAR(255),
              created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS sessions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id INTEGER REFERENCES users(id),
              expires_at TIMESTAMP NOT NULL
          );
```

## Summary

Passing stdin input to commands in Ansible is handled through several mechanisms. The `stdin` parameter on `command` and `shell` modules is the cleanest approach for non-interactive input. Shell piping and here documents work well for more complex scenarios. The `expect` module handles truly interactive programs with multiple prompts. Always use `no_log: true` when stdin contains sensitive data like passwords, and prefer the `stdin` parameter over command-line arguments for secrets to keep them out of process lists.
