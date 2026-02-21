# How to Use the Ansible copy Module with Content Parameter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Configuration Management, DevOps

Description: Learn how to use the Ansible copy module content parameter to write inline text and dynamic variables directly to files on remote hosts.

---

Most people know the Ansible `copy` module for transferring files from the control node to remote hosts. But there is another way to use it: the `content` parameter. Instead of copying a file, you write the content directly in your playbook or from a variable. This is incredibly useful for small configuration files, environment variable files, and dynamically generated content.

This post covers all the practical ways to use the `content` parameter, when to choose it over `template`, and how to avoid the common pitfalls.

## Basic Content Parameter Usage

Instead of `src`, use `content` to specify what goes into the file:

```yaml
# Write a simple string to a file on the remote host
- name: Create a basic config file
  ansible.builtin.copy:
    content: "ENVIRONMENT=production\nDEBUG=false\nLOG_LEVEL=warn\n"
    dest: /etc/myapp/env
    owner: myapp
    group: myapp
    mode: "0644"
```

This creates a file at `/etc/myapp/env` with three lines. Note the explicit `\n` newline characters in the string. Without them, everything would be on one line.

## Using YAML Multiline Strings

For readability, use YAML multiline string syntax instead of embedding `\n` characters:

```yaml
# Write multiline content using the YAML literal block scalar
- name: Create environment file
  ansible.builtin.copy:
    content: |
      # Application Environment Configuration
      ENVIRONMENT=production
      DEBUG=false
      LOG_LEVEL=warn
      MAX_CONNECTIONS=100
      BIND_ADDRESS=0.0.0.0
      PORT=8080
    dest: /etc/myapp/env
    owner: myapp
    group: myapp
    mode: "0644"
```

The `|` (pipe) character starts a literal block scalar in YAML, which preserves newlines. Each indented line below it becomes a line in the file. There is also the `>` (greater-than) character, which folds newlines into spaces, but for configuration files you almost always want `|`.

If you do not want a trailing newline at the end of the file, use `|-` instead:

```yaml
# Write content without a trailing newline
- name: Create a file without trailing newline
  ansible.builtin.copy:
    content: |-
      Line one
      Line two
      Line three
    dest: /tmp/no-trailing-newline.txt
```

## Writing Variable Values to Files

The `content` parameter can include Jinja2 variables:

```yaml
# Write a variable value to a file
- name: Write database connection string to file
  ansible.builtin.copy:
    content: "{{ db_connection_string }}"
    dest: /etc/myapp/db_url
    owner: myapp
    group: myapp
    mode: "0600"
  no_log: true
```

For more complex content with multiple variables:

```yaml
# Generate an environment file from variables
- name: Create application environment file
  ansible.builtin.copy:
    content: |
      DB_HOST={{ db_host }}
      DB_PORT={{ db_port }}
      DB_NAME={{ db_name }}
      DB_USER={{ db_user }}
      DB_PASSWORD={{ db_password }}
      REDIS_URL=redis://{{ redis_host }}:{{ redis_port }}/0
      SECRET_KEY={{ app_secret_key }}
    dest: /etc/myapp/.env
    owner: myapp
    group: myapp
    mode: "0600"
  no_log: true
```

## Creating JSON Configuration Files

You can write JSON files using the `to_nice_json` filter:

```yaml
# Write a JSON configuration file from a dictionary variable
- name: Create application JSON config
  ansible.builtin.copy:
    content: "{{ app_config | to_nice_json }}\n"
    dest: /etc/myapp/config.json
    owner: myapp
    group: myapp
    mode: "0644"
  vars:
    app_config:
      database:
        host: "{{ db_host }}"
        port: 5432
        name: myapp_db
      cache:
        backend: redis
        host: "{{ redis_host }}"
        port: 6379
      logging:
        level: info
        file: /var/log/myapp/app.log
```

The `to_nice_json` filter converts the dictionary to a formatted JSON string. Adding `\n` at the end ensures the file ends with a newline, which is a good practice for text files.

## Creating YAML Configuration Files

Similarly, you can write YAML files:

```yaml
# Write a YAML configuration file from a dictionary
- name: Create application YAML config
  ansible.builtin.copy:
    content: "{{ app_config | to_nice_yaml }}\n"
    dest: /etc/myapp/config.yml
    owner: myapp
    group: myapp
    mode: "0644"
  vars:
    app_config:
      server:
        bind: "0.0.0.0"
        port: 8080
        workers: 4
      database:
        url: "postgresql://{{ db_host }}/myapp"
        pool_size: 10
```

## Writing SSH Keys and Certificates

The `content` parameter is perfect for deploying key material from vault-encrypted variables:

```yaml
# Deploy an SSH private key from a vault variable
- name: Write SSH deploy key
  ansible.builtin.copy:
    content: "{{ vault_deploy_ssh_key }}"
    dest: /home/deploy/.ssh/id_ed25519
    owner: deploy
    group: deploy
    mode: "0600"
  no_log: true

# Deploy an SSL certificate
- name: Write SSL certificate
  ansible.builtin.copy:
    content: "{{ vault_ssl_certificate }}"
    dest: /etc/ssl/certs/myapp.crt
    owner: root
    group: root
    mode: "0644"

# Deploy SSL private key
- name: Write SSL private key
  ansible.builtin.copy:
    content: "{{ vault_ssl_private_key }}"
    dest: /etc/ssl/private/myapp.key
    owner: root
    group: ssl-cert
    mode: "0640"
  no_log: true
```

## Creating systemd Unit Files

For simple service definitions, the content parameter saves you from creating a separate template file:

```yaml
# Create a systemd service file inline
- name: Create systemd service for myapp
  ansible.builtin.copy:
    content: |
      [Unit]
      Description=My Application
      After=network.target postgresql.service
      Requires=postgresql.service

      [Service]
      Type=simple
      User=myapp
      Group=myapp
      WorkingDirectory=/opt/myapp/current
      ExecStart=/opt/myapp/current/bin/myapp serve
      ExecReload=/bin/kill -HUP $MAINPID
      Restart=on-failure
      RestartSec=5
      StandardOutput=journal
      StandardError=journal

      [Install]
      WantedBy=multi-user.target
    dest: /etc/systemd/system/myapp.service
    owner: root
    group: root
    mode: "0644"
  notify:
    - Reload systemd
    - Restart myapp
```

## Content vs Template: When to Use Which

Use `content` when:
- The file is short (under 20-30 lines)
- The logic is simple (just variable substitution, no conditionals or loops)
- You do not want to maintain a separate template file

Use `template` when:
- The file is long or complex
- You need Jinja2 logic (if/else, for loops, macros)
- The file format benefits from being visible as a standalone file

```yaml
# Good use of content - short, simple, inline
- name: Create health check endpoint response
  ansible.builtin.copy:
    content: '{"status": "ok", "version": "{{ app_version }}"}'
    dest: /var/www/health.json
    mode: "0644"

# Better as a template - complex with conditionals
# Use template module with a .j2 file for this instead
```

## Writing Binary Content

While `content` is primarily for text, you can write base64-encoded content:

```yaml
# Write content that was base64 encoded
- name: Write favicon from base64 content
  ansible.builtin.copy:
    content: "{{ favicon_b64 | b64decode }}"
    dest: /var/www/favicon.ico
    mode: "0644"
```

This is rarely needed, though. For binary files, use `src` instead.

## Creating Flag Files and Lock Files

A simple use case is creating empty or minimal flag files:

```yaml
# Create a deployment marker file
- name: Write deployment marker
  ansible.builtin.copy:
    content: |
      deployed_at: {{ ansible_date_time.iso8601 }}
      version: {{ app_version }}
      deployed_by: {{ ansible_user_id }}
      commit: {{ git_commit_hash }}
    dest: /opt/myapp/current/DEPLOYMENT_INFO
    owner: myapp
    group: myapp
    mode: "0644"

# Create a simple lock file
- name: Create maintenance mode flag
  ansible.builtin.copy:
    content: "maintenance"
    dest: /opt/myapp/shared/maintenance.flag
    owner: myapp
    group: myapp
    mode: "0644"
  when: enable_maintenance | default(false)
```

## Idempotency with Content

The `copy` module with `content` is fully idempotent. Ansible computes a checksum of the content and compares it to the existing file. If they match and the permissions and ownership are the same, the task reports "ok" without making any changes:

```yaml
# This task will only report "changed" on the first run
- name: Write static content
  ansible.builtin.copy:
    content: |
      This file is managed by Ansible.
      Do not edit manually.
    dest: /etc/myapp/managed-notice.txt
    mode: "0644"
```

However, if your content includes dynamic values like timestamps, the file will be rewritten every time:

```yaml
# WARNING: This will always report "changed" because the timestamp changes
- name: Write deployment info (always changes)
  ansible.builtin.copy:
    content: "Last deployed: {{ ansible_date_time.iso8601 }}\n"
    dest: /opt/myapp/last_deploy.txt
    mode: "0644"
```

## Summary

The `content` parameter of the Ansible `copy` module lets you write file contents directly from your playbook without maintaining separate source files. It is ideal for short configuration files, environment variables, flag files, and deploying secrets from vault-encrypted variables. Use YAML multiline syntax (`|`) for readable inline content, remember to set proper permissions and ownership, and add `no_log: true` when the content contains sensitive data. For longer or more complex files, switch to the `template` module with a separate Jinja2 file.
