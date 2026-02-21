# How to Use Ansible loop with JSON Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, JSON, Data Processing, Automation

Description: Learn how to parse, filter, and iterate over JSON data in Ansible loops using from_json, json_query, and lookup plugins.

---

JSON is everywhere in modern infrastructure. APIs return JSON, configuration management tools output JSON, and cloud providers use JSON for their metadata. Ansible handles JSON data naturally since YAML (Ansible's native format) is a superset of JSON. But when you receive JSON from external sources like API calls, file reads, or command outputs, you need to parse it before you can loop over it.

This post covers how to load JSON data into Ansible, transform it for loop consumption, and iterate over JSON structures of varying complexity.

## Parsing JSON from Command Output

Many CLI tools output JSON. You can capture that output and loop over it.

```yaml
# parse-docker-json.yml
# Parses JSON output from docker inspect and loops over containers
- name: Process Docker container data
  hosts: dockerhosts
  tasks:
    - name: Get container information as JSON
      ansible.builtin.command: docker inspect $(docker ps -q)
      register: docker_output
      changed_when: false

    - name: Parse and display container info
      ansible.builtin.debug:
        msg: "Container: {{ item.Name }}, Image: {{ item.Config.Image }}"
      loop: "{{ docker_output.stdout | from_json }}"
      loop_control:
        label: "{{ item.Name }}"
```

The `from_json` filter converts a JSON string into a Python data structure (list or dictionary) that Ansible can loop over.

## Loading JSON from a File

Use the `lookup` plugin to read a JSON file from the control node.

```yaml
# load-json-file.yml
# Reads a JSON file and iterates over its contents
- name: Process JSON file data
  hosts: all
  vars:
    server_config: "{{ lookup('file', 'configs/servers.json') | from_json }}"
  tasks:
    - name: Display server information
      ansible.builtin.debug:
        msg: "Server {{ item.hostname }} at {{ item.ip_address }} ({{ item.role }})"
      loop: "{{ server_config.servers }}"
```

The JSON file might look like this:

```json
{
  "servers": [
    {"hostname": "web-01", "ip_address": "10.0.1.10", "role": "web"},
    {"hostname": "web-02", "ip_address": "10.0.1.11", "role": "web"},
    {"hostname": "db-01", "ip_address": "10.0.2.10", "role": "database"}
  ]
}
```

## Fetching JSON from an API

The `uri` module fetches data from HTTP endpoints and can return parsed JSON directly.

```yaml
# api-json-loop.yml
# Fetches JSON from an API and loops over the results
- name: Process API data
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Fetch user list from API
      ansible.builtin.uri:
        url: https://api.example.com/v1/users
        method: GET
        headers:
          Authorization: "Bearer {{ api_token }}"
        return_content: true
      register: api_response

    - name: Process each user
      ansible.builtin.debug:
        msg: "User: {{ item.username }} ({{ item.email }})"
      loop: "{{ api_response.json.data }}"
      loop_control:
        label: "{{ item.username }}"
```

When the API returns JSON, the `uri` module automatically parses it into `api_response.json`. You do not need the `from_json` filter.

## Using json_query for Complex Filtering

The `json_query` filter uses JMESPath expressions to extract data from complex JSON structures. This is extremely powerful for nested JSON.

```yaml
# json-query-loop.yml
# Uses JMESPath to extract and filter data from complex JSON
- name: Filter JSON with json_query
  hosts: localhost
  gather_facts: false
  vars:
    cloud_data:
      regions:
        - name: us-east-1
          instances:
            - { id: "i-001", type: "t3.large", state: "running" }
            - { id: "i-002", type: "t3.micro", state: "stopped" }
        - name: eu-west-1
          instances:
            - { id: "i-003", type: "m5.xlarge", state: "running" }
            - { id: "i-004", type: "t3.large", state: "running" }
  tasks:
    - name: Get all running instances across all regions
      ansible.builtin.debug:
        msg: "Instance {{ item.id }} ({{ item.type }})"
      loop: "{{ cloud_data | json_query('regions[].instances[?state==`running`][]') }}"

    - name: Get all instance IDs
      ansible.builtin.debug:
        msg: "{{ item }}"
      loop: "{{ cloud_data | json_query('regions[].instances[].id') }}"
```

The JMESPath expression `regions[].instances[?state==\`running\`][]` navigates into each region, filters instances by state, and flattens the results into a single list.

## Inline JSON Data

You can define JSON data directly in your playbook variables.

```yaml
# inline-json.yml
# Defines JSON data inline and loops over it
- name: Process inline JSON
  hosts: all
  become: true
  vars:
    firewall_rules_json: |
      [
        {"port": 22, "protocol": "tcp", "source": "10.0.0.0/8", "comment": "SSH"},
        {"port": 80, "protocol": "tcp", "source": "0.0.0.0/0", "comment": "HTTP"},
        {"port": 443, "protocol": "tcp", "source": "0.0.0.0/0", "comment": "HTTPS"},
        {"port": 5432, "protocol": "tcp", "source": "10.0.2.0/24", "comment": "PostgreSQL"}
      ]
  tasks:
    - name: Apply firewall rules from JSON
      community.general.ufw:
        rule: allow
        port: "{{ item.port | string }}"
        proto: "{{ item.protocol }}"
        from_ip: "{{ item.source }}"
        comment: "{{ item.comment }}"
      loop: "{{ firewall_rules_json | from_json }}"
```

## Transforming JSON Before Looping

Often the JSON structure does not match what your loop needs. Transform it first.

```yaml
# transform-json.yml
# Transforms a JSON object into a loopable list
- name: Transform and loop over JSON
  hosts: localhost
  gather_facts: false
  vars:
    # API returns data keyed by ID
    api_response_json: |
      {
        "srv-001": {"name": "web-01", "ip": "10.0.1.10", "status": "active"},
        "srv-002": {"name": "db-01", "ip": "10.0.2.10", "status": "active"},
        "srv-003": {"name": "old-web", "ip": "10.0.1.5", "status": "decommissioned"}
      }
  tasks:
    - name: Parse JSON
      ansible.builtin.set_fact:
        servers: "{{ api_response_json | from_json }}"

    - name: Convert to list and filter active servers
      ansible.builtin.debug:
        msg: "{{ item.key }} ({{ item.value.name }}): {{ item.value.ip }}"
      loop: "{{ servers | dict2items | selectattr('value.status', 'equalto', 'active') | list }}"
```

## Nested JSON Iteration

For deeply nested JSON, you may need multiple tasks or a flattening approach.

```yaml
# nested-json.yml
# Handles nested JSON with multiple levels
- name: Process nested JSON structure
  hosts: localhost
  gather_facts: false
  vars:
    deployment_config: |
      {
        "applications": [
          {
            "name": "frontend",
            "instances": [
              {"host": "web-01", "port": 3000},
              {"host": "web-02", "port": 3000}
            ]
          },
          {
            "name": "backend",
            "instances": [
              {"host": "api-01", "port": 8080},
              {"host": "api-02", "port": 8080},
              {"host": "api-03", "port": 8080}
            ]
          }
        ]
      }
  tasks:
    - name: Parse deployment config
      ansible.builtin.set_fact:
        config: "{{ deployment_config | from_json }}"

    - name: Iterate over apps and their instances
      ansible.builtin.debug:
        msg: "{{ item.0.name }} running on {{ item.1.host }}:{{ item.1.port }}"
      loop: "{{ config.applications | subelements('instances') }}"
```

The `subelements` filter pairs each application with each of its instances, producing a flat iteration over all instances with their parent application context.

## Merging JSON from Multiple Sources

You might need to combine JSON data from different API calls or files.

```yaml
# merge-json.yml
# Merges JSON from two API calls and loops over the combined result
- name: Merge JSON data sources
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Fetch primary data
      ansible.builtin.uri:
        url: https://api.example.com/v1/servers
        return_content: true
      register: primary_data

    - name: Fetch secondary data
      ansible.builtin.uri:
        url: https://api.example.com/v2/servers
        return_content: true
      register: secondary_data

    - name: Process combined server list
      ansible.builtin.debug:
        msg: "{{ item.hostname }}"
      loop: "{{ (primary_data.json.servers + secondary_data.json.servers) | unique | list }}"
```

## Validating JSON Before Processing

Always validate JSON data before looping over it to avoid cryptic errors.

```yaml
# validate-json.yml
# Validates JSON structure before processing
- name: Validate and process JSON
  hosts: localhost
  gather_facts: false
  vars:
    json_input: "{{ lookup('file', 'data/input.json') }}"
  tasks:
    - name: Parse JSON
      ansible.builtin.set_fact:
        parsed_data: "{{ json_input | from_json }}"
      rescue:
        - name: Handle invalid JSON
          ansible.builtin.fail:
            msg: "Failed to parse JSON from data/input.json"

    - name: Validate structure
      ansible.builtin.assert:
        that:
          - parsed_data is mapping
          - parsed_data.items is defined
          - parsed_data.items | type_debug == 'list'
        fail_msg: "JSON structure does not match expected format"

    - name: Process validated data
      ansible.builtin.debug:
        msg: "{{ item.name }}"
      loop: "{{ parsed_data.items }}"
```

## Summary

Working with JSON data in Ansible loops follows a consistent pattern: load the JSON (from a file, API, or command output), parse it with `from_json` if needed, transform it into a loop-friendly structure, and iterate. The `uri` module auto-parses JSON responses. The `json_query` filter with JMESPath expressions handles complex filtering of nested structures. For nested JSON, `subelements` flattens parent-child relationships into a flat loop. Always validate your JSON structure before looping to catch issues early.
