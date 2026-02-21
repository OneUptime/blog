# How to Use Multiline Shell Commands in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Shell Commands, YAML, Automation

Description: Learn different approaches for writing multiline shell commands in Ansible playbooks using YAML literal blocks, folded blocks, and other techniques.

---

Writing multiline shell commands in Ansible is something you will run into frequently. Maybe you need a small script inline, or you have a complex pipeline that is unreadable on a single line. YAML gives you several ways to handle this, and picking the right one makes your playbooks much easier to read and maintain.

## YAML Block Scalars Refresher

Before getting into Ansible specifics, let's review how YAML handles multiline strings. There are two block scalar styles that matter:

- **Literal block** (`|`) preserves newlines exactly as written
- **Folded block** (`>`) folds newlines into spaces (joins lines)

Both can have "chomping" indicators:
- `|` or `>` keeps a trailing newline
- `|-` or `>-` strips the trailing newline
- `|+` or `>+` keeps all trailing newlines

## Method 1: Literal Block (|) - The Most Common

The literal block scalar is the go-to for multiline shell commands because it preserves each line as a separate command.

```yaml
# literal_block.yml - Using the literal block scalar for multiline commands
---
- name: Multiline shell commands with literal block
  hosts: all
  become: yes

  tasks:
    - name: Run multiple commands as a script
      ansible.builtin.shell: |
        echo "Starting deployment"
        cd /opt/myapp
        git pull origin main
        npm install --production
        npm run build
        systemctl restart myapp
        echo "Deployment complete"
      register: deploy_result

    - name: Show output
      ansible.builtin.debug:
        msg: "{{ deploy_result.stdout_lines }}"
```

Each line is sent to the shell as a separate command. If any line fails (returns non-zero), the shell continues with the next line by default.

## Method 2: Literal Block with set -e

Add `set -e` at the top to stop on the first error, which is usually what you want.

```yaml
# literal_block_strict.yml - Stop on first error with set -e
---
- name: Multiline commands with strict error handling
  hosts: all
  become: yes

  tasks:
    - name: Deploy with error checking
      ansible.builtin.shell: |
        set -e
        echo "Checking prerequisites..."
        test -d /opt/myapp || { echo "App directory missing"; exit 1; }
        cd /opt/myapp
        echo "Pulling latest code..."
        git pull origin main
        echo "Installing dependencies..."
        npm install --production
        echo "Building application..."
        npm run build
        echo "Restarting service..."
        systemctl restart myapp
        echo "Verifying service..."
        sleep 5
        systemctl is-active myapp
      register: deploy_result
      changed_when: true
```

With `set -e`, the script stops at the first non-zero return code, and Ansible reports the task as failed.

## Method 3: Literal Block with cmd Parameter

You can also use the `cmd` parameter with the block scalar for a cleaner structure.

```yaml
# cmd_parameter.yml - Using cmd parameter with multiline
---
- name: Multiline with cmd parameter
  hosts: all
  become: yes

  tasks:
    - name: Database backup with multiple steps
      ansible.builtin.shell:
        cmd: |
          set -e
          BACKUP_DIR="/backup/$(date +%Y%m%d)"
          mkdir -p "$BACKUP_DIR"
          pg_dump -U postgres mydb > "$BACKUP_DIR/mydb.sql"
          gzip "$BACKUP_DIR/mydb.sql"
          find /backup -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true
          echo "Backup saved to $BACKUP_DIR"
        chdir: /tmp
      register: backup_result
      changed_when: true
```

## Method 4: Folded Block (>) - Joining Lines

The folded block joins lines into a single command. This is useful when you have a very long single command that you want to break across multiple lines for readability.

```yaml
# folded_block.yml - Using folded block for long single commands
---
- name: Long single commands with folded block
  hosts: all
  become: yes

  tasks:
    - name: Long find command broken across lines
      ansible.builtin.shell: >
        find /var/log
        -name "*.log"
        -mtime +30
        -type f
        -exec gzip {} \;
        -print
      register: compressed_logs
      changed_when: compressed_logs.stdout_lines | length > 0

    - name: Long curl command
      ansible.builtin.shell: >
        curl -s
        -X POST
        -H "Content-Type: application/json"
        -H "Authorization: Bearer {{ api_token }}"
        -d '{"status": "deployed", "version": "{{ app_version }}"}'
        https://api.example.com/deployments
      register: api_response
      changed_when: false
```

The folded block turns all those lines into one long line. Blank lines within a folded block do create actual newlines, which can be confusing, so stick to the literal block for actual multi-command scripts.

## Method 5: Backslash Line Continuation

You can use backslashes for line continuation inside a literal block, just like you would in a regular shell script.

```yaml
# backslash_continuation.yml - Using backslash line continuation
---
- name: Backslash line continuation
  hosts: all
  become: yes

  tasks:
    - name: Long pipeline with backslash continuation
      ansible.builtin.shell: |
        cat /var/log/nginx/access.log \
          | awk '{print $1}' \
          | sort \
          | uniq -c \
          | sort -rn \
          | head -20
      register: top_ips
      changed_when: false

    - name: Complex docker command
      ansible.builtin.shell: |
        docker run -d \
          --name myapp \
          --restart unless-stopped \
          -p 8080:8080 \
          -v /opt/myapp/data:/data \
          -v /opt/myapp/config:/config:ro \
          -e DATABASE_URL="{{ db_url }}" \
          -e REDIS_URL="{{ redis_url }}" \
          -e LOG_LEVEL=info \
          myapp:{{ app_version | default('latest') }}
      register: container_result
      changed_when: "'already in use' not in container_result.stderr"
      failed_when:
        - container_result.rc != 0
        - "'already in use' not in container_result.stderr"
```

## Method 6: Combining with Loops and Conditionals

Multiline shell commands work well with Ansible loops and conditionals.

```yaml
# multiline_with_loops.yml - Multiline shell in loops
---
- name: Multiline shell with loops
  hosts: all
  become: yes

  vars:
    databases:
      - name: users_db
        port: 5432
      - name: orders_db
        port: 5433

  tasks:
    - name: Backup each database
      ansible.builtin.shell: |
        set -e
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="/backup/{{ item.name }}_${TIMESTAMP}.sql.gz"
        echo "Backing up {{ item.name }} on port {{ item.port }}..."
        pg_dump -p {{ item.port }} {{ item.name }} | gzip > "${BACKUP_FILE}"
        echo "Backup saved: ${BACKUP_FILE}"
        ls -lh "${BACKUP_FILE}"
      loop: "{{ databases }}"
      loop_control:
        label: "{{ item.name }}"
      register: backup_results

    - name: Show backup results
      ansible.builtin.debug:
        msg: "{{ item.stdout_lines }}"
      loop: "{{ backup_results.results }}"
      loop_control:
        label: "{{ item.item.name }}"
```

## Method 7: Here Documents in Shell Commands

You can use heredocs inside shell blocks for creating files or passing multi-line input.

```yaml
# heredoc_in_shell.yml - Using heredocs within shell module
---
- name: Heredoc usage in shell module
  hosts: all
  become: yes

  tasks:
    - name: Create a config file using heredoc
      ansible.builtin.shell: |
        cat > /etc/myapp/config.ini << 'HEREDOC'
        [database]
        host = {{ db_host | default('localhost') }}
        port = {{ db_port | default(5432) }}
        name = {{ db_name | default('myapp') }}

        [logging]
        level = info
        file = /var/log/myapp/app.log
        HEREDOC
        chmod 644 /etc/myapp/config.ini
      args:
        creates: /etc/myapp/config.ini
```

## Method 8: Functions in Multiline Shell

For more complex logic, define shell functions within your block.

```yaml
# functions_in_shell.yml - Defining functions in multiline shell
---
- name: Shell functions in multiline blocks
  hosts: all
  become: yes

  tasks:
    - name: Health check with retry logic using functions
      ansible.builtin.shell: |
        check_service() {
          local service=$1
          local max_retries=$2
          local count=0
          while [ $count -lt $max_retries ]; do
            if systemctl is-active --quiet "$service"; then
              echo "$service is running"
              return 0
            fi
            count=$((count + 1))
            echo "Waiting for $service... attempt $count of $max_retries"
            sleep 5
          done
          echo "$service failed to start after $max_retries attempts"
          return 1
        }

        check_service nginx 6
        check_service postgresql 6
        check_service redis 6
      executable: /bin/bash
      register: health_check
      changed_when: false

    - name: Display health check results
      ansible.builtin.debug:
        msg: "{{ health_check.stdout_lines }}"
```

## Common Pitfalls

Watch out for these common issues with multiline shell commands.

```yaml
# pitfalls.yml - Common mistakes and how to avoid them
---
- name: Common multiline pitfalls
  hosts: localhost
  connection: local

  tasks:
    # WRONG - Folded block joins these into one command
    # "echo hello echo world" is not what you want
    # - name: Wrong - using folded for multiple commands
    #   ansible.builtin.shell: >
    #     echo hello
    #     echo world

    # RIGHT - Use literal block for multiple commands
    - name: Correct - using literal for multiple commands
      ansible.builtin.shell: |
        echo hello
        echo world

    # WRONG - Indentation inconsistency breaks YAML
    # Make sure all lines in the block have the same base indentation

    # RIGHT - Consistent indentation
    - name: Consistent indentation in block
      ansible.builtin.shell: |
        if [ -f /tmp/test ]; then
          echo "file exists"
          cat /tmp/test
        else
          echo "file missing"
        fi
```

## Summary

For multiline shell commands in Ansible, the literal block (`|`) is your best friend for multi-command scripts. Use `>` (folded block) only when you want to break a single long command across multiple lines for readability. Always add `set -e` at the top of multi-command scripts to fail fast on errors. Use `|-` when you need to strip the trailing newline, and combine with `executable: /bin/bash` when you need bash-specific features like arrays, process substitution, or extended globbing. These patterns cover the vast majority of multiline shell use cases in Ansible playbooks.
