# How to Use Ansible to Run Commands with Specific Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Environment Variables, Configuration, DevOps

Description: Learn how to set and manage environment variables when running commands in Ansible using the environment keyword at play, block, and task levels.

---

Environment variables control how programs behave. Database connection strings, API keys, proxy settings, language configurations, and path modifications all rely on environment variables. Ansible provides the `environment` keyword to set these variables precisely when and where you need them, without permanently modifying the remote system's environment.

## The environment Keyword

Ansible's `environment` keyword accepts a dictionary of key-value pairs. These variables are set in the shell environment for that specific task. They do not persist after the task completes, and they do not affect other tasks unless you set `environment` on those tasks too.

```yaml
# basic_env.yml - Setting environment variables on tasks
---
- name: Basic environment variable usage
  hosts: all
  become: yes

  tasks:
    - name: Run application with database configuration
      ansible.builtin.command:
        cmd: /opt/myapp/bin/migrate
      environment:
        DATABASE_URL: "postgres://myapp:secret@db.example.com:5432/myapp_prod"
        RAILS_ENV: production
        LOG_LEVEL: info

    - name: Verify environment variables were set
      ansible.builtin.shell:
        cmd: "echo DB=$DATABASE_URL ENV=$RAILS_ENV"
      environment:
        DATABASE_URL: "postgres://myapp:secret@db.example.com:5432/myapp_prod"
        RAILS_ENV: production
      register: env_check
      changed_when: false

    - name: Show the environment
      ansible.builtin.debug:
        msg: "{{ env_check.stdout }}"
```

## Play-Level Environment Variables

Set environment variables for all tasks in a play by placing `environment` at the play level.

```yaml
# play_level_env.yml - Environment variables for all tasks in a play
---
- name: Deploy application with shared environment
  hosts: app_servers
  become: yes
  environment:
    NODE_ENV: production
    PORT: "8080"
    DATABASE_URL: "{{ vault_database_url }}"
    REDIS_URL: "redis://redis.example.com:6379/0"
    LOG_LEVEL: warn

  tasks:
    - name: Install dependencies
      ansible.builtin.command:
        cmd: npm install --production
        chdir: /opt/myapp
      become_user: deploy

    - name: Run database migrations
      ansible.builtin.command:
        cmd: npx knex migrate:latest
        chdir: /opt/myapp
      become_user: deploy

    - name: Build the application
      ansible.builtin.command:
        cmd: npm run build
        chdir: /opt/myapp
      become_user: deploy

    - name: Start the application
      ansible.builtin.command:
        cmd: npm start
        chdir: /opt/myapp
      become_user: deploy
      async: 0
      poll: 0
```

All four tasks inherit the same environment variables. Any task can add more variables or override the play-level ones.

## Task-Level Override of Play-Level Environment

Task-level `environment` merges with (and overrides) play-level settings.

```yaml
# override_env.yml - Override play-level env at the task level
---
- name: Mixed environment configurations
  hosts: all
  become: yes
  environment:
    APP_ENV: production
    LOG_LEVEL: warn

  tasks:
    - name: Normal production task
      ansible.builtin.command:
        cmd: /opt/myapp/bin/process-jobs
      # Inherits APP_ENV=production and LOG_LEVEL=warn

    - name: Debug task with verbose logging
      ansible.builtin.command:
        cmd: /opt/myapp/bin/diagnose
      environment:
        LOG_LEVEL: debug
        DEBUG: "true"
      # APP_ENV is still production, but LOG_LEVEL is now debug
      # DEBUG is added as a new variable
```

## Using Variables in Environment

Environment values can reference Ansible variables, facts, and vault-encrypted values.

```yaml
# dynamic_env.yml - Dynamic environment variable values
---
- name: Dynamic environment variables
  hosts: all
  become: yes

  vars:
    app_port: 8080
    app_host: "0.0.0.0"
    db_host: "{{ groups['db_servers'][0] }}"
    db_port: 5432

  vars_files:
    - vars/vault_secrets.yml

  tasks:
    - name: Run application with dynamic environment
      ansible.builtin.command:
        cmd: /opt/myapp/bin/server
      environment:
        APP_PORT: "{{ app_port }}"
        APP_HOST: "{{ app_host }}"
        DATABASE_HOST: "{{ db_host }}"
        DATABASE_PORT: "{{ db_port }}"
        DATABASE_PASSWORD: "{{ vault_db_password }}"
        SERVER_NAME: "{{ inventory_hostname }}"
        INSTANCE_ID: "{{ ansible_hostname }}"
        OS_FAMILY: "{{ ansible_os_family }}"
      no_log: true  # Hide vault secrets from output
```

## Proxy Configuration

Setting proxy environment variables is one of the most common use cases.

```yaml
# proxy_env.yml - Configure proxy for commands that need internet access
---
- name: Package installation through proxy
  hosts: all
  become: yes

  vars:
    proxy_url: "http://proxy.corp.example.com:3128"
    no_proxy_hosts: "localhost,127.0.0.1,.corp.example.com,10.0.0.0/8"

  tasks:
    - name: Update package cache through proxy
      ansible.builtin.apt:
        update_cache: yes
      environment:
        http_proxy: "{{ proxy_url }}"
        https_proxy: "{{ proxy_url }}"
        HTTP_PROXY: "{{ proxy_url }}"
        HTTPS_PROXY: "{{ proxy_url }}"
        no_proxy: "{{ no_proxy_hosts }}"
        NO_PROXY: "{{ no_proxy_hosts }}"

    - name: Install packages through proxy
      ansible.builtin.apt:
        name:
          - curl
          - wget
          - git
        state: present
      environment:
        http_proxy: "{{ proxy_url }}"
        https_proxy: "{{ proxy_url }}"
        no_proxy: "{{ no_proxy_hosts }}"

    - name: Download file through proxy
      ansible.builtin.get_url:
        url: https://example.com/myapp.tar.gz
        dest: /tmp/myapp.tar.gz
      environment:
        https_proxy: "{{ proxy_url }}"
```

## Environment for Build Tools

Build tools like Go, Java, and Rust rely heavily on environment variables.

```yaml
# build_env.yml - Build tool environment configuration
---
- name: Build applications with tool-specific environments
  hosts: build_servers
  become: yes

  tasks:
    - name: Build Go application
      ansible.builtin.command:
        cmd: "go build -o /usr/local/bin/myservice ./cmd/myservice"
        chdir: /opt/src/myservice
      environment:
        GOPATH: /opt/go
        GOROOT: /usr/local/go
        CGO_ENABLED: "0"
        GOOS: linux
        GOARCH: amd64
        GOPROXY: "https://proxy.golang.org,direct"
        PATH: "/usr/local/go/bin:/opt/go/bin:{{ ansible_env.PATH }}"

    - name: Build Java application with Maven
      ansible.builtin.command:
        cmd: mvn clean package -DskipTests
        chdir: /opt/src/java-service
      environment:
        JAVA_HOME: /usr/lib/jvm/java-17-openjdk-amd64
        MAVEN_HOME: /opt/maven
        MAVEN_OPTS: "-Xmx2g -XX:MaxMetaspaceSize=512m"
        PATH: "/opt/maven/bin:/usr/lib/jvm/java-17-openjdk-amd64/bin:{{ ansible_env.PATH }}"

    - name: Build Rust application
      ansible.builtin.command:
        cmd: cargo build --release
        chdir: /opt/src/rust-service
      environment:
        CARGO_HOME: /opt/cargo
        RUSTUP_HOME: /opt/rustup
        PATH: "/opt/cargo/bin:{{ ansible_env.PATH }}"
```

## Block-Level Environment

Set environment variables for a group of tasks using `block`.

```yaml
# block_env.yml - Environment variables for task blocks
---
- name: Block-level environment
  hosts: all
  become: yes

  tasks:
    - name: Database migration tasks
      block:
        - name: Check pending migrations
          ansible.builtin.command:
            cmd: /opt/myapp/bin/migrate status
          register: migration_status
          changed_when: false

        - name: Apply migrations
          ansible.builtin.command:
            cmd: /opt/myapp/bin/migrate up
          when: "'pending' in migration_status.stdout"

        - name: Verify migration
          ansible.builtin.command:
            cmd: /opt/myapp/bin/migrate verify
          changed_when: false
      become_user: deploy
      environment:
        DATABASE_URL: "{{ vault_database_url }}"
        MIGRATION_DIR: /opt/myapp/migrations
        LOG_LEVEL: info

    - name: Cache warming tasks
      block:
        - name: Warm user cache
          ansible.builtin.command:
            cmd: /opt/myapp/bin/warm-cache users

        - name: Warm product cache
          ansible.builtin.command:
            cmd: /opt/myapp/bin/warm-cache products
      become_user: deploy
      environment:
        REDIS_URL: "redis://redis.example.com:6379/0"
        CACHE_TTL: "3600"
```

## Environment from External Files

Load environment variables from a file or an external source.

```yaml
# external_env.yml - Load environment from external sources
---
- name: Load environment from files
  hosts: all
  become: yes

  vars:
    # Load env vars from a YAML file
    app_env: "{{ lookup('file', 'env/production.yml') | from_yaml }}"

  tasks:
    - name: Run application with externally loaded environment
      ansible.builtin.command:
        cmd: /opt/myapp/bin/server
      environment: "{{ app_env }}"

    - name: Merge multiple environment sources
      ansible.builtin.command:
        cmd: /opt/myapp/bin/worker
      environment: "{{ common_env | combine(app_specific_env) }}"
      vars:
        common_env:
          LOG_LEVEL: info
          TZ: UTC
        app_specific_env:
          WORKER_THREADS: "4"
          QUEUE_NAME: default
```

## PATH Manipulation

Extending the PATH is a frequent need, especially for custom-installed tools.

```yaml
# path_manipulation.yml - Extending PATH for commands
---
- name: PATH manipulation
  hosts: all
  become: yes

  tasks:
    - name: Use custom-installed tools
      ansible.builtin.command:
        cmd: node --version
      environment:
        PATH: "/opt/node/bin:{{ ansible_env.PATH }}"
      register: node_version
      changed_when: false

    - name: Multiple custom paths
      ansible.builtin.shell:
        cmd: "which go && which node && which python3"
      environment:
        PATH: "/usr/local/go/bin:/opt/node/bin:/opt/python/bin:{{ ansible_env.PATH }}"
      register: tool_paths
      changed_when: false
```

The `ansible_env.PATH` variable contains the current PATH from the remote system. Prepending your custom paths ensures they take priority.

## Summary

Environment variables in Ansible are set using the `environment` keyword at the play, block, or task level. Play-level settings apply to all tasks, while task-level settings override or extend them. Use variables and vault-encrypted values for sensitive data like database passwords and API keys. Always use `no_log: true` when environment variables contain secrets. For build tools, proxy configuration, and application runtime settings, the `environment` keyword gives you precise control over what each command sees without permanently modifying the remote system's configuration.
