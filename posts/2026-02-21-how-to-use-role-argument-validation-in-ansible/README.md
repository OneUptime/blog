# How to Use Role Argument Validation in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Validation, Argument Specs

Description: Learn how to validate role arguments in Ansible using argument specs to catch configuration errors before tasks execute.

---

One of the more frustrating experiences with Ansible roles is passing the wrong variable type or forgetting a required variable, only to discover the problem halfway through a playbook run. Ansible 2.11 introduced role argument validation through argument specs, which lets you define a schema for your role's inputs. If someone passes an invalid value, Ansible fails immediately with a clear error message before any tasks run. This post shows you how to set it up and use it effectively.

## What Are Argument Specs?

Argument specs are a formal way to define what variables your role accepts, their types, default values, required status, and valid choices. They work just like module argument specs (the same mechanism that validates parameters you pass to built-in modules).

## Where to Define Argument Specs

Create a file called `meta/argument_specs.yml` in your role:

```
roles/
  webserver/
    meta/
      main.yml
      argument_specs.yml    <-- define your schema here
    tasks/
      main.yml
    defaults/
      main.yml
```

## Basic Argument Spec

Here is a simple argument spec for a webserver role:

```yaml
# roles/webserver/meta/argument_specs.yml
# Define the expected inputs for this role
---
argument_specs:
  main:
    short_description: Installs and configures a web server
    description:
      - This role installs Nginx and deploys a virtual host configuration.
      - It supports both HTTP and HTTPS.
    author: nawazdhandala

    options:
      webserver_port:
        type: int
        required: false
        default: 80
        description: The port Nginx listens on

      webserver_server_name:
        type: str
        required: true
        description: The server name for the virtual host

      webserver_document_root:
        type: str
        required: false
        default: /var/www/html
        description: The document root directory

      webserver_enable_tls:
        type: bool
        required: false
        default: false
        description: Whether to enable TLS/SSL
```

Now if someone uses the role without specifying `webserver_server_name`, Ansible fails immediately:

```
ERROR! the role 'webserver' requires the following variables to be set: webserver_server_name
```

## Supported Types

Argument specs support these types:

```yaml
# roles/example/meta/argument_specs.yml
# Demonstration of all supported types
---
argument_specs:
  main:
    options:
      string_var:
        type: str
        description: A string value

      integer_var:
        type: int
        description: An integer value

      float_var:
        type: float
        description: A floating-point value

      boolean_var:
        type: bool
        description: A true/false value

      list_var:
        type: list
        elements: str
        description: A list of strings

      dict_var:
        type: dict
        description: A dictionary

      path_var:
        type: path
        description: A filesystem path

      raw_var:
        type: raw
        description: Any type (no validation)
```

## Choices Validation

You can restrict variables to a set of valid values:

```yaml
# roles/webserver/meta/argument_specs.yml
---
argument_specs:
  main:
    options:
      webserver_log_level:
        type: str
        required: false
        default: warn
        choices:
          - debug
          - info
          - notice
          - warn
          - error
          - crit
        description: Nginx error log level

      webserver_balance_method:
        type: str
        required: false
        default: round_robin
        choices:
          - round_robin
          - least_conn
          - ip_hash
          - random
        description: Load balancing algorithm
```

If someone passes `webserver_log_level: verbose`, Ansible rejects it immediately:

```
ERROR! value of webserver_log_level must be one of: debug, info, notice, warn, error, crit, got: verbose
```

## Nested Dictionary Validation

For complex variables like nested dictionaries, you can define sub-options:

```yaml
# roles/database/meta/argument_specs.yml
# Validate nested dictionary structures
---
argument_specs:
  main:
    options:
      database_config:
        type: dict
        required: true
        description: Database connection configuration

        options:
          host:
            type: str
            required: true
            description: Database hostname

          port:
            type: int
            required: false
            default: 5432
            description: Database port

          name:
            type: str
            required: true
            description: Database name

          pool_size:
            type: int
            required: false
            default: 10
            description: Connection pool size

          ssl_mode:
            type: str
            required: false
            default: prefer
            choices:
              - disable
              - allow
              - prefer
              - require
              - verify-ca
              - verify-full
            description: SSL connection mode
```

## List Element Validation

You can validate the elements inside a list:

```yaml
# roles/firewall/meta/argument_specs.yml
# Validate list elements with sub-options
---
argument_specs:
  main:
    options:
      firewall_rules:
        type: list
        required: true
        elements: dict
        description: List of firewall rules to apply

        options:
          port:
            type: int
            required: true
            description: Port number

          protocol:
            type: str
            required: false
            default: tcp
            choices:
              - tcp
              - udp
            description: Network protocol

          action:
            type: str
            required: false
            default: allow
            choices:
              - allow
              - deny
            description: Firewall action

          source:
            type: str
            required: false
            default: any
            description: Source IP or CIDR
```

With this spec, the following playbook invocation is validated:

```yaml
# site.yml
---
- hosts: web_servers
  roles:
    - role: firewall
      vars:
        firewall_rules:
          - port: 80
            protocol: tcp
            action: allow
          - port: 443
            protocol: tcp
            action: allow
          - port: 22
            protocol: tcp
            action: allow
            source: 10.0.0.0/8
```

If you accidentally type `protocol: http` instead of `protocol: tcp`, Ansible catches it before any task runs.

## Entry Points

Argument specs support multiple entry points if your role has alternate task files that can be called with `include_role` or `import_role`:

```yaml
# roles/database/meta/argument_specs.yml
# Different entry points with different argument requirements
---
argument_specs:
  main:
    short_description: Full database setup
    options:
      database_name:
        type: str
        required: true
      database_user:
        type: str
        required: true
      database_password:
        type: str
        required: true
        no_log: true

  backup:
    short_description: Database backup tasks
    options:
      backup_destination:
        type: path
        required: true
        description: Directory to store backups
      backup_retention_days:
        type: int
        required: false
        default: 7
        description: Number of days to retain backups
```

```yaml
# Use the alternate entry point
- name: Run database backup
  ansible.builtin.include_role:
    name: database
    tasks_from: backup
  vars:
    backup_destination: /backups/db
    backup_retention_days: 14
```

## The no_log Option

For sensitive variables like passwords and API keys, use `no_log` to prevent the value from appearing in Ansible output:

```yaml
# roles/app/meta/argument_specs.yml
---
argument_specs:
  main:
    options:
      app_api_key:
        type: str
        required: true
        no_log: true
        description: API key for external service

      app_database_password:
        type: str
        required: true
        no_log: true
        description: Database password
```

## Combining with defaults/main.yml

Argument specs and defaults work together. If you define a default in both `argument_specs.yml` and `defaults/main.yml`, the value in `defaults/main.yml` takes effect at runtime because argument spec defaults are only used during validation:

```yaml
# roles/webserver/meta/argument_specs.yml
argument_specs:
  main:
    options:
      webserver_port:
        type: int
        default: 80

# roles/webserver/defaults/main.yml
webserver_port: 80
```

Keep the defaults consistent between both files. The argument spec provides type checking and validation; the defaults file provides the runtime value.

## Generating Documentation from Argument Specs

One side benefit of argument specs is that they serve as machine-readable documentation. You can generate role documentation automatically:

```bash
# View the argument spec documentation for a role
ansible-doc -t role webserver
```

This outputs a formatted view of all role parameters, their types, defaults, and descriptions. It is a much better experience than digging through `defaults/main.yml` to figure out what a role accepts.

## A Complete Practical Example

```yaml
# roles/app_deploy/meta/argument_specs.yml
---
argument_specs:
  main:
    short_description: Deploy an application with zero-downtime
    description:
      - Downloads the application artifact, deploys it, and performs a rolling restart.
    author: nawazdhandala

    options:
      app_name:
        type: str
        required: true
        description: Application name used for directories and service name

      app_version:
        type: str
        required: true
        description: "Version to deploy (e.g., 2.5.0)"

      app_port:
        type: int
        required: false
        default: 8080
        description: Port the application listens on

      app_environment:
        type: str
        required: false
        default: production
        choices:
          - development
          - staging
          - production
        description: Deployment environment

      app_jvm_heap_size:
        type: str
        required: false
        default: "512m"
        description: "JVM heap size (e.g., 512m, 1g)"

      app_health_check_path:
        type: str
        required: false
        default: "/health"
        description: HTTP path for health checks

      app_env_vars:
        type: dict
        required: false
        default: {}
        description: Additional environment variables for the application
```

## Wrapping Up

Role argument validation is one of the best features added to Ansible in recent years. By defining an argument spec in `meta/argument_specs.yml`, you get type checking, required field enforcement, choices validation, and auto-generated documentation for free. It catches mistakes before any task runs, which saves time and prevents partial deployments caused by variable typos. If you are building roles that other people will use, argument specs are not optional. They are the difference between a role that is easy to use and one that requires reading through the source code to figure out.
