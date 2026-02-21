# How to Use the Ansible uri Module with JSON Body

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, JSON, uri Module, REST API

Description: Master sending JSON request bodies with the Ansible uri module including nested objects, arrays, dynamic data, and templates.

---

JSON is the standard data format for modern APIs. When you interact with REST services, cloud provider APIs, or webhook endpoints from Ansible, you will be sending and receiving JSON constantly. The `uri` module has first-class support for JSON bodies, but there are nuances around data types, nested structures, and dynamic generation that are worth understanding in depth.

This post focuses specifically on working with JSON request bodies in the Ansible `uri` module.

## Basic JSON Body

The simplest way to send a JSON body is with `body_format: json` and a YAML dictionary as the body:

```yaml
# send a basic JSON body with the uri module
---
- name: JSON body basics
  hosts: localhost
  connection: local
  tasks:
    - name: Create a server record
      ansible.builtin.uri:
        url: https://api.example.com/servers
        method: POST
        body_format: json
        body:
          name: web-prod-01
          region: us-east-1
          type: t3.large
          status: provisioning
        status_code: 201
      register: result
```

When you set `body_format: json`, Ansible does two things: it serializes the `body` dictionary to a JSON string, and it sets the `Content-Type` header to `application/json`.

## Nested JSON Objects

Real API payloads are rarely flat. Here is how to handle nested structures:

```yaml
# send nested JSON objects and arrays
- name: Create deployment configuration
  ansible.builtin.uri:
    url: https://api.example.com/deployments
    method: POST
    body_format: json
    body:
      application:
        name: myapp
        version: "2.3.1"
        repository: "https://github.com/example/myapp"
      environment:
        name: production
        region: us-east-1
        cluster: prod-cluster-01
      resources:
        cpu: "2000m"
        memory: "4Gi"
        replicas: 3
      health_check:
        path: /health
        port: 3000
        interval_seconds: 30
        timeout_seconds: 5
      labels:
        team: platform
        cost_center: engineering
        managed_by: ansible
    headers:
      Authorization: "Bearer {{ api_token }}"
    status_code: 201
  register: deployment
```

YAML maps directly to JSON objects. YAML lists become JSON arrays. Ansible handles the conversion automatically.

## JSON Arrays in the Body

When the API expects an array at the top level or within objects:

```yaml
# send JSON arrays as part of the request body
- name: Create multiple records in one request
  ansible.builtin.uri:
    url: https://api.example.com/batch/servers
    method: POST
    body_format: json
    body:
      - name: web-01
        ip: 10.0.1.10
        role: web
      - name: web-02
        ip: 10.0.1.11
        role: web
      - name: db-01
        ip: 10.0.2.10
        role: database
    headers:
      Authorization: "Bearer {{ api_token }}"
    status_code: 201

# Nested arrays within objects
- name: Configure firewall rules
  ansible.builtin.uri:
    url: https://api.example.com/firewalls/fw-001/rules
    method: PUT
    body_format: json
    body:
      rules:
        - priority: 100
          action: allow
          protocol: tcp
          ports: [80, 443]
          source_ranges:
            - "10.0.0.0/8"
            - "172.16.0.0/12"
        - priority: 200
          action: allow
          protocol: tcp
          ports: [22]
          source_ranges:
            - "10.0.0.0/8"
        - priority: 65535
          action: deny
          protocol: all
          source_ranges:
            - "0.0.0.0/0"
    headers:
      Authorization: "Bearer {{ api_token }}"
    status_code: 200
```

## Dynamic JSON from Variables

Build JSON bodies from Ansible variables, facts, and computed values:

```yaml
# build JSON body dynamically from variables and facts
---
- name: Dynamic JSON body construction
  hosts: all
  vars:
    base_tags:
      environment: production
      managed_by: ansible
    extra_tags:
      project: migration
      sprint: "42"
  tasks:
    - name: Register host with dynamic metadata
      ansible.builtin.uri:
        url: https://inventory.internal/api/register
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          fqdn: "{{ ansible_fqdn }}"
          network:
            ipv4: "{{ ansible_default_ipv4.address }}"
            gateway: "{{ ansible_default_ipv4.gateway }}"
            mac: "{{ ansible_default_ipv4.macaddress }}"
          system:
            os: "{{ ansible_distribution }}"
            version: "{{ ansible_distribution_version }}"
            kernel: "{{ ansible_kernel }}"
            architecture: "{{ ansible_architecture }}"
          resources:
            cpu_count: "{{ ansible_processor_vcpus }}"
            memory_mb: "{{ ansible_memtotal_mb }}"
            disk_gb: "{{ (ansible_mounts | selectattr('mount', 'equalto', '/') | first).size_total | int / 1073741824 | round(1) }}"
          tags: "{{ base_tags | combine(extra_tags) }}"
          groups: "{{ group_names }}"
          registered_at: "{{ ansible_date_time.iso8601 }}"
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: [200, 201]
      delegate_to: localhost
```

## Using the to_json Filter

Sometimes you need to pre-serialize part of the body, or send a JSON string body:

```yaml
# use the to_json filter for manual JSON construction
---
- name: Manual JSON handling
  hosts: localhost
  connection: local
  vars:
    config_data:
      database:
        host: db.internal
        port: 5432
      cache:
        host: redis.internal
        port: 6379
  tasks:
    # Send pre-serialized JSON as a string body
    - name: Send raw JSON string
      ansible.builtin.uri:
        url: https://api.example.com/config
        method: POST
        body: "{{ config_data | to_json }}"
        headers:
          Content-Type: application/json
          Authorization: "Bearer {{ api_token }}"
        status_code: 200

    # Use to_nice_json for readable bodies in logs
    - name: Debug the JSON being sent
      ansible.builtin.debug:
        msg: "{{ config_data | to_nice_json }}"
```

The difference between using `body_format: json` with a dictionary and `to_json` with a string is subtle. The dictionary approach is cleaner, but `to_json` gives you more control when you need to pre-process the data.

## Handling JSON Data Types

YAML and JSON have similar but not identical type systems. Be careful with these edge cases:

```yaml
# handle JSON data types correctly in YAML body definitions
- name: Correct JSON types
  ansible.builtin.uri:
    url: https://api.example.com/settings
    method: PUT
    body_format: json
    body:
      # Strings - quote them to be safe
      name: "my-service"

      # Numbers - YAML handles these automatically
      port: 8080
      timeout: 30.5
      max_retries: 3

      # Booleans - use true/false (YAML auto-converts)
      enabled: true
      debug_mode: false

      # Null - use null keyword
      description: null

      # Numbers as strings (some APIs need this)
      version: "2"  # quotes force it to be a string

      # Empty objects and arrays
      metadata: {}
      tags: []

      # Boolean that should be a string "true"
      feature_flag: "true"
    headers:
      Authorization: "Bearer {{ api_token }}"
    status_code: 200
```

A common gotcha: YAML interprets `yes`, `no`, `on`, `off` as booleans. If an API field expects the string "yes", quote it: `value: "yes"`.

## Templating JSON Bodies

For complex bodies that need conditional sections or loops, use Jinja2:

```yaml
# use Jinja2 templating for complex conditional JSON bodies
---
- name: Conditional JSON body
  hosts: localhost
  connection: local
  vars:
    enable_monitoring: true
    enable_logging: true
    log_level: debug
    replicas: 3
    ports:
      - 3000
      - 3001
  tasks:
    - name: Create service with conditional configuration
      ansible.builtin.uri:
        url: https://api.example.com/services
        method: POST
        body_format: json
        body: |
          {{ {
            "name": "myapp",
            "replicas": replicas,
            "ports": ports,
            "monitoring": {
              "enabled": enable_monitoring,
              "endpoint": "/metrics",
              "interval": 30
            } if enable_monitoring else {"enabled": false},
            "logging": {
              "enabled": enable_logging,
              "level": log_level,
              "output": "elasticsearch"
            } if enable_logging else {"enabled": false}
          } | to_json }}
        headers:
          Content-Type: application/json
          Authorization: "Bearer {{ api_token }}"
        status_code: 201
```

## Reading JSON Response Bodies

When the API returns JSON, Ansible parses it automatically:

```yaml
# work with JSON response data from POST requests
---
- name: Create and use response data
  hosts: localhost
  connection: local
  tasks:
    - name: Create a deployment
      ansible.builtin.uri:
        url: https://api.example.com/deployments
        method: POST
        body_format: json
        body:
          app: myapp
          version: "2.3.1"
          environment: staging
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: 201
        return_content: true
      register: deployment

    # Access nested JSON fields from the response
    - name: Show deployment details
      ansible.builtin.debug:
        msg:
          - "Deployment ID: {{ deployment.json.id }}"
          - "Status: {{ deployment.json.status }}"
          - "URL: {{ deployment.json.endpoints.primary }}"
          - "Created: {{ deployment.json.created_at }}"

    # Use response data in subsequent requests
    - name: Add monitoring to deployment
      ansible.builtin.uri:
        url: "https://api.example.com/deployments/{{ deployment.json.id }}/monitoring"
        method: POST
        body_format: json
        body:
          alerts:
            - type: error_rate
              threshold: 5
              window_minutes: 5
            - type: latency_p99
              threshold: 500
              window_minutes: 10
        headers:
          Authorization: "Bearer {{ api_token }}"
        status_code: 201
```

## Practical Example: Full API Workflow

Here is a complete example that demonstrates multiple JSON body patterns in a real workflow:

```yaml
# complete API workflow with various JSON body patterns
---
- name: Provision cloud infrastructure via API
  hosts: localhost
  connection: local
  vars:
    api_base: https://cloud.example.com/api/v2
    project_name: web-platform
  tasks:
    - name: Authenticate and get token
      ansible.builtin.uri:
        url: "{{ api_base }}/auth/token"
        method: POST
        body_format: json
        body:
          client_id: "{{ vault_client_id }}"
          client_secret: "{{ vault_client_secret }}"
        status_code: 200
        return_content: true
      register: auth
      no_log: true

    - name: Create VPC
      ansible.builtin.uri:
        url: "{{ api_base }}/vpcs"
        method: POST
        body_format: json
        body:
          name: "{{ project_name }}-vpc"
          cidr: "10.0.0.0/16"
          region: us-east-1
          subnets:
            - name: public-a
              cidr: "10.0.1.0/24"
              zone: us-east-1a
              public: true
            - name: private-a
              cidr: "10.0.10.0/24"
              zone: us-east-1a
              public: false
        headers:
          Authorization: "Bearer {{ auth.json.token }}"
        status_code: 201
        return_content: true
      register: vpc

    - name: Create compute instances
      ansible.builtin.uri:
        url: "{{ api_base }}/instances"
        method: POST
        body_format: json
        body:
          name: "{{ project_name }}-web-{{ item }}"
          vpc_id: "{{ vpc.json.id }}"
          subnet: public-a
          instance_type: t3.medium
          image: ubuntu-22.04
          key_name: ansible-deploy
          security_groups:
            - web-public
            - monitoring
          tags:
            project: "{{ project_name }}"
            role: web
            index: "{{ item }}"
        headers:
          Authorization: "Bearer {{ auth.json.token }}"
        status_code: 201
      loop: "{{ range(1, 4) | list }}"
      register: instances

    - name: Show created instances
      ansible.builtin.debug:
        msg: "Created {{ item.json.name }} at {{ item.json.public_ip }}"
      loop: "{{ instances.results }}"
```

## Summary

Sending JSON bodies with the Ansible `uri` module is straightforward once you understand the mapping between YAML and JSON. Use `body_format: json` with a YAML dictionary for most cases. Be mindful of data types, especially strings vs numbers and boolean edge cases. Build dynamic bodies from Ansible variables and facts. Use `return_content: true` to access JSON response data for subsequent requests. For complex conditional bodies, Jinja2 expressions combined with the `to_json` filter give you full control. Always set `no_log: true` when the JSON body contains secrets like credentials or tokens.
