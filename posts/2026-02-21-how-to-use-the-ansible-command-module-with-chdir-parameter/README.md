# How to Use the Ansible command Module with chdir Parameter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Command Module, Working Directory, Automation

Description: Learn how to use the chdir parameter in Ansible command and shell modules to set the working directory before executing commands on remote hosts.

---

Many commands need to run from a specific directory to work correctly. Think about building software from source, running npm commands in a project directory, or executing scripts that rely on relative paths. The `chdir` parameter in Ansible's `command` and `shell` modules sets the working directory before your command executes, so you do not have to chain `cd` commands or use absolute paths for everything.

## How chdir Works

The `chdir` parameter changes the current working directory to the specified path before running the command. It works the same as running `cd /some/path && your_command` in a shell, but it is cleaner and works with both the `command` and `shell` modules.

## Basic Usage

Here is the most common pattern: running build tools that expect to be in the project directory.

```yaml
# basic_chdir.yml - Run commands in specific directories
---
- name: Build and deploy application
  hosts: app_servers
  become: yes

  tasks:
    - name: Install Node.js dependencies
      ansible.builtin.command:
        cmd: npm install --production
        chdir: /opt/myapp

    - name: Build the application
      ansible.builtin.command:
        cmd: npm run build
        chdir: /opt/myapp

    - name: Run database migrations
      ansible.builtin.command:
        cmd: ./bin/migrate
        chdir: /opt/myapp
```

Without `chdir`, you would need absolute paths for everything, or you would be forced to use the `shell` module just to chain a `cd` command.

## Building Software from Source

Compiling software from source almost always requires being in the source directory.

```yaml
# build_from_source.yml - Compile software with chdir
---
- name: Build Redis from source
  hosts: all
  become: yes

  vars:
    redis_version: "7.2.4"

  tasks:
    - name: Download Redis source
      ansible.builtin.get_url:
        url: "https://download.redis.io/releases/redis-{{ redis_version }}.tar.gz"
        dest: "/tmp/redis-{{ redis_version }}.tar.gz"

    - name: Extract Redis source
      ansible.builtin.unarchive:
        src: "/tmp/redis-{{ redis_version }}.tar.gz"
        dest: /usr/local/src/
        remote_src: yes

    - name: Compile Redis
      ansible.builtin.command:
        cmd: make
        chdir: "/usr/local/src/redis-{{ redis_version }}"
        creates: "/usr/local/src/redis-{{ redis_version }}/src/redis-server"

    - name: Install Redis
      ansible.builtin.command:
        cmd: make install PREFIX=/opt/redis
        chdir: "/usr/local/src/redis-{{ redis_version }}"
        creates: /opt/redis/bin/redis-server
```

Notice how `chdir` pairs well with `creates` for idempotency. The compilation step only runs if the binary does not exist, and when it does run, it executes from the correct directory.

## Python and Virtual Environments

Python projects frequently need commands run from the project root.

```yaml
# python_project.yml - Python project management with chdir
---
- name: Set up Python application
  hosts: app_servers
  become: yes

  vars:
    app_dir: /opt/webapp
    venv_dir: /opt/webapp/venv

  tasks:
    - name: Create virtual environment
      ansible.builtin.command:
        cmd: python3 -m venv venv
        chdir: "{{ app_dir }}"
        creates: "{{ venv_dir }}/bin/activate"

    - name: Install Python dependencies
      ansible.builtin.command:
        cmd: "{{ venv_dir }}/bin/pip install -r requirements.txt"
        chdir: "{{ app_dir }}"

    - name: Run database migrations
      ansible.builtin.command:
        cmd: "{{ venv_dir }}/bin/python manage.py migrate"
        chdir: "{{ app_dir }}"

    - name: Collect static files
      ansible.builtin.command:
        cmd: "{{ venv_dir }}/bin/python manage.py collectstatic --noinput"
        chdir: "{{ app_dir }}"
      register: collectstatic
      changed_when: "'0 static files' not in collectstatic.stdout"
```

## Go Projects

Go modules and builds rely on the working directory for module resolution.

```yaml
# go_project.yml - Building Go applications
---
- name: Build Go microservices
  hosts: build_servers
  become: yes

  vars:
    services:
      - name: api-gateway
        path: /opt/src/api-gateway
      - name: auth-service
        path: /opt/src/auth-service
      - name: data-service
        path: /opt/src/data-service

  tasks:
    - name: Download Go dependencies
      ansible.builtin.command:
        cmd: go mod download
        chdir: "{{ item.path }}"
      loop: "{{ services }}"
      loop_control:
        label: "{{ item.name }}"
      environment:
        GOPATH: /opt/go
        GOPROXY: "https://proxy.golang.org,direct"

    - name: Build Go services
      ansible.builtin.command:
        cmd: "go build -o /usr/local/bin/{{ item.name }} ./cmd/{{ item.name }}"
        chdir: "{{ item.path }}"
        creates: "/usr/local/bin/{{ item.name }}"
      loop: "{{ services }}"
      loop_control:
        label: "{{ item.name }}"
      environment:
        GOPATH: /opt/go
        CGO_ENABLED: "0"

    - name: Run tests
      ansible.builtin.command:
        cmd: go test ./...
        chdir: "{{ item.path }}"
      loop: "{{ services }}"
      loop_control:
        label: "{{ item.name }}"
      environment:
        GOPATH: /opt/go
      register: test_results
      changed_when: false
```

## Git Operations

Git commands need to run inside the repository directory.

```yaml
# git_operations.yml - Git operations with chdir
---
- name: Manage Git repositories
  hosts: app_servers
  become: yes
  become_user: deploy

  tasks:
    - name: Check current Git branch
      ansible.builtin.command:
        cmd: git rev-parse --abbrev-ref HEAD
        chdir: /opt/myapp
      register: current_branch
      changed_when: false

    - name: Pull latest changes
      ansible.builtin.command:
        cmd: git pull origin main
        chdir: /opt/myapp
      when: current_branch.stdout == "main"
      register: git_pull
      changed_when: "'Already up to date' not in git_pull.stdout"

    - name: Get current commit hash
      ansible.builtin.command:
        cmd: git rev-parse --short HEAD
        chdir: /opt/myapp
      register: commit_hash
      changed_when: false

    - name: Show last 5 commits
      ansible.builtin.command:
        cmd: git log --oneline -5
        chdir: /opt/myapp
      register: recent_commits
      changed_when: false

    - name: Display deployment info
      ansible.builtin.debug:
        msg: "Deployed commit {{ commit_hash.stdout }} on branch {{ current_branch.stdout }}"
```

## Docker and Container Operations

Docker Compose commands rely on the docker-compose.yml location.

```yaml
# docker_operations.yml - Docker operations with chdir
---
- name: Docker Compose management
  hosts: docker_hosts
  become: yes

  tasks:
    - name: Pull latest images
      ansible.builtin.command:
        cmd: docker compose pull
        chdir: /opt/mystack

    - name: Start containers
      ansible.builtin.command:
        cmd: docker compose up -d
        chdir: /opt/mystack
      register: compose_up
      changed_when: "'Creating' in compose_up.stderr or 'Recreating' in compose_up.stderr"

    - name: Check container status
      ansible.builtin.command:
        cmd: docker compose ps
        chdir: /opt/mystack
      register: compose_status
      changed_when: false

    - name: Run database migrations inside container
      ansible.builtin.command:
        cmd: docker compose exec -T web python manage.py migrate
        chdir: /opt/mystack
      register: migrate_result
      changed_when: "'No migrations to apply' not in migrate_result.stdout"
```

## Using chdir with Shell Module

The `chdir` parameter works identically with the `shell` module.

```yaml
# chdir_with_shell.yml - chdir with shell module
---
- name: Shell module with chdir
  hosts: all
  become: yes

  tasks:
    - name: Build and package application
      ansible.builtin.shell:
        cmd: |
          set -e
          npm install
          npm run build
          tar czf /tmp/myapp-build.tar.gz dist/
        chdir: /opt/myapp
      register: build_result

    - name: Run tests and capture output
      ansible.builtin.shell:
        cmd: "npm test 2>&1 | tee /tmp/test-results.txt"
        chdir: /opt/myapp
      register: test_output
      changed_when: false
      failed_when: test_output.rc != 0
```

## Error Handling with Non-Existent Directories

If the `chdir` directory does not exist, the task fails immediately. Handle this gracefully.

```yaml
# chdir_safety.yml - Handle missing directories
---
- name: Safe chdir usage
  hosts: all
  become: yes

  tasks:
    - name: Check if project directory exists
      ansible.builtin.stat:
        path: /opt/myapp
      register: app_dir

    - name: Build application only if directory exists
      ansible.builtin.command:
        cmd: make build
        chdir: /opt/myapp
      when: app_dir.stat.exists and app_dir.stat.isdir

    - name: Create directory if missing, then run command
      block:
        - name: Ensure project directory exists
          ansible.builtin.file:
            path: /opt/myapp
            state: directory
            owner: deploy
            group: deploy

        - name: Clone and build
          ansible.builtin.command:
            cmd: git clone https://github.com/example/myapp.git .
            chdir: /opt/myapp
            creates: /opt/myapp/.git
```

## Summary

The `chdir` parameter is essential for commands that depend on running from a specific directory. It is cleaner than chaining `cd` commands, works with both `command` and `shell` modules, and pairs well with `creates` for idempotency. Use it for build tools, package managers, git operations, Docker Compose commands, and any script that uses relative paths. If the directory might not exist, check with the `stat` module first or use `block` with an `ansible.builtin.file` task to ensure it is created before your command runs.
