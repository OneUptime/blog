# How to Use the regex_replace Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Regex

Description: Learn how to use the regex_replace filter in Ansible templates to perform pattern-based string transformations on your variables.

---

When you need to transform strings in Ansible templates and simple string operations are not enough, `regex_replace` is the filter to reach for. It lets you match a pattern using regular expressions and replace it with a new string, complete with capture group support. This is invaluable for tasks like sanitizing hostnames, reformatting version strings, stripping unwanted characters, and normalizing data from different sources.

## Basic Syntax

The `regex_replace` filter takes two required arguments: the pattern to match and the replacement string.

```jinja2
{# Replace all digits with X #}
{{ "abc123def456" | regex_replace('[0-9]', 'X') }}
{# Output: abcXXXdefXXX #}
```

The pattern uses Python regular expression syntax (since Ansible runs on Python). All occurrences of the pattern are replaced by default.

## Common Use Cases

### Sanitizing Hostnames

When generating configuration files, you often need to derive identifiers from hostnames. For example, removing dots from a hostname to create a valid identifier:

```jinja2
{# Convert hostname to a valid identifier by replacing non-alphanumeric chars #}
{% set clean_name = inventory_hostname | regex_replace('[^a-zA-Z0-9]', '_') %}
metric_prefix = {{ clean_name }}
{# Input: web-server.prod.example.com -> Output: web_server_prod_example_com #}
```

### Extracting and Reformatting Version Strings

```jinja2
{# Convert version string from "v2.14.3-beta" to "2.14.3" #}
{{ app_version | regex_replace('^v([0-9.]+).*$', '\\1') }}
{# Output: 2.14.3 #}
```

Notice the double backslash `\\1` for capture group references. In Jinja2 templates, you need to escape the backslash.

### Normalizing File Paths

```jinja2
{# Remove trailing slashes from a path #}
{{ base_path | regex_replace('/+$', '') }}

{# Replace multiple consecutive slashes with a single one #}
{{ file_path | regex_replace('/+', '/') }}
```

## Using Capture Groups

Capture groups let you rearrange parts of the matched string. This is where `regex_replace` really shines.

```jinja2
{# Swap "last, first" format to "first last" #}
{{ "Doe, John" | regex_replace('^(\\w+),\\s*(\\w+)$', '\\2 \\1') }}
{# Output: John Doe #}
```

Here is a more practical example. Say you have database connection strings in one format and need to convert them to another:

```yaml
# vars
db_connection: "postgresql://dbuser:dbpass@db-host.internal:5432/mydb"
```

```jinja2
{# Extract just the host and port from a connection string #}
{% set db_host_port = db_connection | regex_replace('^.*@([^/]+)/.*$', '\\1') %}
database_host = {{ db_host_port }}
{# Output: database_host = db-host.internal:5432 #}

{# Extract just the database name #}
{% set db_name = db_connection | regex_replace('^.*/([^?]+).*$', '\\1') %}
database_name = {{ db_name }}
{# Output: database_name = mydb #}
```

## Practical Example: Generating Prometheus Scrape Configs

Let us build a real-world template that uses `regex_replace` to generate Prometheus scrape configurations from inventory data:

```yaml
# monitoring.yml - Generate Prometheus config
- name: Generate Prometheus scrape configs
  hosts: monitoring
  vars:
    scrape_targets:
      - name: "Web Servers (Production)"
        targets:
          - "web-1.prod.example.com:9100"
          - "web-2.prod.example.com:9100"
          - "web-3.prod.example.com:9100"
      - name: "API Servers [v2]"
        targets:
          - "api-1.prod.example.com:9100"
          - "api-2.prod.example.com:9100"
  tasks:
    - name: Render Prometheus config
      ansible.builtin.template:
        src: prometheus.yml.j2
        dest: /etc/prometheus/prometheus.yml
```

```jinja2
{# prometheus.yml.j2 - Prometheus config with sanitized job names #}
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
{% for group in scrape_targets %}
{# Sanitize the group name to create a valid Prometheus job name #}
{# Remove special chars, convert spaces to underscores, lowercase everything #}
{% set job_name = group.name | lower | regex_replace('[^a-z0-9\\s]', '') | regex_replace('\\s+', '_') %}
  - job_name: '{{ job_name }}'
    static_configs:
      - targets:
{% for target in group.targets %}
          - '{{ target }}'
{% endfor %}
{% endfor %}
```

The group names like "Web Servers (Production)" and "API Servers [v2]" get transformed to `web_servers_production` and `api_servers_v2`, which are valid Prometheus job names.

## Case-Insensitive Matching

You can use inline regex flags for case-insensitive matching:

```jinja2
{# Case-insensitive replacement using (?i) flag #}
{{ "Hello WORLD hello" | regex_replace('(?i)hello', 'hi') }}
{# Output: hi WORLD hi #}
```

## Multiline Matching

For multiline strings, use the `(?m)` flag to make `^` and `$` match line boundaries:

```jinja2
{# Add a comment prefix to every line of a multiline string #}
{{ multiline_text | regex_replace('(?m)^', '# ') }}
```

## Using regex_replace in Playbook Tasks

The filter works outside of templates too, directly in task parameters:

```yaml
# tasks.yml - Using regex_replace in task parameters
- name: Set hostname based on inventory name
  ansible.builtin.hostname:
    name: "{{ inventory_hostname | regex_replace('\\.example\\.com$', '') }}"
  # Strips the domain suffix from the FQDN

- name: Create safe backup filename
  ansible.builtin.copy:
    src: /etc/myapp/config.yml
    dest: "/backup/{{ ansible_date_time.iso8601 | regex_replace('[:]', '-') }}_config.yml"
    remote_src: true
  # Replaces colons in the ISO timestamp so it's a valid filename

- name: Set fact with cleaned value
  ansible.builtin.set_fact:
    clean_version: "{{ raw_version | regex_replace('^v', '') | regex_replace('-.*$', '') }}"
  # Strips "v" prefix and anything after a hyphen (like -beta, -rc1)
```

## Chaining Multiple regex_replace Calls

For complex transformations, chain multiple `regex_replace` calls:

```jinja2
{# Transform a CamelCase string to snake_case #}
{% set input = "MyApplicationConfig" %}
{{ input | regex_replace('(.)([A-Z][a-z]+)', '\\1_\\2') | regex_replace('([a-z0-9])([A-Z])', '\\1_\\2') | lower }}
{# Output: my_application_config #}
```

Here is another chaining example for cleaning up user-provided input:

```jinja2
{# Clean up a messy string for use as a systemd unit name #}
{% set raw_name = "My App (v2.1) - Production!" %}
{% set unit_name = raw_name
    | lower
    | regex_replace('[^a-z0-9\\s-]', '')
    | regex_replace('\\s+', '-')
    | regex_replace('-+', '-')
    | regex_replace('^-|-$', '')
%}
# Unit name: {{ unit_name }}
{# Output: my-app-v21-production #}
```

## Working with IP Addresses and Network Strings

Network configuration often requires string manipulation that regex handles well:

```jinja2
{# Convert CIDR notation to network and mask parts #}
{% set network = "192.168.1.0/24" %}
network_address = {{ network | regex_replace('/.*$', '') }}
{# Output: 192.168.1.0 #}

prefix_length = {{ network | regex_replace('^.*/', '') }}
{# Output: 24 #}

{# Mask an IP address for logging (replace last octet) #}
masked_ip = {{ client_ip | regex_replace('\\.[0-9]+$', '.xxx') }}
{# Input: 192.168.1.42 -> Output: 192.168.1.xxx #}
```

## Template Example: Docker Compose Labels

Here is a practical example generating Docker Compose labels where Traefik routing rules need sanitized service names:

```jinja2
{# docker-compose.yml.j2 - Traefik labels with sanitized names #}
{% for service in services %}
  {{ service.name | regex_replace('[^a-zA-Z0-9]', '-') }}:
    image: {{ service.image }}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.{{ service.name | regex_replace('[^a-zA-Z0-9]', '-') }}.rule=Host(`{{ service.domain }}`)"
      - "traefik.http.services.{{ service.name | regex_replace('[^a-zA-Z0-9]', '-') }}.loadbalancer.server.port={{ service.port }}"
{% endfor %}
```

## Common Pitfalls

Watch out for these issues when using `regex_replace`:

**Escaping backslashes.** In Jinja2 templates, use double backslashes for regex special sequences: `\\d`, `\\w`, `\\s`, `\\1`.

**Greedy matching.** By default, quantifiers like `*` and `+` are greedy. Use `*?` or `+?` for non-greedy matching:

```jinja2
{# Greedy - matches everything between first < and LAST > #}
{{ "<tag>content</tag>" | regex_replace('<.*>', 'X') }}
{# Output: X #}

{# Non-greedy - matches each <...> separately #}
{{ "<tag>content</tag>" | regex_replace('<.*?>', 'X') }}
{# Output: XcontentX #}
```

**Forgetting that the entire string is matched.** If your replacement pattern uses `^` and `$` anchors, the entire string must match for the capture groups to work:

```jinja2
{# This won't work if there's extra text #}
{{ "prefix-v1.2.3-suffix" | regex_replace('^v([0-9.]+)$', '\\1') }}
{# Output: prefix-v1.2.3-suffix (unchanged, because ^ and $ don't match) #}

{# This works - account for the surrounding text #}
{{ "prefix-v1.2.3-suffix" | regex_replace('^.*v([0-9.]+).*$', '\\1') }}
{# Output: 1.2.3 #}
```

## Wrapping Up

The `regex_replace` filter gives you the full power of Python regular expressions for string transformation in your Ansible templates and playbooks. It handles everything from simple character replacement to complex pattern-based reformatting with capture groups. When simple string operations like `replace`, `lower`, or `upper` are not sufficient, `regex_replace` is almost certainly what you need. Just remember to double-escape your backslashes and test your patterns on sample data before deploying.
