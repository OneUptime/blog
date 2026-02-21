# How to Use the from_json Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, JSON

Description: Learn how to use the from_json filter in Ansible to parse JSON strings into native data structures for processing in playbooks.

---

APIs return JSON. CLIs output JSON. Configuration files use JSON. When you work with external tools in Ansible, you constantly receive JSON data as plain strings that need to be parsed before you can use them. The `from_json` filter takes a JSON string and converts it into a native Ansible data structure (dictionaries, lists, strings, numbers, booleans) that you can then access, iterate over, and manipulate in your playbooks and templates.

## Basic Usage

The filter is straightforward: pipe a JSON string through `from_json` and you get back a Python data structure.

```jinja2
{# Parse a JSON string into a usable data structure #}
{% set data = '{"name": "myapp", "port": 8080}' | from_json %}
Name: {{ data.name }}
Port: {{ data.port }}
```

Output:

```
Name: myapp
Port: 8080
```

## Parsing Command Output

The most common use case is parsing JSON output from shell commands:

```yaml
# parse_docker.yml - Parse Docker inspect output
- name: Get container information
  ansible.builtin.shell: docker inspect mycontainer --format '{{ '{{' }}json .{{ '}}' }}'
  register: docker_inspect_raw
  changed_when: false

- name: Parse the JSON output
  ansible.builtin.set_fact:
    container_info: "{{ docker_inspect_raw.stdout | from_json }}"

- name: Display container details
  ansible.builtin.debug:
    msg: |
      Container: {{ container_info.Name }}
      Image: {{ container_info.Config.Image }}
      Status: {{ container_info.State.Status }}
      IP: {{ container_info.NetworkSettings.IPAddress }}
```

## Parsing API Responses

When you call APIs with the `uri` module and the response is not automatically parsed:

```yaml
# api_response.yml - Parse API response
- name: Get service health from API
  ansible.builtin.uri:
    url: "https://api.example.com/v1/health"
    return_content: true
  register: health_response

- name: Parse health data
  ansible.builtin.set_fact:
    health_data: "{{ health_response.content | from_json }}"

- name: Check individual service health
  ansible.builtin.debug:
    msg: "Service {{ item.name }} is {{ item.status }}"
  loop: "{{ health_data.services }}"
  when: item.status != "healthy"
```

Note: The `uri` module often parses JSON automatically into `response.json`, but when you use `return_content: true` or work with non-standard responses, `from_json` is needed.

## Parsing AWS CLI Output

AWS CLI commands return JSON by default, making `from_json` essential for AWS automation:

```yaml
# aws_instances.yml - Parse AWS CLI output
- name: List running EC2 instances
  ansible.builtin.shell: >
    aws ec2 describe-instances
    --filters "Name=instance-state-name,Values=running"
    --query "Reservations[].Instances[]"
    --output json
  register: ec2_output
  changed_when: false

- name: Parse EC2 instance data
  ansible.builtin.set_fact:
    running_instances: "{{ ec2_output.stdout | from_json }}"

- name: Display instance details
  ansible.builtin.debug:
    msg: "Instance {{ item.InstanceId }} ({{ item.InstanceType }}) - {{ item.PrivateIpAddress }}"
  loop: "{{ running_instances }}"
```

## Using from_json in Templates

You can also use `from_json` inside Jinja2 templates when you have JSON strings stored as variables:

```yaml
# template_vars.yml - Variables that contain JSON strings
- name: Generate config from JSON data
  hosts: app_servers
  vars:
    # Sometimes config comes as a JSON string from a vault or external source
    raw_db_config: '{"host": "db.internal", "port": 5432, "name": "myapp", "ssl": true}'
    raw_cache_config: '{"host": "cache.internal", "port": 6379, "db": 0}'
  tasks:
    - name: Render application config
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
```

```jinja2
{# app.conf.j2 - Parse JSON strings inside the template #}
{% set db = raw_db_config | from_json %}
{% set cache = raw_cache_config | from_json %}

[database]
host = {{ db.host }}
port = {{ db.port }}
database = {{ db.name }}
ssl = {{ db.ssl | lower }}

[cache]
host = {{ cache.host }}
port = {{ cache.port }}
db = {{ cache.db }}
```

## Parsing Kubernetes kubectl Output

```yaml
# k8s_pods.yml - Parse kubectl JSON output
- name: Get pod information
  ansible.builtin.shell: >
    kubectl get pods -n production -o json
  register: pods_output
  changed_when: false

- name: Parse pod data
  ansible.builtin.set_fact:
    pod_list: "{{ (pods_output.stdout | from_json).items }}"

- name: Find pods not in Running state
  ansible.builtin.set_fact:
    unhealthy_pods: >-
      {{ pod_list | selectattr('status.phase', 'ne', 'Running') | list }}

- name: Alert on unhealthy pods
  ansible.builtin.debug:
    msg: "Pod {{ item.metadata.name }} is in {{ item.status.phase }} state"
  loop: "{{ unhealthy_pods }}"
  when: unhealthy_pods | length > 0
```

## Chaining from_json with Other Operations

Once you have parsed JSON into a data structure, you can chain it with other filters:

```yaml
# chain_operations.yml - Parse and process JSON data
- name: Get service discovery data
  ansible.builtin.shell: >
    consul catalog services -format json
  register: consul_services_raw
  changed_when: false

- name: Parse and filter services
  ansible.builtin.set_fact:
    # Parse JSON, then filter and transform
    web_services: >-
      {{ consul_services_raw.stdout
         | from_json
         | selectattr('ServiceName', 'match', '^web-')
         | map(attribute='ServiceAddress')
         | unique
         | sort
         | list }}

- name: Generate load balancer config
  ansible.builtin.template:
    src: haproxy.cfg.j2
    dest: /etc/haproxy/haproxy.cfg
  when: web_services | length > 0
```

## Reading JSON Files

When you need to read and parse JSON files from remote hosts:

```yaml
# read_json_file.yml - Read and parse a JSON file
- name: Read application state file
  ansible.builtin.slurp:
    src: /var/lib/myapp/state.json
  register: state_file_raw

- name: Parse state file
  ansible.builtin.set_fact:
    app_state: "{{ state_file_raw.content | b64decode | from_json }}"

- name: Check application state
  ansible.builtin.debug:
    msg: |
      Last deployment: {{ app_state.last_deploy }}
      Current version: {{ app_state.version }}
      Status: {{ app_state.status }}
```

The `slurp` module returns base64-encoded content, so you need `b64decode` before `from_json`.

## Error Handling

When the input might not be valid JSON, you should handle the error:

```yaml
# safe_parsing.yml - Handle potentially invalid JSON
- name: Try to get JSON data
  ansible.builtin.shell: some-command --output json
  register: command_output
  changed_when: false
  failed_when: false

- name: Attempt to parse JSON output
  ansible.builtin.set_fact:
    parsed_data: "{{ command_output.stdout | from_json }}"
  when: command_output.rc == 0
  ignore_errors: true
  register: parse_result

- name: Use parsed data if available
  ansible.builtin.debug:
    var: parsed_data
  when: parse_result is not failed

- name: Fall back if parsing failed
  ansible.builtin.debug:
    msg: "Could not parse output: {{ command_output.stdout }}"
  when: parse_result is failed
```

## Practical Example: Parsing Terraform Output

After running Terraform, you often need to use the outputs in subsequent Ansible tasks:

```yaml
# terraform_outputs.yml - Parse Terraform output
- name: Get Terraform outputs
  ansible.builtin.shell: terraform output -json
  args:
    chdir: /opt/terraform/production
  register: tf_output_raw
  changed_when: false

- name: Parse Terraform outputs
  ansible.builtin.set_fact:
    tf_outputs: "{{ tf_output_raw.stdout | from_json }}"

- name: Extract specific values
  ansible.builtin.set_fact:
    db_endpoint: "{{ tf_outputs.database_endpoint.value }}"
    cache_endpoint: "{{ tf_outputs.cache_endpoint.value }}"
    lb_dns: "{{ tf_outputs.load_balancer_dns.value }}"
    subnet_ids: "{{ tf_outputs.private_subnet_ids.value }}"

- name: Configure application with Terraform outputs
  ansible.builtin.template:
    src: app_config.yml.j2
    dest: /etc/myapp/config.yml
```

## Parsing Nested JSON Strings

Sometimes you encounter JSON that contains nested JSON strings (double-encoded JSON). You need to apply `from_json` twice:

```yaml
# double_encoded.yml - Handle nested JSON strings
- name: Get data with nested JSON
  ansible.builtin.set_fact:
    raw_data: '{"config": "{\"host\": \"db.internal\", \"port\": 5432}"}'

- name: Parse outer JSON
  ansible.builtin.set_fact:
    outer: "{{ raw_data | from_json }}"

- name: Parse inner JSON string
  ansible.builtin.set_fact:
    config: "{{ outer.config | from_json }}"

- name: Use the fully parsed data
  ansible.builtin.debug:
    msg: "Database host: {{ config.host }}, port: {{ config.port }}"
```

## Wrapping Up

The `from_json` filter is the counterpart to `to_json` and `to_nice_json`. While those filters serialize data into JSON strings, `from_json` does the reverse: it takes JSON strings from API responses, CLI output, file contents, and external tools and turns them into native Ansible data structures you can work with. Combined with `set_fact`, `slurp`, and the `shell` module, it forms the backbone of any playbook that needs to interact with JSON-producing tools and services.
