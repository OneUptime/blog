# How to Use the mandatory Filter in Ansible Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Validation, Jinja2, DevOps

Description: Learn how to use the Ansible mandatory filter to enforce that critical variables are defined before playbook execution proceeds.

---

While the `default` filter provides fallback values for optional variables, some variables should never have a default. A database password, a deployment version, or a target environment name are examples of values that must be explicitly provided. If someone forgets to set them, the playbook should fail immediately with a clear error message rather than proceeding with a wrong or empty value. The `mandatory` filter does exactly this.

## Basic Usage

The `mandatory` filter checks if a variable is defined and has a value. If the variable is undefined, empty, or None, it raises an immediate error:

```yaml
---
# mandatory-basic.yml
# Ensure required variables are provided before proceeding

- hosts: webservers
  become: yes
  vars:
    # These might come from group_vars, host_vars, or extra-vars
    deploy_version: "{{ deploy_version | mandatory }}"
    target_environment: "{{ target_environment | mandatory }}"

  tasks:
    - name: Deploy version {{ deploy_version }} to {{ target_environment }}
      debug:
        msg: "Starting deployment"
```

If you run this without providing `deploy_version`:

```bash
ansible-playbook mandatory-basic.yml
```

You get:

```
TASK [Deploy version  to ] ***
fatal: [web01]: FAILED! => {"msg": "Mandatory variable 'deploy_version' not defined."}
```

## Using mandatory in Role Defaults

The most common place to use `mandatory` is in a role's `defaults/main.yml` to mark variables that users must provide:

```yaml
# roles/database_backup/defaults/main.yml
# Variables that the user MUST provide (no sensible default exists)

# The S3 bucket where backups will be stored - required
backup_s3_bucket: "{{ backup_s3_bucket | mandatory }}"

# AWS region for the S3 bucket - required
backup_aws_region: "{{ backup_aws_region | mandatory }}"

# Database name to back up - required
backup_database_name: "{{ backup_database_name | mandatory }}"

# Variables that have sensible defaults
backup_retention_days: 30
backup_schedule: "0 2 * * *"
backup_compression: gzip
backup_notify_email: ""
```

When someone uses this role without providing the required variables:

```yaml
---
# This will fail with a clear error because mandatory vars are missing
- hosts: databases
  roles:
    - database_backup
```

But this works:

```yaml
---
# This works because all mandatory variables are provided
- hosts: databases
  roles:
    - role: database_backup
      vars:
        backup_s3_bucket: my-db-backups
        backup_aws_region: us-east-1
        backup_database_name: production_app
```

## Combining mandatory with Custom Error Messages

The `mandatory` filter accepts a custom error message:

```yaml
---
# custom-error-messages.yml
# Use custom error messages to tell users exactly what they need to provide

- hosts: webservers
  vars:
    db_host: "{{ database_host | mandatory('You must provide database_host. Set it in group_vars or pass via -e database_host=hostname') }}"
    db_password: "{{ database_password | mandatory('database_password is required. Use ansible-vault or pass via -e') }}"
    deploy_env: "{{ environment_name | mandatory('Specify the target environment: -e environment_name=production|staging|development') }}"

  tasks:
    - name: Connect to database
      debug:
        msg: "Connecting to {{ db_host }} as {{ deploy_env }}"
```

Now the error message tells the user exactly what they need to do to fix it.

## Using assert as an Alternative

For more complex validation logic, use the `assert` module:

```yaml
---
# assert-validation.yml
# Validate variables with detailed conditions and error messages

- hosts: webservers
  pre_tasks:
    # Validate all required variables at the start of the play
    - name: Validate required deployment variables
      assert:
        that:
          - deploy_version is defined
          - deploy_version | length > 0
          - deploy_version is match('^[0-9]+\.[0-9]+\.[0-9]+$')
        fail_msg: |
          deploy_version must be a valid semver string (e.g., 2.5.0).
          Current value: {{ deploy_version | default('NOT DEFINED') }}
          Pass it with: -e deploy_version=X.Y.Z

    - name: Validate environment variable
      assert:
        that:
          - target_env is defined
          - target_env in ['development', 'staging', 'production']
        fail_msg: |
          target_env must be one of: development, staging, production.
          Current value: {{ target_env | default('NOT DEFINED') }}

    - name: Validate numeric constraints
      assert:
        that:
          - app_port is defined
          - app_port | int > 0
          - app_port | int < 65536
        fail_msg: |
          app_port must be a valid port number (1-65535).
          Current value: {{ app_port | default('NOT DEFINED') }}
```

## Validating Complex Variable Structures

When you need variables to have specific structures:

```yaml
---
# validate-structures.yml
# Validate that variable structures are correct before using them

- hosts: webservers
  pre_tasks:
    # Ensure a list variable is provided and has items
    - name: Validate allowed_origins list
      assert:
        that:
          - allowed_origins is defined
          - allowed_origins is iterable
          - allowed_origins is not string
          - allowed_origins | length > 0
        fail_msg: "allowed_origins must be a non-empty list of domain names"

    # Ensure a dictionary has required keys
    - name: Validate database configuration dictionary
      assert:
        that:
          - database_config is defined
          - database_config is mapping
          - "'host' in database_config"
          - "'port' in database_config"
          - "'name' in database_config"
          - "'user' in database_config"
          - database_config.port | int > 0
        fail_msg: |
          database_config must be a dictionary with keys: host, port, name, user
          Current value: {{ database_config | default('NOT DEFINED') }}

    # Validate SSL configuration when SSL is enabled
    - name: Validate SSL configuration
      assert:
        that:
          - ssl_certificate_path is defined
          - ssl_certificate_path | length > 0
          - ssl_private_key_path is defined
          - ssl_private_key_path | length > 0
        fail_msg: |
          When ssl_enabled is true, you must provide:
            ssl_certificate_path: path to the SSL certificate
            ssl_private_key_path: path to the private key
      when: ssl_enabled | default(false) | bool
```

## Creating a Reusable Validation Role

For large projects, centralize variable validation in a role:

```yaml
# roles/validate_inputs/tasks/main.yml
# Reusable validation role that checks all required variables

- name: Validate core deployment variables
  assert:
    that:
      - deploy_version is defined and deploy_version | length > 0
      - target_environment is defined
      - target_environment in valid_environments
    fail_msg: "Core deployment variables are missing or invalid"
  vars:
    valid_environments: ['dev', 'staging', 'prod']

- name: Validate application configuration
  assert:
    that:
      - app_name is defined
      - app_port is defined
      - app_port | int > 0
    fail_msg: "Application configuration is incomplete"

- name: Validate secrets are present
  assert:
    that:
      - db_password is defined
      - db_password | length >= 12
      - api_key is defined
      - api_key | length > 0
    fail_msg: "Required secrets are missing. Check your vault configuration."
  no_log: true    # Do not log secret values
```

Use this validation role at the beginning of every deployment:

```yaml
---
# deploy.yml
# Run validation first, then proceed with deployment

- hosts: webservers
  become: yes
  pre_tasks:
    - name: Validate all inputs
      include_role:
        name: validate_inputs

  roles:
    - webserver
    - application
    - monitoring
```

## Mandatory Variables in Templates

Use `mandatory` inside Jinja2 templates too:

```ini
# templates/database.conf.j2
# Template that enforces required values

[connection]
host = {{ db_host | mandatory }}
port = {{ db_port | default(5432) }}
database = {{ db_name | mandatory }}
user = {{ db_user | mandatory }}
password = {{ db_password | mandatory }}

[pool]
min_connections = {{ db_pool_min | default(2) }}
max_connections = {{ db_pool_max | default(20) }}
idle_timeout = {{ db_idle_timeout | default(300) }}
```

## A Pattern for Required vs Optional Variables

Here is a clean pattern that documents which variables are required and which are optional:

```yaml
# roles/myapp/defaults/main.yml

# ===========================================
# REQUIRED VARIABLES (no defaults - must be provided)
# ===========================================

# The version to deploy (e.g., "2.5.0")
myapp_version: "{{ myapp_version | mandatory('myapp_version is required: -e myapp_version=X.Y.Z') }}"

# Database connection password
myapp_db_password: "{{ myapp_db_password | mandatory('myapp_db_password must be set via vault or extra vars') }}"

# The target environment
myapp_environment: "{{ myapp_environment | mandatory('Specify environment: -e myapp_environment=production') }}"

# ===========================================
# OPTIONAL VARIABLES (sensible defaults provided)
# ===========================================

# Application port (default: 8080)
myapp_port: 8080

# Number of worker processes (default: number of CPUs)
myapp_workers: "{{ ansible_processor_vcpus | default(2) }}"

# Log level (default: info)
myapp_log_level: info

# Enable debug mode (default: false)
myapp_debug: false

# Health check interval in seconds (default: 30)
myapp_health_check_interval: 30
```

## Wrapping Up

The `mandatory` filter and `assert` module serve different but complementary purposes. Use `mandatory` for simple "this must exist" checks, especially in role defaults and templates. Use `assert` when you need to validate format, range, type, or more complex conditions. Both approaches share the same goal: failing fast with a clear error message so that operators know exactly what to fix, rather than letting a playbook run halfway before crashing or, worse, deploying a broken configuration because a critical variable was silently empty.
