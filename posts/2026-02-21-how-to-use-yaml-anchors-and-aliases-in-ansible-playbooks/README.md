# How to Use YAML Anchors and Aliases in Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, DRY, Configuration Management

Description: Learn how to use YAML anchors and aliases to reduce duplication in Ansible playbooks by reusing common task parameters and variable blocks.

---

YAML anchors and aliases are a native YAML feature that lets you define a block of content once and reference it multiple times throughout the same file. In Ansible playbooks, this is useful for eliminating repetitive task parameters, variable definitions, and configuration blocks. If you find yourself copying the same `become`, `environment`, or `vars` settings across dozens of tasks, anchors can clean that up significantly.

## YAML Anchor Basics

An anchor is defined with `&anchor_name` and referenced with `*anchor_name`. Here is the simplest possible example:

```yaml
# Basic YAML anchor and alias demonstration
# The & defines the anchor, the * references it

common_value: &my_anchor "this is the value"
reused_value: *my_anchor

# After YAML parsing, both keys have the value "this is the value"
```

For dictionaries (maps), you can merge anchored content with the `<<` merge key:

```yaml
# Dictionary merge with anchors
defaults: &default_settings
  timeout: 30
  retries: 3
  delay: 5

# The << merge key inserts all keys from the anchor
production:
  <<: *default_settings
  timeout: 60              # Override the timeout for production

development:
  <<: *default_settings
  retries: 1               # Override retries for development
```

After YAML parsing, `production` has `timeout: 60`, `retries: 3`, `delay: 5`. The explicitly set `timeout: 60` overrides the anchored value.

## Using Anchors in Ansible Playbooks

### Reusing Task Parameters

When multiple tasks share the same set of parameters, anchors eliminate the duplication:

```yaml
---
# deploy-app.yml
# Using anchors to share common task parameters

- hosts: webservers
  become: yes
  vars:
    # Define common file ownership settings once
    app_file_params: &app_file_params
      owner: webapp
      group: webapp
      mode: '0644'

    app_dir_params: &app_dir_params
      owner: webapp
      group: webapp
      mode: '0755'

  tasks:
    # Each file task reuses the anchored parameters
    - name: Create application directory
      file:
        path: /opt/webapp
        state: directory
        <<: *app_dir_params

    - name: Create log directory
      file:
        path: /opt/webapp/logs
        state: directory
        <<: *app_dir_params

    - name: Create config directory
      file:
        path: /opt/webapp/config
        state: directory
        <<: *app_dir_params

    - name: Deploy main configuration
      template:
        src: app.conf.j2
        dest: /opt/webapp/config/app.conf
        <<: *app_file_params

    - name: Deploy logging configuration
      template:
        src: logging.conf.j2
        dest: /opt/webapp/config/logging.conf
        <<: *app_file_params

    - name: Deploy database configuration
      template:
        src: database.conf.j2
        dest: /opt/webapp/config/database.conf
        <<: *app_file_params
```

### Reusing Environment Variables

When tasks need the same environment variables, anchor them:

```yaml
---
# build-and-deploy.yml
# Sharing environment variables across tasks with anchors

- hosts: build_servers
  vars:
    build_env: &build_env
      JAVA_HOME: /usr/lib/jvm/java-17
      MAVEN_HOME: /opt/maven
      PATH: "/opt/maven/bin:/usr/lib/jvm/java-17/bin:{{ ansible_env.PATH }}"
      BUILD_NUMBER: "{{ build_id }}"
      ARTIFACT_REPO: "https://artifacts.example.com"

  tasks:
    - name: Clean previous build
      command: mvn clean
      args:
        chdir: /opt/builds/myapp
      environment: *build_env

    - name: Compile application
      command: mvn compile
      args:
        chdir: /opt/builds/myapp
      environment: *build_env

    - name: Run unit tests
      command: mvn test
      args:
        chdir: /opt/builds/myapp
      environment: *build_env

    - name: Package application
      command: mvn package -DskipTests
      args:
        chdir: /opt/builds/myapp
      environment: *build_env
```

### Reusing Complex Variable Structures

Anchors are particularly useful in variable files with repetitive structures:

```yaml
---
# vars/services.yml
# Service definitions with shared defaults

service_defaults: &service_defaults
  restart_policy: always
  health_check_interval: 30
  health_check_timeout: 10
  log_driver: journald
  memory_limit: 512M

services:
  frontend:
    <<: *service_defaults
    port: 3000
    memory_limit: 256M     # Override the default memory limit
    image: myapp/frontend

  backend:
    <<: *service_defaults
    port: 8080
    memory_limit: 1G       # Backend needs more memory
    image: myapp/backend

  worker:
    <<: *service_defaults
    port: 0                 # Workers do not expose a port
    memory_limit: 2G
    image: myapp/worker

  scheduler:
    <<: *service_defaults
    image: myapp/scheduler
```

## Combining Multiple Anchors

You can merge content from multiple anchors into a single dictionary:

```yaml
---
# vars/database-configs.yml
# Combining multiple anchors for database configuration

connection_defaults: &connection_defaults
  pool_size: 10
  pool_timeout: 30
  pool_recycle: 3600

ssl_settings: &ssl_settings
  ssl_mode: verify-full
  ssl_ca: /etc/ssl/certs/db-ca.pem

logging_settings: &logging_settings
  slow_query_log: true
  slow_query_threshold: 1000
  log_queries: false

# Merge all three anchors into one configuration
database_config:
  <<: *connection_defaults
  <<: *ssl_settings       # Note: YAML spec only supports one merge key
  host: db.example.com
  port: 5432
```

Important caveat: the YAML specification technically only supports one `<<` merge key per mapping. While some YAML parsers (including PyYAML, which Ansible uses) handle multiple merge keys, the correct way to merge multiple anchors is to use a list:

```yaml
# Correct way to merge multiple anchors
database_config:
  <<:
    - *connection_defaults
    - *ssl_settings
    - *logging_settings
  host: db.example.com
  port: 5432
```

## Anchors in Task Lists

You can anchor entire task definitions for reuse (though this is less common):

```yaml
---
# health-checks.yml
# Reusable health check task pattern

- hosts: all
  vars:
    health_check_task: &health_check
      uri:
        url: "http://localhost:{{ app_port }}/health"
        return_content: yes
        status_code: 200
      register: health_result
      until: health_result.status == 200
      retries: 12
      delay: 5

  tasks:
    - name: Wait for application health check
      <<: *health_check
      vars:
        app_port: 8080

    - name: Wait for admin panel health check
      <<: *health_check
      vars:
        app_port: 9090
```

## Limitations to Be Aware Of

YAML anchors have some important limitations in Ansible:

**Anchors are file-scoped.** You cannot reference an anchor defined in one file from another file. This means anchors work within a single playbook or variable file, but not across `include_vars` or `vars_files` boundaries.

**Anchors are a YAML feature, not an Ansible feature.** Ansible does not know about anchors at all. By the time Ansible processes the YAML, the parser has already resolved all anchors and aliases into their final values. This means `ansible-lint` and other tools see the expanded version.

**Anchors cannot reference Jinja2 expressions.** Since anchors are processed by the YAML parser before Ansible's Jinja2 engine runs, you cannot use Jinja2 to generate anchor names or dynamically select which anchor to reference.

**Merge keys only work with dictionaries.** You cannot merge lists using the `<<` syntax. For list reuse, you would use Jinja2 concatenation instead.

## When to Use Anchors vs. Other DRY Techniques

| Technique | Best For | Scope |
|---|---|---|
| YAML anchors | Repeated parameters within a file | Single file |
| Roles | Reusable task bundles | Across playbooks |
| `include_tasks` | Shared task sequences | Across playbooks |
| Default variables | Shared variable values | Role-wide |
| Group variables | Shared host configuration | Inventory-wide |

## Wrapping Up

YAML anchors and aliases are a simple way to reduce repetition within a single playbook or variable file. They work best for shared task parameters (file ownership, environment variables, connection settings) and default configuration values that get overridden selectively. For cross-file reuse, lean on Ansible roles and includes instead. The key thing to remember is that anchors are resolved by the YAML parser before Ansible ever sees the data, so they are limited to the file they are defined in.
