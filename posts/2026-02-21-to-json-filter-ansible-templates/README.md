# How to Use the to_json Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, JSON

Description: Learn how to use the to_json filter in Ansible templates to serialize variables into JSON format for configuration files and APIs.

---

JSON is everywhere in modern infrastructure. From API payloads to configuration files to container orchestration manifests, you regularly need to produce JSON output from Ansible. The `to_json` filter serializes any Ansible variable (dictionaries, lists, strings, numbers, booleans) into a valid JSON string. This post covers how to use it effectively in templates, tasks, and real-world scenarios.

## Basic Usage

The `to_json` filter converts an Ansible data structure into a compact JSON string:

```jinja2
{# Convert a dictionary to JSON #}
{{ {"name": "myapp", "port": 8080, "debug": false} | to_json }}
{# Output: {"name": "myapp", "port": 8080, "debug": false} #}
```

```jinja2
{# Convert a list to JSON #}
{{ ["nginx", "postgresql", "redis"] | to_json }}
{# Output: ["nginx", "postgresql", "redis"] #}
```

The output is a single line with no extra whitespace. This is the default behavior and is useful when you need compact JSON, like in API calls or inline configuration values.

## Using to_json in Templates

Here is a practical example where you generate a JSON configuration file for an application:

```yaml
# deploy_app.yml - Generate JSON config file
- name: Deploy application configuration
  hosts: app_servers
  vars:
    app_config:
      server:
        host: "0.0.0.0"
        port: 8080
        workers: 4
      database:
        host: "db.internal"
        port: 5432
        name: "myapp"
        pool_size: 10
      cache:
        backend: "redis"
        host: "cache.internal"
        port: 6379
      features:
        - "user_dashboard"
        - "api_v2"
        - "notifications"
  tasks:
    - name: Write JSON config file
      ansible.builtin.copy:
        content: "{{ app_config | to_json }}"
        dest: /etc/myapp/config.json
```

This produces a compact, single-line JSON file. For human-readable output, use `to_nice_json` instead (covered in a separate post).

## Generating JSON for API Calls

When making API calls with the `uri` module, `to_json` is essential for building request bodies:

```yaml
# api_call.yml - Send JSON data to an API
- name: Register service with configuration
  ansible.builtin.uri:
    url: "https://api.example.com/v1/services"
    method: POST
    headers:
      Content-Type: "application/json"
      Authorization: "Bearer {{ api_token }}"
    body: "{{ service_payload | to_json }}"
    body_format: json
    status_code: 201
  vars:
    service_payload:
      name: "{{ service_name }}"
      environment: "{{ deploy_env }}"
      endpoints:
        - protocol: "http"
          host: "{{ ansible_hostname }}"
          port: "{{ service_port }}"
      metadata:
        deployed_by: "ansible"
        version: "{{ app_version }}"
        timestamp: "{{ ansible_date_time.iso8601 }}"
```

## Embedding JSON in Non-JSON Files

Sometimes you need to embed a JSON string inside a file that is not itself JSON. For example, environment variables, shell scripts, or YAML files that expect a JSON-encoded string value:

```yaml
# systemd_env.yml - Embed JSON in a systemd environment file
- name: Write application environment
  ansible.builtin.template:
    src: app.env.j2
    dest: /etc/myapp/app.env
  vars:
    log_config:
      level: "info"
      format: "json"
      outputs:
        - type: "stdout"
        - type: "file"
          path: "/var/log/myapp/app.log"
```

```jinja2
{# app.env.j2 - JSON embedded in an environment file #}
APP_NAME={{ app_name }}
APP_PORT={{ app_port }}
LOG_CONFIG={{ log_config | to_json }}
DATABASE_HOSTS={{ db_hosts | to_json }}
```

The rendered output:

```
APP_NAME=myapp
APP_PORT=8080
LOG_CONFIG={"level": "info", "format": "json", "outputs": [{"type": "stdout"}, {"type": "file", "path": "/var/log/myapp/app.log"}]}
DATABASE_HOSTS=["db1.internal", "db2.internal"]
```

## Handling Special Characters

The `to_json` filter properly escapes special characters, which is important for security and correctness:

```jinja2
{# Special characters are properly escaped #}
{{ {"message": "Hello \"world\"\nNew line here"} | to_json }}
{# Output: {"message": "Hello \"world\"\nNew line here"} #}
```

This is particularly important when dealing with user-provided data that might contain quotes, newlines, or other characters that would break JSON formatting.

## Using to_json with Ansible Facts

You can serialize Ansible facts to JSON for logging or reporting:

```yaml
# collect_facts.yml - Serialize system facts to JSON
- name: Collect and store system information
  hosts: all
  tasks:
    - name: Build system info object
      ansible.builtin.set_fact:
        system_info:
          hostname: "{{ ansible_hostname }}"
          fqdn: "{{ ansible_fqdn }}"
          os: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
          kernel: "{{ ansible_kernel }}"
          cpu_count: "{{ ansible_processor_vcpus }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          interfaces: "{{ ansible_interfaces }}"
          ipv4_addresses: "{{ ansible_all_ipv4_addresses }}"

    - name: Write system info as JSON
      ansible.builtin.copy:
        content: "{{ system_info | to_json }}"
        dest: /var/lib/node-exporter/system_info.json
```

## Template Example: Consul Service Registration

Here is a real-world template for generating Consul service registration files:

```yaml
# consul_service.yml - Register services with Consul
- name: Register application with Consul
  hosts: app_servers
  vars:
    consul_service:
      service:
        name: "{{ app_name }}"
        port: "{{ app_port | int }}"
        tags:
          - "{{ deploy_env }}"
          - "{{ app_version }}"
        check:
          http: "http://localhost:{{ app_port }}/health"
          interval: "10s"
          timeout: "5s"
        meta:
          version: "{{ app_version }}"
          region: "{{ aws_region | default('us-east-1') }}"
  tasks:
    - name: Write Consul service definition
      ansible.builtin.copy:
        content: "{{ consul_service | to_json }}"
        dest: "/etc/consul.d/{{ app_name }}.json"
      notify: Reload Consul
```

## Controlling JSON Output

The `to_json` filter accepts parameters to control the output format. While `to_nice_json` is the preferred way to get pretty-printed output, you can pass options directly:

```jinja2
{# Compact output (default) #}
{{ data | to_json }}

{# With sorting of keys #}
{{ data | to_json(sort_keys=true) }}

{# Ensure ASCII output (escape non-ASCII characters) #}
{{ data | to_json(ensure_ascii=true) }}
```

## Common Pattern: Building Dynamic JSON

When you need to construct JSON dynamically based on conditions:

```yaml
# dynamic_json.yml - Build JSON based on conditions
- name: Build dynamic configuration
  hosts: app_servers
  tasks:
    - name: Construct base config
      ansible.builtin.set_fact:
        dynamic_config:
          app_name: "{{ app_name }}"
          port: "{{ app_port }}"

    - name: Add database config if needed
      ansible.builtin.set_fact:
        dynamic_config: "{{ dynamic_config | combine({'database': {'host': db_host, 'port': db_port}}) }}"
      when: db_host is defined

    - name: Add cache config if needed
      ansible.builtin.set_fact:
        dynamic_config: "{{ dynamic_config | combine({'cache': {'host': cache_host, 'ttl': cache_ttl | default(3600)}}) }}"
      when: cache_host is defined

    - name: Write final config
      ansible.builtin.copy:
        content: "{{ dynamic_config | to_json }}"
        dest: /etc/myapp/config.json
```

## to_json vs to_nice_json

Quick comparison to help you choose:

| Feature | to_json | to_nice_json |
|---------|---------|--------------|
| Output | Compact, single line | Pretty-printed, indented |
| Best for | API bodies, inline values, env vars | Configuration files, human-readable output |
| File size | Smaller | Larger |

Use `to_json` when file size matters or when the JSON will be parsed by machines. Use `to_nice_json` when humans need to read or edit the output.

## Handling Data Types

Be aware of how different Python/Ansible types get serialized:

```jinja2
{# Strings become JSON strings #}
{{ "hello" | to_json }}
{# Output: "hello" #}

{# Numbers stay as numbers #}
{{ 42 | to_json }}
{# Output: 42 #}

{# Booleans in Ansible (true/false) become JSON booleans #}
{{ true | to_json }}
{# Output: true #}

{# None/null #}
{{ None | to_json }}
{# Output: null #}

{# Be careful with strings that look like numbers #}
{{ "8080" | to_json }}
{# Output: "8080" (stays a string) #}

{{ "8080" | int | to_json }}
{# Output: 8080 (now a number) #}
```

When generating JSON for typed systems, make sure your values have the correct Python type before serialization.

## Wrapping Up

The `to_json` filter is a fundamental tool for generating JSON output in Ansible. Whether you are building API request bodies, creating configuration files, embedding JSON values in environment variables, or serializing Ansible facts for reporting, `to_json` handles the serialization correctly, including proper escaping of special characters. For compact machine-readable output, use `to_json`. For human-readable configuration files, check out `to_nice_json` instead.
