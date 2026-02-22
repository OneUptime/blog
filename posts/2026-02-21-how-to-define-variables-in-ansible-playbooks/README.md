# How to Define Variables in Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Playbooks, DevOps

Description: Learn every way to define variables in Ansible playbooks including inline vars, var files, extra vars, inventory vars, and registered variables.

---

Variables are the foundation of reusable Ansible playbooks. Without them, you would be hardcoding values everywhere and maintaining separate playbooks for each environment. Ansible gives you many places to define variables, each with its own scope and precedence. In this post, I will cover every method for defining variables in playbooks, explain when to use each one, and show practical examples.

## Method 1: Inline vars in a Play

The most straightforward way to define variables is directly in the play:

```yaml
---
# inline-vars.yml
# Variables defined under the vars keyword are scoped to this play

- hosts: webservers
  become: yes
  vars:
    app_name: mywebapp
    app_port: 8080
    app_user: webapp
    max_connections: 150
    log_level: info
    app_directory: "/opt/{{ app_name }}"

  tasks:
    - name: Create application directory
      file:
        path: "{{ app_directory }}"
        state: directory
        owner: "{{ app_user }}"
        mode: '0755'

    - name: Show configuration
      debug:
        msg: "{{ app_name }} will listen on port {{ app_port }} with {{ max_connections }} max connections"
```

Variables can reference other variables, as shown with `app_directory` referencing `app_name`.

## Method 2: vars_files

When your variable list grows large or you want to share variables across playbooks, move them to separate files:

```yaml
---
# deploy.yml
# Load variables from external files

- hosts: webservers
  become: yes
  vars_files:
    - vars/common.yml
    - vars/database.yml
    - "vars/{{ environment_name }}.yml"

  tasks:
    - name: Deploy application
      debug:
        msg: "Deploying {{ app_name }} to {{ environment_name }}"
```

```yaml
# vars/common.yml
# Shared variables used across all environments
app_name: mywebapp
app_user: webapp
app_group: webapp
log_directory: /var/log/mywebapp
pid_file: /var/run/mywebapp.pid
```

```yaml
# vars/production.yml
# Production-specific variable overrides
app_port: 80
log_level: warn
max_connections: 500
debug_mode: false
database_host: db-primary.internal
database_pool_size: 25
```

```yaml
# vars/staging.yml
# Staging environment variables
app_port: 8080
log_level: debug
max_connections: 50
debug_mode: true
database_host: db-staging.internal
database_pool_size: 5
```

## Method 3: Extra Variables (Command Line)

Pass variables at runtime using `-e` or `--extra-vars`:

```bash
# Pass a single variable
ansible-playbook deploy.yml -e "deploy_version=2.5.0"

# Pass multiple variables
ansible-playbook deploy.yml -e "deploy_version=2.5.0 environment_name=production"

# Pass variables as JSON
ansible-playbook deploy.yml -e '{"deploy_version": "2.5.0", "rollback": false}'

# Load variables from a file
ansible-playbook deploy.yml -e "@vars/release-2.5.0.yml"
```

Extra variables have the highest precedence in Ansible, which means they override variables defined anywhere else. This makes them ideal for one-off overrides during deployment.

## Method 4: Task-Level vars

Variables can be defined at the task level, where they only apply to that specific task:

```yaml
---
# task-vars.yml
# Task-level variables override play-level variables for that task only

- hosts: webservers
  vars:
    http_port: 80

  tasks:
    - name: Configure main site on standard port
      template:
        src: site.conf.j2
        dest: /etc/nginx/sites-available/main.conf
      # This task uses the play-level http_port (80)

    - name: Configure admin site on a different port
      template:
        src: site.conf.j2
        dest: /etc/nginx/sites-available/admin.conf
      vars:
        http_port: 9090    # Only this task sees http_port as 9090
```

## Method 5: Block-Level vars

Similar to task-level vars, but applied to all tasks in a block:

```yaml
---
# block-vars.yml
# Variables scoped to a block of tasks

- hosts: webservers
  become: yes
  tasks:
    - name: Setup frontend application
      block:
        - name: Create frontend directory
          file:
            path: "{{ app_dir }}"
            state: directory

        - name: Deploy frontend config
          template:
            src: app.conf.j2
            dest: "{{ app_dir }}/config.yml"
      vars:
        app_dir: /opt/frontend
        app_port: 3000

    - name: Setup backend application
      block:
        - name: Create backend directory
          file:
            path: "{{ app_dir }}"
            state: directory

        - name: Deploy backend config
          template:
            src: app.conf.j2
            dest: "{{ app_dir }}/config.yml"
      vars:
        app_dir: /opt/backend
        app_port: 8080
```

## Method 6: include_vars Module

Dynamically load variables during playbook execution:

```yaml
---
# dynamic-vars.yml
# Load variable files based on conditions

- hosts: all
  become: yes
  tasks:
    # Load variables matching the OS family
    - name: Load OS-specific variables
      include_vars:
        file: "vars/{{ ansible_os_family }}.yml"

    # Load all variable files from a directory
    - name: Load all application variable files
      include_vars:
        dir: vars/apps/
        extensions:
          - yml
          - yaml

    # Load variables with a name prefix to avoid collisions
    - name: Load monitoring variables with prefix
      include_vars:
        file: vars/monitoring.yml
        name: monitoring

    - name: Show monitoring variable
      debug:
        msg: "Monitoring port: {{ monitoring.port }}"
```

## Method 7: Registered Variables

Capture the output of a task into a variable for use in later tasks:

```yaml
---
# registered-vars.yml
# Store task output in variables for later use

- hosts: webservers
  tasks:
    - name: Check if application is installed
      stat:
        path: /opt/myapp/bin/myapp
      register: app_binary

    - name: Get current application version
      command: /opt/myapp/bin/myapp --version
      register: app_version_output
      when: app_binary.stat.exists
      changed_when: false

    - name: Display current version
      debug:
        msg: "Current version: {{ app_version_output.stdout }}"
      when: app_version_output is defined and app_version_output.rc == 0

    - name: Install application if not present
      include_tasks: install-app.yml
      when: not app_binary.stat.exists
```

## Method 8: set_fact for Dynamic Variables

Create new variables dynamically based on other values:

```yaml
---
# dynamic-facts.yml
# Create variables dynamically during playbook execution

- hosts: webservers
  vars:
    base_port: 8000

  tasks:
    - name: Calculate application port based on host index
      set_fact:
        app_port: "{{ base_port | int + groups['webservers'].index(inventory_hostname) }}"

    - name: Build the full application URL
      set_fact:
        app_url: "http://{{ ansible_default_ipv4.address }}:{{ app_port }}"

    - name: Show computed values
      debug:
        msg: "This host will use {{ app_url }}"
```

## Variable Data Types

Ansible supports several data types for variables:

```yaml
# vars/datatypes.yml
# Examples of all supported variable data types

# Strings
app_name: "mywebapp"
description: 'Single quotes work too'
multiline_string: |
  This is a multiline
  string that preserves
  line breaks.

# Numbers (integers and floats)
max_connections: 100
timeout_seconds: 30.5

# Booleans
debug_mode: true
enable_ssl: false
# Also valid: yes/no, True/False, on/off

# Lists
packages:
  - nginx
  - python3
  - curl
  - jq

# Inline list syntax
ports: [80, 443, 8080]

# Dictionaries (maps)
database:
  host: db.example.com
  port: 5432
  name: myapp_production
  user: myapp

# Nested structures
services:
  frontend:
    port: 3000
    workers: 4
    packages:
      - nodejs
      - npm
  backend:
    port: 8080
    workers: 8
    packages:
      - python3
      - gunicorn
```

Access these variables in tasks:

```yaml
tasks:
  # Access a simple variable
  - debug:
      msg: "App: {{ app_name }}"

  # Access a dictionary value
  - debug:
      msg: "DB host: {{ database.host }}"

  # Alternate dictionary access syntax
  - debug:
      msg: "DB port: {{ database['port'] }}"

  # Access a list item by index
  - debug:
      msg: "First package: {{ packages[0] }}"

  # Access nested structures
  - debug:
      msg: "Frontend port: {{ services.frontend.port }}"

  # Loop over a list
  - apt:
      name: "{{ item }}"
      state: present
    loop: "{{ packages }}"
```

## Practical Example: Complete Application Deployment

Here is a playbook that uses most of these variable definition methods together:

```yaml
---
# full-deploy.yml
# Demonstrates multiple variable definition methods working together

- hosts: webservers
  become: yes

  # Play-level variables
  vars:
    app_name: mywebapp
    app_user: webapp

  # External variable files
  vars_files:
    - vars/common.yml
    - "vars/{{ env | default('development') }}.yml"

  pre_tasks:
    # Dynamic variable loading
    - name: Load OS-specific package names
      include_vars:
        file: "vars/os/{{ ansible_os_family }}.yml"

    # Registered variable
    - name: Check for existing installation
      stat:
        path: /opt/{{ app_name }}
      register: existing_install

    # Dynamic variable creation
    - name: Set deployment timestamp
      set_fact:
        deploy_timestamp: "{{ ansible_date_time.iso8601_basic_short }}"

  tasks:
    - name: Show deployment info
      debug:
        msg: >
          Deploying {{ app_name }} version {{ deploy_version | default('latest') }}
          at {{ deploy_timestamp }}
          Fresh install: {{ not existing_install.stat.exists }}
```

## Wrapping Up

Ansible gives you a lot of flexibility in where and how you define variables. For small playbooks, inline `vars` is perfectly fine. As your project grows, move to `vars_files` and split by environment or component. Use `extra-vars` for runtime overrides in CI/CD pipelines. Use `register` and `set_fact` when you need to capture or compute values during execution. The key is understanding that each definition method has a different precedence level and scope, which I cover in detail in my post on [Ansible variable precedence rules](https://oneuptime.com/blog/post/2026-02-21-how-to-use-ansible-variable-precedence-rules/view).
