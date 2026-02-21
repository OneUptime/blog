# How to Use the urlencode Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Networking, URLs

Description: Learn how to use the urlencode filter in Ansible to safely encode strings for use in URLs, query parameters, and API requests.

---

URLs have strict rules about which characters are allowed. Spaces, special characters, and non-ASCII characters need to be percent-encoded before they can be used in a URL. The `urlencode` filter in Ansible handles this encoding for you, converting unsafe characters into their percent-encoded equivalents. This is essential when building URLs dynamically, constructing query strings, or making API calls with user-provided data.

## Basic Usage

The `urlencode` filter converts a string into a URL-safe format:

```jinja2
{# Encode a string for use in a URL #}
{{ "hello world" | urlencode }}
{# Output: hello%20world #}

{{ "user@example.com" | urlencode }}
{# Output: user%40example.com #}

{{ "price=100&currency=USD" | urlencode }}
{# Output: price%3D100%26currency%3DUSD #}
```

Special characters like spaces, `@`, `=`, `&`, `?`, and `#` are replaced with their percent-encoded versions.

## Building Query Strings

The most common use case is constructing URLs with query parameters:

```yaml
# api_call.yml - Build URL with encoded query parameters
- name: Search API with encoded parameters
  ansible.builtin.uri:
    url: "https://api.example.com/v1/search?q={{ search_term | urlencode }}&category={{ category | urlencode }}"
    method: GET
    headers:
      Authorization: "Bearer {{ api_token }}"
  register: search_results
  vars:
    search_term: "server error 500"
    category: "logs & events"
```

Without `urlencode`, the space in "server error 500" and the `&` in "logs & events" would break the URL structure. The encoded URL becomes:

```
https://api.example.com/v1/search?q=server%20error%20500&category=logs%20%26%20events
```

## Encoding Dictionary Data as Query Strings

When you have a dictionary of parameters, you can encode them all:

```yaml
# query_params.yml - Encode dictionary as query string
- name: Build API URL with multiple parameters
  hosts: localhost
  vars:
    api_params:
      search: "disk space warning"
      severity: "high"
      from: "2025-01-01T00:00:00Z"
      to: "2025-01-31T23:59:59Z"
      tags: "production,web-tier"
  tasks:
    - name: Build query string from dictionary
      ansible.builtin.set_fact:
        query_string: "{% for key, value in api_params.items() %}{{ key }}={{ value | urlencode }}{% if not loop.last %}&{% endif %}{% endfor %}"

    - name: Make API call
      ansible.builtin.uri:
        url: "https://api.example.com/v1/alerts?{{ query_string }}"
        method: GET
      register: alerts
```

## Practical Example: Webhook Notifications

When sending webhook notifications, URLs often contain data that needs encoding:

```yaml
# webhook_notify.yml - Send encoded webhook notifications
- name: Send deployment notification
  ansible.builtin.uri:
    url: >-
      https://hooks.slack.com/triggers/T0123/webhook?
      text={{ notification_text | urlencode }}&
      channel={{ slack_channel | urlencode }}
    method: POST
  vars:
    notification_text: "Deployment complete: v2.1.0 deployed to production (3 servers)"
    slack_channel: "#ops-alerts"
```

## Encoding File Paths in URLs

When constructing URLs that include file paths, special characters in path components need encoding:

```yaml
# file_api.yml - Access files via API with encoded paths
- name: Download file with special characters in name
  ansible.builtin.get_url:
    url: "https://files.example.com/api/download/{{ file_path | urlencode }}"
    dest: "/tmp/{{ file_name }}"
  vars:
    file_path: "reports/Q1 2025/Sales Report (Final).pdf"
    file_name: "sales_report.pdf"
```

## Using urlencode in Templates

You can use `urlencode` in Jinja2 templates to generate properly encoded links:

```yaml
# monitoring_links.yml - Generate monitoring dashboard links
- name: Generate monitoring page
  hosts: localhost
  vars:
    services:
      - name: "Web API (Production)"
        host: "web-api.prod.internal"
        port: 8080
      - name: "Auth Service v2.0"
        host: "auth.prod.internal"
        port: 9090
      - name: "Background Workers [Queue]"
        host: "workers.prod.internal"
        port: 3000
  tasks:
    - name: Generate monitoring dashboard HTML
      ansible.builtin.template:
        src: dashboard.html.j2
        dest: /var/www/monitoring/index.html
```

```jinja2
{# dashboard.html.j2 - Monitoring links with encoded parameters #}
<!DOCTYPE html>
<html>
<head><title>Service Monitoring</title></head>
<body>
<h1>Service Dashboard</h1>
<ul>
{% for service in services %}
  <li>
    <a href="https://grafana.internal/d/app-dashboard?var-service={{ service.name | urlencode }}&var-host={{ service.host | urlencode }}">
      {{ service.name }}
    </a>
    -
    <a href="https://kibana.internal/app/discover#/?_a=(query:(query_string:(query:'host:{{ service.host | urlencode }}')))">
      Logs
    </a>
  </li>
{% endfor %}
</ul>
</body>
</html>
```

## Encoding Credentials in URLs

Some protocols accept credentials embedded in URLs. While this is not recommended for security reasons, it is sometimes necessary:

```yaml
# encoded_creds.yml - Encode credentials in connection strings
- name: Build connection string with encoded special characters
  ansible.builtin.set_fact:
    # If password contains special characters like @, #, or /
    encoded_password: "{{ db_password | urlencode }}"
    connection_string: "postgresql://{{ db_user }}:{{ db_password | urlencode }}@{{ db_host }}:{{ db_port }}/{{ db_name }}"
  vars:
    db_user: "myapp"
    db_password: "p@ss/w0rd#123"  # Contains @, /, and #
    db_host: "db.internal"
    db_port: "5432"
    db_name: "production"
```

Without encoding, the `@` in the password would be interpreted as the separator between credentials and hostname. After encoding:

```
postgresql://myapp:p%40ss%2Fw0rd%23123@db.internal:5432/production
```

## Generating Curl Commands in Templates

When generating curl commands for documentation or scripts:

```jinja2
{# curl_commands.sh.j2 - Generate curl commands with encoded parameters #}
#!/bin/bash
# API testing script - Generated by Ansible

# Search for alerts
curl -s -H "Authorization: Bearer ${API_TOKEN}" \
  "https://api.example.com/v1/alerts?severity={{ alert_severity | urlencode }}&from={{ start_date | urlencode }}"

# Create a new resource
curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  "https://api.example.com/v1/resources?name={{ resource_name | urlencode }}&tags={{ resource_tags | join(',') | urlencode }}" \
  -d '{{ resource_body | to_json }}'
```

## Encoding in Prometheus Queries

Prometheus PromQL queries in API calls need encoding:

```yaml
# prometheus_query.yml - Query Prometheus with encoded PromQL
- name: Run Prometheus query
  ansible.builtin.uri:
    url: "https://prometheus.internal/api/v1/query?query={{ promql_query | urlencode }}"
    method: GET
  register: prom_result
  vars:
    promql_query: 'rate(http_requests_total{job="web-api",code=~"5.."}[5m])'
```

PromQL contains curly braces, quotes, and other special characters that would break the URL without encoding.

## Encoding Data for Grafana API

```yaml
# grafana_search.yml - Search Grafana dashboards with encoded terms
- name: Search for dashboards
  ansible.builtin.uri:
    url: "https://grafana.internal/api/search?query={{ dashboard_search | urlencode }}&type=dash-db"
    method: GET
    headers:
      Authorization: "Bearer {{ grafana_api_key }}"
  register: dashboard_results
  vars:
    dashboard_search: "Production Overview (v2)"
```

## Encoding in Ansible Tower/AWX Callbacks

```yaml
# awx_callback.yml - Callback to AWX with encoded data
- name: Send callback to AWX
  ansible.builtin.uri:
    url: >-
      https://awx.internal/api/v2/job_templates/{{ template_id }}/callback/
      ?host_config_key={{ callback_key | urlencode }}
    method: POST
    body:
      extra_vars:
        deploy_result: "{{ deploy_status }}"
    body_format: json
```

## urlencode with Lists

When you need to pass list data as query parameters:

```yaml
# list_params.yml - Encode list data for URL parameters
- name: Build URL with repeated parameters
  ansible.builtin.set_fact:
    tag_params: "{% for tag in tags %}tag={{ tag | urlencode }}{% if not loop.last %}&{% endif %}{% endfor %}"
  vars:
    tags:
      - "web server"
      - "production (US)"
      - "tier-1"

# Result: tag=web%20server&tag=production%20%28US%29&tag=tier-1
```

## Common Characters and Their Encoded Forms

| Character | Encoded | Why It Needs Encoding |
|-----------|---------|----------------------|
| Space | %20 | Separates URL components |
| & | %26 | Separates query parameters |
| = | %3D | Separates key from value |
| ? | %3F | Starts query string |
| # | %23 | Starts fragment |
| / | %2F | Path separator |
| @ | %40 | Separates user from host |
| + | %2B | Sometimes interpreted as space |
| % | %25 | Escape character itself |

## Wrapping Up

The `urlencode` filter is a small but critical tool for building URLs safely in Ansible. Whenever you construct a URL that includes variable data, especially user-provided input, file paths, search terms, or credentials, use `urlencode` to make sure special characters do not break the URL structure. It is one of those filters that prevents subtle bugs that only manifest when your data happens to contain the wrong characters at the wrong time.
