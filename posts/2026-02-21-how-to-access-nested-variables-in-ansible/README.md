# How to Access Nested Variables in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Data Structures, Jinja2, DevOps

Description: Learn how to access deeply nested variables in Ansible using dot notation, bracket notation, and filters for safe traversal of complex data structures.

---

Ansible variables are not always flat key-value pairs. In real-world playbooks, you deal with nested dictionaries, lists of dictionaries, and deeply nested structures from API responses, cloud provider data, and application configurations. Accessing the right value at the right depth without causing undefined variable errors requires knowing the different access patterns Ansible supports. In this post, I will cover every method for working with nested variables.

## Dot Notation vs Bracket Notation

Ansible supports two syntaxes for accessing nested values:

```yaml
---
# access-patterns.yml
# Two ways to access the same nested value

- hosts: localhost
  vars:
    server:
      hostname: web01.example.com
      network:
        ip_address: 10.0.1.10
        subnet: 255.255.255.0
        gateway: 10.0.1.1
      ports:
        - 80
        - 443
        - 8080

  tasks:
    # Dot notation - cleaner and more common
    - name: Access with dot notation
      debug:
        msg: "IP: {{ server.network.ip_address }}"

    # Bracket notation - works with special characters and variables as keys
    - name: Access with bracket notation
      debug:
        msg: "IP: {{ server['network']['ip_address'] }}"

    # Access list items by index
    - name: Access first port
      debug:
        msg: "First port: {{ server.ports[0] }}"

    # Mix both notations
    - name: Mixed notation
      debug:
        msg: "Gateway: {{ server['network'].gateway }}"
```

## When to Use Bracket Notation

Dot notation is cleaner, but bracket notation is necessary in several situations:

```yaml
---
# bracket-necessary.yml
# Cases where bracket notation is required

- hosts: localhost
  vars:
    # Keys with hyphens, dots, or spaces
    cloud_config:
      "us-east-1":
        instance_count: 5
      "eu-west-1":
        instance_count: 3

    # Keys that are numbers
    error_codes:
      404: "Not Found"
      500: "Internal Server Error"

    # Keys stored in variables
    target_region: "us-east-1"

  tasks:
    # Hyphenated keys require bracket notation
    - name: Access hyphenated key
      debug:
        msg: "US East instances: {{ cloud_config['us-east-1'].instance_count }}"

    # Number keys require bracket notation
    - name: Access numeric key
      debug:
        msg: "404 means: {{ error_codes[404] }}"

    # Dynamic key access using a variable
    - name: Access key from a variable
      debug:
        msg: "Target region instances: {{ cloud_config[target_region].instance_count }}"
```

## Safely Accessing Nested Variables

The biggest challenge with nested access is that any level in the chain might be undefined. Here are techniques to handle this safely.

### Using default at Each Level

```yaml
---
# safe-access.yml
# Safely traverse nested structures

- hosts: localhost
  vars:
    config:
      database:
        host: db.example.com
      # Note: no 'cache' section exists

  tasks:
    # This will fail because config.cache does not exist
    # - debug:
    #     msg: "{{ config.cache.host }}"

    # Safe access by defaulting the missing intermediate level to an empty dict
    - name: Safe access to missing section
      debug:
        msg: "Cache host: {{ (config.cache | default({})).host | default('localhost') }}"

    # Even safer: default the whole chain
    - name: Very safe nested access
      debug:
        msg: "Cache host: {{ config | default({}) | community.general.json_query('cache.host') | default('localhost', true) }}"
```

### Using the Ansible-Specific ternary Pattern

```yaml
    # Check if the key exists before accessing it
    - name: Conditional nested access
      debug:
        msg: >-
          Cache host: {{
            config.cache.host
            if (config.cache is defined and config.cache.host is defined)
            else 'localhost'
          }}
```

### Setting Fallback Variables with set_fact

```yaml
    # Set a computed fact with safe access
    - name: Safely extract nested value
      set_fact:
        cache_host: >-
          {% if config.cache is defined and config.cache.host is defined %}
          {{ config.cache.host }}
          {% else %}
          localhost
          {% endif %}
```

## Accessing Nested Values from Ansible Facts

System facts are deeply nested. Here are common access patterns:

```yaml
---
# fact-access.yml
# Accessing nested system facts

- hosts: webservers
  tasks:
    # Network interface details
    - name: Get primary IP address
      debug:
        msg: "Primary IP: {{ ansible_default_ipv4.address }}"

    # Disk information
    - name: Show root filesystem usage
      debug:
        msg: |
          Root device: {{ ansible_mounts | selectattr('mount', 'eq', '/') | map(attribute='device') | first }}
          Size: {{ ansible_mounts | selectattr('mount', 'eq', '/') | map(attribute='size_total') | first | human_readable }}
          Available: {{ ansible_mounts | selectattr('mount', 'eq', '/') | map(attribute='size_available') | first | human_readable }}

    # CPU details
    - name: Show CPU info
      debug:
        msg: |
          CPUs: {{ ansible_processor_vcpus }}
          Architecture: {{ ansible_architecture }}
          Model: {{ ansible_processor[2] | default('Unknown') }}

    # Memory
    - name: Show memory
      debug:
        msg: "Total RAM: {{ ansible_memtotal_mb }}MB, Free: {{ ansible_memfree_mb }}MB"
```

## Looping Over Nested Structures

Working with lists of dictionaries is extremely common:

```yaml
---
# nested-loops.yml
# Iterate over nested data structures

- hosts: localhost
  vars:
    applications:
      - name: frontend
        port: 3000
        env_vars:
          NODE_ENV: production
          API_URL: https://api.example.com
        workers: 4

      - name: backend
        port: 8080
        env_vars:
          DATABASE_URL: postgresql://localhost/myapp
          REDIS_URL: redis://localhost:6379
        workers: 8

      - name: scheduler
        port: 0
        env_vars:
          DATABASE_URL: postgresql://localhost/myapp
        workers: 1

  tasks:
    # Simple loop accessing nested values
    - name: Show application ports
      debug:
        msg: "{{ item.name }} runs on port {{ item.port }} with {{ item.workers }} workers"
      loop: "{{ applications }}"

    # Nested loop using subelements
    - name: Show all environment variables for each app
      debug:
        msg: "{{ item.0.name }}: {{ item.1.key }}={{ item.1.value }}"
      loop: "{{ applications | subelements('env_vars | dict2items') }}"
      # Note: subelements works with list attributes, for dicts use dict2items first

    # Alternative: use with_items and dict2items in the message
    - name: Show environment variables per application
      debug:
        msg: |
          Application: {{ item.name }}
          Environment:
          {% for key, value in item.env_vars.items() %}
            {{ key }}={{ value }}
          {% endfor %}
      loop: "{{ applications }}"

    # Filter to find specific applications
    - name: Get backend application config
      set_fact:
        backend_config: "{{ applications | selectattr('name', 'eq', 'backend') | first }}"

    - name: Show backend workers
      debug:
        msg: "Backend workers: {{ backend_config.workers }}"
```

## Accessing Nested Values in Templates

Templates often need to traverse complex structures:

```nginx
# templates/nginx-upstreams.conf.j2
# Generate nginx upstream blocks from nested variable data

{% for app in applications %}
{% if app.port > 0 %}
upstream {{ app.name }}_backend {
    {% for i in range(app.workers) %}
    server 127.0.0.1:{{ app.port + i }};
    {% endfor %}
}
{% endif %}
{% endfor %}

{% for app in applications %}
{% if app.port > 0 %}
server {
    listen 80;
    server_name {{ app.name }}.{{ domain | default('example.com') }};

    location / {
        proxy_pass http://{{ app.name }}_backend;
        {% if app.env_vars.get('CORS_ORIGIN') is defined %}
        add_header Access-Control-Allow-Origin {{ app.env_vars.CORS_ORIGIN }};
        {% endif %}
    }
}
{% endif %}
{% endfor %}
```

## Working with API Responses

API responses from the uri module are often deeply nested:

```yaml
---
# api-nested.yml
# Parse nested API response data

- hosts: localhost
  tasks:
    - name: Get Kubernetes pods info
      uri:
        url: "https://k8s-api.example.com/api/v1/namespaces/default/pods"
        headers:
          Authorization: "Bearer {{ k8s_token }}"
        return_content: yes
      register: pods_response

    # Access the nested items list
    - name: Extract pod names and statuses
      set_fact:
        pod_info: >-
          {{
            pods_response.json.items
            | map(attribute='metadata.name')
            | list
          }}

    # Extract more complex nested data
    - name: Get pod container images
      debug:
        msg: |
          Pod: {{ item.metadata.name }}
          Containers: {{ item.spec.containers | map(attribute='image') | join(', ') }}
          Status: {{ item.status.phase }}
      loop: "{{ pods_response.json.items }}"
      loop_control:
        label: "{{ item.metadata.name }}"
```

## Using json_query for Complex Nested Access

The `json_query` filter (from `community.general`) uses JMESPath expressions for powerful nested data access:

```yaml
---
# json-query.yml
# Use json_query for complex nested data extraction

- hosts: localhost
  vars:
    cloud_inventory:
      regions:
        - name: us-east-1
          instances:
            - id: i-001
              type: t3.large
              state: running
              tags: {role: web, env: prod}
            - id: i-002
              type: t3.medium
              state: stopped
              tags: {role: worker, env: prod}
        - name: eu-west-1
          instances:
            - id: i-003
              type: t3.large
              state: running
              tags: {role: web, env: staging}

  tasks:
    # Get all running instance IDs across all regions
    - name: Find all running instances
      set_fact:
        running_ids: "{{ cloud_inventory | community.general.json_query('regions[].instances[?state==`running`].id[]') }}"

    - name: Show running instances
      debug:
        var: running_ids
    # Output: ["i-001", "i-003"]

    # Get all web servers in production
    - name: Find production web servers
      set_fact:
        prod_web: "{{ cloud_inventory | community.general.json_query('regions[].instances[?tags.role==`web` && tags.env==`prod`].id[]') }}"

    - name: Show production web servers
      debug:
        var: prod_web
    # Output: ["i-001"]
```

## Wrapping Up

Accessing nested variables in Ansible requires knowing which notation to use and how to handle missing keys safely. Use dot notation for clean, readable access when keys are simple strings. Switch to bracket notation for keys with special characters or when using variables as keys. Always use `default({})` on intermediate levels when traversing potentially incomplete structures. And reach for `json_query` when you need to extract data from deeply nested structures with complex conditions. Getting comfortable with these patterns is essential for working with real-world data in Ansible playbooks.
