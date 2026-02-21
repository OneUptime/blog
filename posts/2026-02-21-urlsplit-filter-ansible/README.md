# How to Use the urlsplit Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Networking

Description: Learn how to use the urlsplit filter in Ansible to parse URLs into their component parts for flexible network configuration.

---

When you work with URLs in Ansible playbooks and templates, you frequently need to extract specific parts: the hostname, port number, path, query parameters, or scheme. Instead of writing fragile regex patterns to parse URLs, Ansible provides the `urlsplit` filter that breaks a URL into its standard components. This is invaluable when you receive full URLs from one source but need individual pieces for another.

## Basic Usage

The `urlsplit` filter parses a URL and returns a dictionary with its components:

```jinja2
{# Parse a URL into its parts #}
{{ "https://api.example.com:8443/v1/users?active=true#section1" | urlsplit }}
```

This returns a dictionary with the following keys:

```json
{
    "scheme": "https",
    "netloc": "api.example.com:8443",
    "hostname": "api.example.com",
    "port": 8443,
    "path": "/v1/users",
    "query": "active=true",
    "fragment": "section1",
    "username": null,
    "password": null
}
```

## Extracting Specific Components

You can pass a component name to get just that part:

```jinja2
{# Extract individual URL components #}
{{ "https://api.example.com:8443/v1/users" | urlsplit('hostname') }}
{# Output: api.example.com #}

{{ "https://api.example.com:8443/v1/users" | urlsplit('port') }}
{# Output: 8443 #}

{{ "https://api.example.com:8443/v1/users" | urlsplit('scheme') }}
{# Output: https #}

{{ "https://api.example.com:8443/v1/users" | urlsplit('path') }}
{# Output: /v1/users #}
```

## Practical Example: Database Connection Parsing

Suppose your database connection string comes from an environment variable or a vault, and you need the individual components for a configuration template:

```yaml
# db_config.yml - Parse database URL into components
- name: Configure database connection
  hosts: app_servers
  vars:
    database_url: "postgresql://dbuser:dbpass@db-primary.internal:5432/myapp_production?sslmode=require"
  tasks:
    - name: Parse database URL
      ansible.builtin.set_fact:
        db_host: "{{ database_url | urlsplit('hostname') }}"
        db_port: "{{ database_url | urlsplit('port') }}"
        db_user: "{{ database_url | urlsplit('username') }}"
        db_pass: "{{ database_url | urlsplit('password') }}"
        db_path: "{{ database_url | urlsplit('path') }}"
        db_query: "{{ database_url | urlsplit('query') }}"

    - name: Extract database name from path
      ansible.builtin.set_fact:
        db_name: "{{ db_path | regex_replace('^/', '') }}"

    - name: Generate application config
      ansible.builtin.template:
        src: db_config.ini.j2
        dest: /etc/myapp/database.ini
```

```jinja2
{# db_config.ini.j2 - Database configuration from parsed URL #}
[database]
host = {{ db_host }}
port = {{ db_port }}
username = {{ db_user }}
password = {{ db_pass }}
database = {{ db_name }}
sslmode = {{ db_query | regex_search('sslmode=([^&]+)', '\\1') | first | default('prefer') }}
```

## Parsing Redis Connection URLs

```yaml
# redis_config.yml - Parse Redis URL
- name: Configure Redis connection
  hosts: app_servers
  vars:
    redis_url: "redis://:secretpass@redis.internal:6379/2"
  tasks:
    - name: Extract Redis connection details
      ansible.builtin.set_fact:
        redis_host: "{{ redis_url | urlsplit('hostname') }}"
        redis_port: "{{ redis_url | urlsplit('port') | default(6379) }}"
        redis_password: "{{ redis_url | urlsplit('password') }}"
        redis_db: "{{ (redis_url | urlsplit('path') | regex_replace('^/', '')) | default('0') }}"

    - name: Generate Redis config snippet
      ansible.builtin.template:
        src: redis_client.conf.j2
        dest: /etc/myapp/redis.conf
```

```jinja2
{# redis_client.conf.j2 - Redis client configuration #}
redis_host = {{ redis_host }}
redis_port = {{ redis_port }}
{% if redis_password %}
redis_password = {{ redis_password }}
{% endif %}
redis_database = {{ redis_db }}
```

## Template Example: Nginx Reverse Proxy from URL

Generate Nginx reverse proxy configuration based on upstream URLs:

```yaml
# nginx_proxy.yml - Generate reverse proxy from service URLs
- name: Configure Nginx reverse proxy
  hosts: web_servers
  vars:
    backend_services:
      - name: api
        url: "http://api.internal:8080/v1"
        location: "/api/"
      - name: auth
        url: "https://auth.internal:9443/auth"
        location: "/auth/"
      - name: websocket
        url: "ws://realtime.internal:3000/ws"
        location: "/ws/"
  tasks:
    - name: Generate Nginx config
      ansible.builtin.template:
        src: nginx_proxy.conf.j2
        dest: /etc/nginx/conf.d/proxy.conf
      notify: Reload Nginx
```

```jinja2
{# nginx_proxy.conf.j2 - Reverse proxy config from parsed URLs #}
{% for service in backend_services %}
{% set scheme = service.url | urlsplit('scheme') %}
{% set host = service.url | urlsplit('hostname') %}
{% set port = service.url | urlsplit('port') %}
{% set path = service.url | urlsplit('path') %}

upstream {{ service.name }}_backend {
    server {{ host }}:{{ port }};
}

location {{ service.location }} {
{% if scheme == 'ws' or scheme == 'wss' %}
    proxy_pass http://{{ service.name }}_backend{{ path }};
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
{% else %}
    proxy_pass {{ scheme }}://{{ service.name }}_backend{{ path }};
{% endif %}
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

{% endfor %}
```

## Handling URLs Without Explicit Ports

When a URL does not include a port, `urlsplit('port')` returns `None`. You need to handle this gracefully:

```jinja2
{# Handle missing port by defaulting based on scheme #}
{% set url = service_url | urlsplit %}
{% set port = url.port | default(443 if url.scheme == 'https' else 80) %}

server {{ url.hostname }}:{{ port }};
```

In a playbook:

```yaml
# default_ports.yml - Handle URLs with implicit ports
- name: Parse URL with default port logic
  ansible.builtin.set_fact:
    parsed_url: "{{ service_url | urlsplit }}"

- name: Set port with scheme-based default
  ansible.builtin.set_fact:
    service_port: >-
      {{ parsed_url.port
         | default(443 if parsed_url.scheme == 'https' else 80) }}
```

## Parsing Multiple URLs

Process a list of URLs to extract specific components:

```yaml
# parse_urls.yml - Parse multiple URLs
- name: Configure monitoring endpoints
  hosts: monitoring
  vars:
    health_check_urls:
      - "https://web.example.com:8080/health"
      - "https://api.example.com/health"
      - "http://internal.example.com:3000/status"
  tasks:
    - name: Extract hostnames from health check URLs
      ansible.builtin.set_fact:
        monitored_hosts: "{{ health_check_urls | map('urlsplit', 'hostname') | list }}"

    - name: Display monitored hosts
      ansible.builtin.debug:
        var: monitored_hosts
      # Output: ['web.example.com', 'api.example.com', 'internal.example.com']
```

Using `map('urlsplit', 'hostname')` applies the filter to each URL in the list.

## Building URLs from Components

While `urlsplit` breaks URLs apart, you can also use it to modify and reconstruct URLs:

```yaml
# modify_url.yml - Modify URL components
- name: Modify service URL for different environment
  ansible.builtin.set_fact:
    original_url: "https://api.production.example.com:8443/v1/data"
    parsed: "{{ original_url | urlsplit }}"

- name: Build new URL for staging
  ansible.builtin.set_fact:
    staging_url: "{{ parsed.scheme }}://api.staging.example.com:{{ parsed.port }}{{ parsed.path }}"

- name: Display both URLs
  ansible.builtin.debug:
    msg: |
      Production: {{ original_url }}
      Staging: {{ staging_url }}
```

## Validating URLs

Use `urlsplit` to validate that a URL has the required components:

```yaml
# validate_urls.yml - Validate URL format
- name: Validate service endpoint URLs
  ansible.builtin.assert:
    that:
      - item | urlsplit('scheme') in ['http', 'https']
      - item | urlsplit('hostname') | length > 0
      - item | urlsplit('path') | length > 0
    fail_msg: "Invalid URL: {{ item }}"
    success_msg: "URL is valid: {{ item }}"
  loop: "{{ service_endpoints }}"
```

## Using urlsplit with Consul/Service Discovery

Parse service discovery URLs to configure connections:

```yaml
# service_discovery.yml - Parse discovered service URLs
- name: Get service URLs from Consul
  ansible.builtin.shell: >
    consul catalog services -format=json | jq -r '.[].ServiceAddress'
  register: consul_urls
  changed_when: false

- name: Parse and organize services
  ansible.builtin.set_fact:
    services_by_host: {}

- name: Group services by hostname
  ansible.builtin.set_fact:
    services_by_host: >-
      {{ services_by_host | combine({
        item | urlsplit('hostname'): (services_by_host[item | urlsplit('hostname')] | default([])) + [item]
      }) }}
  loop: "{{ consul_urls.stdout_lines }}"
```

## Wrapping Up

The `urlsplit` filter saves you from writing regex patterns to parse URLs. It reliably breaks any URL into its standard components (scheme, hostname, port, path, query, fragment, username, password) and works with HTTP, HTTPS, database connection strings, Redis URLs, and any other standard URL format. Whether you are generating reverse proxy configurations, parsing database connections, or validating service endpoints, `urlsplit` gives you clean access to every part of a URL.
