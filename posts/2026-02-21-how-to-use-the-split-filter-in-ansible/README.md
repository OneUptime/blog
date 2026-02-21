# How to Use the split Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filters, String Manipulation, Jinja2, Automation

Description: Learn how to use the split filter in Ansible to break strings into lists for parsing command output, CSV data, and configuration values.

---

Parsing string data is a daily reality in automation. Command output comes as strings, CSV files are strings, configuration values are often comma-separated strings, and log lines are strings with structured fields. The `split` filter in Ansible breaks a string into a list of substrings based on a delimiter, giving you structured data you can loop over, filter, and manipulate.

## Basic Usage

The split filter divides a string by a specified delimiter:

```yaml
# Split a comma-separated string into a list
- name: Basic split
  ansible.builtin.debug:
    msg: "{{ 'web01,web02,web03,db01' | split(',') }}"
```

Output: `['web01', 'web02', 'web03', 'db01']`

Without any argument, split divides on whitespace:

```yaml
# Split on whitespace (default)
- name: Split on whitespace
  ansible.builtin.debug:
    msg: "{{ 'alice bob charlie' | split() }}"
```

Output: `['alice', 'bob', 'charlie']`

## Parsing Command Output

The most frequent use of split is parsing the output of shell commands:

```yaml
# Parse df output to extract filesystem information
- name: Get disk usage
  ansible.builtin.shell: df -h / | tail -1
  register: df_output
  changed_when: false

- name: Parse disk usage
  ansible.builtin.debug:
    msg: |
      Filesystem: {{ fields[0] }}
      Size: {{ fields[1] }}
      Used: {{ fields[2] }}
      Available: {{ fields[3] }}
      Use%: {{ fields[4] }}
      Mount: {{ fields[5] }}
  vars:
    fields: "{{ df_output.stdout | split() }}"
```

## Splitting with Maximum Splits

You can limit the number of splits with the `maxsplit` parameter:

```yaml
# Limit the number of splits
- name: Split with limit
  ansible.builtin.debug:
    msg: "{{ 'key=value=with=equals' | split('=', 1) }}"
```

Output: `['key', 'value=with=equals']`

This is extremely useful when parsing key-value pairs where the value might contain the delimiter:

```yaml
# Parse KEY=VALUE pairs where value may contain '='
- name: Parse environment file
  ansible.builtin.set_fact:
    parsed_env: "{{ parsed_env | default({}) | combine({parts[0]: parts[1]}) }}"
  loop:
    - "DATABASE_URL=postgresql://user:pass@host:5432/db"
    - "API_KEY=abc123==def456"
    - "APP_NAME=myapp"
  vars:
    parts: "{{ item | split('=', 1) }}"
```

## Processing CSV Data

Parse CSV-formatted strings into usable data:

```yaml
# Parse CSV data from a file or command output
- name: Read CSV data
  ansible.builtin.slurp:
    src: /tmp/servers.csv
  register: csv_raw

- name: Parse CSV into list of dictionaries
  ansible.builtin.set_fact:
    servers: "{{ servers | default([]) + [dict(headers | zip(item | split(',')))] }}"
  loop: "{{ (csv_raw.content | b64decode).split('\n') | reject('equalto', '') | list }}"
  vars:
    headers: ['hostname', 'ip', 'role', 'environment']
  when: not ansible_loop.first  # Skip header row

# Alternative: parse a simple CSV string
- name: Parse inline CSV
  ansible.builtin.debug:
    msg: |
      {% for line in csv_data.split('\n') %}
      {% if line | trim %}
      {% set fields = line | split(',') %}
      Host: {{ fields[0] | trim }}, IP: {{ fields[1] | trim }}, Role: {{ fields[2] | trim }}
      {% endif %}
      {% endfor %}
  vars:
    csv_data: |
      web01,10.0.1.10,frontend
      web02,10.0.1.11,frontend
      db01,10.0.2.10,database
```

## Parsing PATH-style Variables

```yaml
# Split and analyze the PATH environment variable
- name: Parse PATH
  ansible.builtin.debug:
    msg: |
      PATH contains {{ path_dirs | length }} directories:
      {% for dir in path_dirs %}
        {{ dir }}
      {% endfor %}
  vars:
    path_dirs: "{{ ansible_env.PATH | split(':') }}"

- name: Check if a directory is in PATH
  ansible.builtin.debug:
    msg: "/usr/local/bin is {{ 'in' if '/usr/local/bin' in path_dirs else 'NOT in' }} PATH"
  vars:
    path_dirs: "{{ ansible_env.PATH | split(':') }}"
```

## Extracting Hostnames from FQDNs

```yaml
# Parse FQDN into components
- name: Parse fully qualified domain names
  ansible.builtin.debug:
    msg: |
      FQDN: {{ item }}
      Hostname: {{ item | split('.') | first }}
      Domain: {{ item | split('.')[1:] | join('.') }}
      TLD: {{ item | split('.') | last }}
  loop:
    - web01.us-east-1.prod.example.com
    - db01.eu-west-1.staging.example.com
    - cache01.ap-south-1.prod.example.com
```

## Parsing Log Lines

Extract structured data from log entries:

```yaml
# Parse structured log lines
- name: Parse Apache access log entries
  ansible.builtin.debug:
    msg: |
      IP: {{ parts[0] }}
      Date: {{ item | split('[') | last | split(']') | first }}
      Request: {{ item | split('"')[1] }}
      Status: {{ item | split('"')[2] | trim | split(' ') | first }}
  loop:
    - '10.0.1.50 - - [21/Feb/2026:14:30:00 +0000] "GET /api/health HTTP/1.1" 200 15'
    - '10.0.1.51 - - [21/Feb/2026:14:30:01 +0000] "POST /api/data HTTP/1.1" 201 89'
  vars:
    parts: "{{ item | split(' ') }}"
```

## Splitting and Reassembling

A common pattern is splitting a string, modifying parts, and joining them back:

```yaml
# Transform a domain name by replacing parts
- name: Convert production URL to staging
  ansible.builtin.debug:
    msg: "{{ parts[:1] + ['staging'] + parts[2:] | join('.') }}"
  vars:
    prod_url: "api.production.example.com"
    parts: "{{ prod_url | split('.') }}"
```

## Using split in Templates

```jinja2
{# templates/hosts_file.j2 - Generate /etc/hosts from CSV-style data #}
# /etc/hosts - Managed by Ansible
127.0.0.1   localhost

{% for entry in host_entries %}
{% set parts = entry | split(',') %}
{{ parts[0] | trim }}   {{ parts[1] | trim }} {{ parts[1] | trim | split('.') | first }}
{% endfor %}
```

With variables:

```yaml
host_entries:
  - "10.0.1.10, web01.example.com"
  - "10.0.1.11, web02.example.com"
  - "10.0.2.10, db01.example.com"
```

## Parsing Version Strings

```yaml
# Break down version strings for comparison
- name: Parse version numbers
  ansible.builtin.debug:
    msg: |
      Version: {{ version }}
      Major: {{ version_parts[0] }}
      Minor: {{ version_parts[1] }}
      Patch: {{ version_parts[2] }}
      Is major version 2+: {{ 'yes' if version_parts[0] | int >= 2 else 'no' }}
  vars:
    version: "2.14.3"
    version_parts: "{{ version | split('.') }}"
```

## Combining split with Other Filters

```yaml
# Parse a tag string into a sorted, unique list
- name: Process tags
  ansible.builtin.debug:
    msg: "{{ tag_string | split(',') | map('trim') | unique | sort | list }}"
  vars:
    tag_string: "production, web, us-east, production, critical, web"
```

Output: `['critical', 'production', 'us-east', 'web']`

## Handling Edge Cases

```yaml
# Split handles edge cases
- name: Edge case examples
  ansible.builtin.debug:
    msg: |
      Empty string: {{ '' | split(',') }}
      No delimiter found: {{ 'nodots' | split('.') }}
      Multiple delimiters: {{ 'a,,b,,c' | split(',') }}
      Leading delimiter: {{ ',a,b,c' | split(',') }}
```

Output:
```
Empty string: ['']
No delimiter found: ['nodots']
Multiple delimiters: ['a', '', 'b', '', 'c']
Leading delimiter: ['', 'a', 'b', 'c']
```

Note that splitting on a delimiter that appears consecutively produces empty strings. Clean those up with `select` or `reject`:

```yaml
# Remove empty strings from split results
- name: Clean split
  ansible.builtin.debug:
    msg: "{{ 'a,,b,,c' | split(',') | select | list }}"
```

Output: `['a', 'b', 'c']`

## Summary

The `split` filter is fundamental for parsing string data in Ansible. Use it for command output, CSV data, PATH variables, domain names, version strings, log lines, and any other structured text. Remember the `maxsplit` parameter for key-value parsing where the value contains the delimiter. Clean up empty strings with `select` when splitting on consecutive delimiters. Pair it with `join` for round-trip transformations and with `map('trim')` to clean up whitespace around split results.
