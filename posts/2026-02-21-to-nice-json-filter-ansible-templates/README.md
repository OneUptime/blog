# How to Use the to_nice_json Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, JSON

Description: Learn how to use the to_nice_json filter in Ansible templates to generate human-readable, pretty-printed JSON configuration files.

---

While `to_json` produces compact, single-line JSON, `to_nice_json` generates pretty-printed output with proper indentation and line breaks. This makes the output much easier for humans to read, review, and debug. If you are generating JSON configuration files that anyone might need to inspect on a server, `to_nice_json` is the filter you want.

## Basic Usage

The filter works exactly like `to_json` but produces formatted output:

```jinja2
{# Pretty-print a dictionary as JSON #}
{{ {"name": "myapp", "port": 8080, "debug": false, "tags": ["web", "production"]} | to_nice_json }}
```

Output:

```json
{
    "debug": false,
    "name": "myapp",
    "port": 8080,
    "tags": [
        "web",
        "production"
    ]
}
```

Compare that with `to_json`, which produces:

```json
{"debug": false, "name": "myapp", "port": 8080, "tags": ["web", "production"]}
```

## Customizing Indentation

You can control the number of spaces used for indentation:

```jinja2
{# Use 2-space indentation instead of the default 4 #}
{{ my_data | to_nice_json(indent=2) }}
```

Output with `indent=2`:

```json
{
  "name": "myapp",
  "port": 8080
}
```

Many projects prefer 2-space indentation for JSON files, especially in JavaScript/Node.js ecosystems.

## Practical Example: Application Configuration

Here is a realistic example generating a Node.js application configuration file:

```yaml
# deploy_config.yml - Generate pretty JSON config for a Node.js app
- name: Deploy application configuration
  hosts: app_servers
  vars:
    app_config:
      server:
        host: "0.0.0.0"
        port: 3000
        cors:
          enabled: true
          origins:
            - "https://app.example.com"
            - "https://admin.example.com"
          methods:
            - "GET"
            - "POST"
            - "PUT"
            - "DELETE"
      database:
        primary:
          host: "db-primary.internal"
          port: 5432
          name: "myapp_production"
          pool:
            min: 5
            max: 20
            idle_timeout: 30000
        read_replicas:
          - host: "db-replica-1.internal"
            port: 5432
          - host: "db-replica-2.internal"
            port: 5432
      redis:
        host: "cache.internal"
        port: 6379
        db: 0
        key_prefix: "myapp:"
      logging:
        level: "info"
        format: "json"
        transports:
          - type: "console"
          - type: "file"
            filename: "/var/log/myapp/app.log"
            max_size: "10m"
            max_files: 5
  tasks:
    - name: Write application config
      ansible.builtin.copy:
        content: "{{ app_config | to_nice_json(indent=2) }}\n"
        dest: /etc/myapp/config.json
        owner: myapp
        group: myapp
        mode: "0640"
```

The `\n` at the end ensures the file ends with a newline, which is a best practice for text files.

## Generating Terraform Variable Files

Terraform accepts JSON variable files (`.tfvars.json`). Here is how to generate them:

```yaml
# terraform_vars.yml - Generate Terraform JSON variable files
- name: Generate Terraform variables
  hosts: localhost
  vars:
    tf_vars:
      project_name: "myproject"
      environment: "production"
      region: "us-east-1"
      instance_type: "t3.medium"
      desired_capacity: 3
      min_size: 2
      max_size: 10
      vpc_cidr: "10.0.0.0/16"
      subnet_cidrs:
        - "10.0.1.0/24"
        - "10.0.2.0/24"
        - "10.0.3.0/24"
      tags:
        Environment: "production"
        ManagedBy: "terraform"
        Team: "platform"
  tasks:
    - name: Write Terraform variables file
      ansible.builtin.copy:
        content: "{{ tf_vars | to_nice_json(indent=2) }}\n"
        dest: /opt/terraform/environments/production.tfvars.json
```

## Generating Consul Configuration

Consul uses JSON for its configuration files. Here is a template for a Consul agent configuration:

```yaml
# consul_config.yml - Generate Consul agent configuration
- name: Configure Consul agent
  hosts: consul_servers
  vars:
    consul_config:
      datacenter: "dc1"
      data_dir: "/opt/consul/data"
      log_level: "INFO"
      server: true
      bootstrap_expect: 3
      bind_addr: "{{ ansible_default_ipv4.address }}"
      client_addr: "0.0.0.0"
      retry_join:
        - "consul-1.internal"
        - "consul-2.internal"
        - "consul-3.internal"
      ui_config:
        enabled: true
      connect:
        enabled: true
      performance:
        raft_multiplier: 1
      telemetry:
        prometheus_retention_time: "24h"
        disable_hostname: true
  tasks:
    - name: Write Consul configuration
      ansible.builtin.copy:
        content: "{{ consul_config | to_nice_json(indent=2) }}\n"
        dest: /etc/consul.d/consul.json
        owner: consul
        group: consul
        mode: "0640"
      notify: Restart Consul
```

## Sorting Keys

By default, `to_nice_json` may or may not sort keys depending on the Ansible and Python version. To ensure consistent output (useful for idempotency and diffing), explicitly sort keys:

```jinja2
{# Sort keys for consistent output #}
{{ my_config | to_nice_json(indent=2, sort_keys=true) }}
```

Sorted keys make it easier to find specific values in large JSON files and ensure that `ansible.builtin.copy` does not unnecessarily report changes when the data is the same but ordered differently.

## Generating Package.json Files

If you manage Node.js projects with Ansible, you can generate `package.json` files:

```yaml
# node_project.yml - Generate package.json
- name: Initialize Node.js project
  hosts: build_servers
  vars:
    package_json:
      name: "{{ project_name }}"
      version: "{{ project_version }}"
      description: "{{ project_description }}"
      main: "dist/index.js"
      scripts:
        start: "node dist/index.js"
        build: "tsc"
        test: "jest"
        lint: "eslint src/"
      dependencies:
        express: "^4.18.0"
        pg: "^8.11.0"
        redis: "^4.6.0"
      devDependencies:
        typescript: "^5.0.0"
        jest: "^29.0.0"
        eslint: "^8.0.0"
      engines:
        node: ">=18.0.0"
  tasks:
    - name: Write package.json
      ansible.builtin.copy:
        content: "{{ package_json | to_nice_json(indent=2) }}\n"
        dest: "/opt/{{ project_name }}/package.json"
```

## Handling Edge Cases

### Ensuring Correct Data Types

JSON is strict about data types. Make sure your variables have the right types before serialization:

```yaml
# type_handling.yml - Ensure correct JSON types
- name: Generate typed JSON config
  hosts: localhost
  vars:
    config:
      port: 8080           # number
      host: "0.0.0.0"      # string
      debug: false          # boolean
      workers: 4            # number
      ratio: 0.75           # float
      tags: ["web"]         # array
      metadata: null        # null
  tasks:
    - name: Write typed config
      ansible.builtin.copy:
        content: "{{ config | to_nice_json(indent=2) }}\n"
        dest: /tmp/typed_config.json
```

If a value comes from a variable that might be a string when it should be a number, cast it:

```jinja2
{# Force correct types before serialization #}
{% set typed_config = {
  "port": app_port | int,
  "workers": worker_count | int,
  "debug": debug_mode | bool,
  "ratio": cache_ratio | float
} %}
{{ typed_config | to_nice_json(indent=2) }}
```

### Handling Unicode

`to_nice_json` properly handles Unicode characters:

```jinja2
{{ {"greeting": "Hej varlden", "emoji_name": "thumbs up"} | to_nice_json(indent=2, ensure_ascii=false) }}
```

Use `ensure_ascii=false` if you want non-ASCII characters to appear as-is rather than being escaped.

## Template Pattern: JSON with Comments Header

JSON does not support comments, but you can add a comment header using a non-JSON prefix (useful for configuration files where the parser ignores leading comments):

```jinja2
{# config_with_header.json.j2 - JSON config with a comment header #}
// WARNING: This file is managed by Ansible. Do not edit manually.
// Template: roles/myapp/templates/config.json.j2
// Generated: {{ ansible_date_time.iso8601 }}
{{ app_config | to_nice_json(indent=2) }}
```

Note that standard JSON parsers will reject this file. Only use this pattern with parsers that support JSON with comments (like VS Code's `jsonc` format or certain application-specific parsers).

## Combining to_nice_json with Conditional Data

```yaml
# conditional_json.yml - Build JSON with conditional sections
- name: Generate config with conditional sections
  hosts: app_servers
  tasks:
    - name: Build base config
      ansible.builtin.set_fact:
        final_config:
          app_name: "{{ app_name }}"
          version: "{{ app_version }}"

    - name: Add SSL config if certificates exist
      ansible.builtin.set_fact:
        final_config: >-
          {{ final_config | combine({
            'ssl': {
              'enabled': true,
              'cert': '/etc/ssl/certs/' + app_name + '.crt',
              'key': '/etc/ssl/private/' + app_name + '.key'
            }
          }) }}
      when: ssl_enabled | default(false) | bool

    - name: Write final config
      ansible.builtin.copy:
        content: "{{ final_config | to_nice_json(indent=2) }}\n"
        dest: "/etc/{{ app_name }}/config.json"
```

## Wrapping Up

The `to_nice_json` filter is the right choice whenever you need to generate JSON files that humans will read. It produces properly indented, well-formatted output that is easy to scan, diff, and debug. Use the `indent` parameter to match your project's style conventions, `sort_keys` for consistent ordering, and always add a trailing newline to your files. For machine-only consumption where file size matters, stick with `to_json`. For everything else, `to_nice_json` is the way to go.
