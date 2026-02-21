# How to Use the from_yaml Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, YAML

Description: Learn how to use the from_yaml filter in Ansible to parse YAML strings into native data structures for dynamic configuration management.

---

YAML is the configuration format of choice for Kubernetes, Docker Compose, CI/CD pipelines, and Ansible itself. When you read YAML content from files, command output, or API responses, you get it as a plain string. The `from_yaml` filter parses that YAML string into a native Ansible data structure (dictionaries, lists, etc.) so you can access individual fields, iterate over collections, and use the data in your automation logic.

## Basic Usage

```jinja2
{# Parse a YAML string into a dictionary #}
{% set data = "name: myapp\nport: 8080\ndebug: false" | from_yaml %}
Name: {{ data.name }}
Port: {{ data.port }}
```

Output:

```
Name: myapp
Port: 8080
```

## Reading and Parsing YAML Files

The most common use case is reading YAML files from remote hosts and parsing their contents:

```yaml
# read_yaml.yml - Read and parse a YAML config file
- name: Read existing application config
  ansible.builtin.slurp:
    src: /etc/myapp/config.yml
  register: config_raw

- name: Parse YAML content
  ansible.builtin.set_fact:
    existing_config: "{{ config_raw.content | b64decode | from_yaml }}"

- name: Display parsed configuration
  ansible.builtin.debug:
    msg: |
      App name: {{ existing_config.app.name }}
      Port: {{ existing_config.app.port }}
      DB host: {{ existing_config.database.host }}
```

Since `slurp` returns base64-encoded content, you need `b64decode` before `from_yaml`.

## Parsing kubectl Output

Kubernetes tools often output YAML, and you need to parse it for further processing:

```yaml
# k8s_parse.yml - Parse Kubernetes YAML output
- name: Get deployment details
  ansible.builtin.shell: >
    kubectl get deployment web-api -n production -o yaml
  register: deployment_raw
  changed_when: false

- name: Parse deployment YAML
  ansible.builtin.set_fact:
    deployment: "{{ deployment_raw.stdout | from_yaml }}"

- name: Extract deployment info
  ansible.builtin.debug:
    msg: |
      Name: {{ deployment.metadata.name }}
      Replicas: {{ deployment.spec.replicas }}
      Image: {{ deployment.spec.template.spec.containers[0].image }}
      Strategy: {{ deployment.spec.strategy.type }}
```

## Comparing Existing and Desired Configuration

A powerful pattern is reading the current configuration, comparing it with the desired state, and only making changes when needed:

```yaml
# config_drift.yml - Detect configuration drift
- name: Read current config
  ansible.builtin.slurp:
    src: /etc/myapp/config.yml
  register: current_config_raw
  failed_when: false

- name: Parse current config
  ansible.builtin.set_fact:
    current_config: "{{ (current_config_raw.content | b64decode | from_yaml) if current_config_raw is not failed else {} }}"

- name: Define desired config
  ansible.builtin.set_fact:
    desired_config:
      app:
        name: "web-api"
        port: 8080
        workers: 4
      database:
        host: "db.internal"
        port: 5432

- name: Check for drift
  ansible.builtin.debug:
    msg: "Configuration has drifted and needs updating"
  when: current_config != desired_config

- name: Update config if drifted
  ansible.builtin.copy:
    content: "{{ desired_config | to_nice_yaml(indent=2) }}"
    dest: /etc/myapp/config.yml
  when: current_config != desired_config
  notify: Restart application
```

## Parsing Multi-Document YAML

YAML supports multiple documents in a single file, separated by `---`. The `from_yaml` filter parses only the first document. For multi-document YAML, use `from_yaml_all`:

```yaml
# multi_doc.yml - Parse multi-document YAML
- name: Read Kubernetes manifests file
  ansible.builtin.slurp:
    src: /opt/k8s/all-resources.yml
  register: manifests_raw

# from_yaml would only get the first document
# from_yaml_all returns a list of all documents
- name: Parse all YAML documents
  ansible.builtin.set_fact:
    all_manifests: "{{ manifests_raw.content | b64decode | from_yaml_all | list }}"

- name: List all resource types
  ansible.builtin.debug:
    msg: "{{ item.kind }}: {{ item.metadata.name }}"
  loop: "{{ all_manifests }}"
  when: item is not none
```

## Using from_yaml in Templates

You can parse YAML strings inside Jinja2 templates as well:

```yaml
# template_parse.yml - Parse YAML within a template
- name: Generate config from YAML data
  hosts: app_servers
  vars:
    # YAML string that comes from an external source (vault, API, etc.)
    raw_service_config: |
      services:
        - name: web
          port: 8080
          replicas: 3
        - name: api
          port: 9090
          replicas: 2
        - name: worker
          port: 0
          replicas: 5
  tasks:
    - name: Generate HAProxy config from YAML data
      ansible.builtin.template:
        src: haproxy.cfg.j2
        dest: /etc/haproxy/haproxy.cfg
```

```jinja2
{# haproxy.cfg.j2 - Parse YAML string and use the data #}
{% set config = raw_service_config | from_yaml %}

global
    maxconn 4096

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

{% for service in config.services %}
{% if service.port > 0 %}
frontend {{ service.name }}_frontend
    bind *:{{ service.port }}
    default_backend {{ service.name }}_backend

backend {{ service.name }}_backend
    balance roundrobin
{% for i in range(service.replicas) %}
    server {{ service.name }}-{{ i }} {{ service.name }}-{{ i }}.internal:{{ service.port }} check
{% endfor %}

{% endif %}
{% endfor %}
```

## Parsing Helm Values

When working with Helm charts, you might need to read and modify values files:

```yaml
# helm_modify.yml - Read, modify, and write Helm values
- name: Read current Helm values
  ansible.builtin.slurp:
    src: /opt/helm/web-api/values.yaml
  register: values_raw

- name: Parse current values
  ansible.builtin.set_fact:
    helm_values: "{{ values_raw.content | b64decode | from_yaml }}"

- name: Update specific values
  ansible.builtin.set_fact:
    updated_values: >-
      {{ helm_values | combine({
        'image': {
          'tag': new_image_tag
        },
        'replicaCount': new_replica_count | int
      }, recursive=true) }}

- name: Write updated values
  ansible.builtin.copy:
    content: "{{ updated_values | to_nice_yaml(indent=2) }}"
    dest: /opt/helm/web-api/values.yaml
```

## Parsing CI/CD Configuration

Read and analyze CI/CD configuration files:

```yaml
# parse_ci.yml - Parse and validate CI configuration
- name: Read GitHub Actions workflow
  ansible.builtin.slurp:
    src: "{{ repo_path }}/.github/workflows/ci.yml"
  register: workflow_raw

- name: Parse workflow
  ansible.builtin.set_fact:
    workflow: "{{ workflow_raw.content | b64decode | from_yaml }}"

- name: Verify required jobs exist
  ansible.builtin.assert:
    that:
      - "'build' in workflow.jobs"
      - "'test' in workflow.jobs"
      - "'deploy' in workflow.jobs"
    fail_msg: "CI workflow is missing required jobs"
    success_msg: "All required jobs are present"

- name: List all workflow triggers
  ansible.builtin.debug:
    msg: "Workflow triggers: {{ workflow.on | default({}) | list | join(', ') }}"
```

## Handling Invalid YAML Gracefully

When the YAML content might be invalid or missing:

```yaml
# safe_parse.yml - Safe YAML parsing with error handling
- name: Try to read config file
  ansible.builtin.slurp:
    src: /etc/myapp/config.yml
  register: config_raw
  failed_when: false

- name: Parse YAML safely
  ansible.builtin.set_fact:
    app_config: "{{ config_raw.content | b64decode | from_yaml }}"
  when: config_raw is not failed
  register: parse_result
  ignore_errors: true

- name: Use default config if parsing failed
  ansible.builtin.set_fact:
    app_config:
      app:
        name: "myapp"
        port: 8080
      logging:
        level: "info"
  when: parse_result is skipped or parse_result is failed
```

## Merging Multiple YAML Sources

Parse and merge configuration from multiple YAML files:

```yaml
# merge_configs.yml - Merge multiple YAML config sources
- name: Read base config
  ansible.builtin.slurp:
    src: /etc/myapp/base.yml
  register: base_raw

- name: Read environment override
  ansible.builtin.slurp:
    src: "/etc/myapp/{{ deploy_env }}.yml"
  register: env_raw
  failed_when: false

- name: Read local override
  ansible.builtin.slurp:
    src: /etc/myapp/local.yml
  register: local_raw
  failed_when: false

- name: Merge all configs with priority
  ansible.builtin.set_fact:
    final_config: >-
      {{ (base_raw.content | b64decode | from_yaml)
         | combine((env_raw.content | b64decode | from_yaml) if env_raw is not failed else {}, recursive=true)
         | combine((local_raw.content | b64decode | from_yaml) if local_raw is not failed else {}, recursive=true)
      }}

- name: Write merged config
  ansible.builtin.copy:
    content: "{{ final_config | to_nice_yaml(indent=2) }}"
    dest: /etc/myapp/config.yml
```

This creates a configuration priority chain: base < environment < local, where later values override earlier ones.

## from_yaml vs from_json

Both filters parse text into data structures, but for different formats:

| Feature | from_yaml | from_json |
|---------|-----------|-----------|
| Input format | YAML | JSON |
| Handles comments | Yes (YAML supports comments) | No (JSON does not support comments) |
| Multi-document | Use from_yaml_all | Not applicable |
| Data types | Broader (dates, etc.) | Strict (string, number, bool, null) |

Since YAML is a superset of JSON, `from_yaml` can actually parse JSON as well. But for clarity and intent, use `from_json` for JSON data and `from_yaml` for YAML data.

## Wrapping Up

The `from_yaml` filter is essential for any Ansible workflow that needs to read and process YAML data from external sources. Whether you are parsing Kubernetes manifests, reading Helm values, analyzing CI/CD configurations, or merging configuration files from multiple sources, `from_yaml` turns YAML strings into native data structures you can work with. Combined with `slurp` for reading remote files and `to_nice_yaml` for writing them back, it gives you a complete toolkit for YAML-based configuration management.
