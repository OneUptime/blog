# How to Use the regex_findall Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Regex

Description: Learn how to use the regex_findall filter in Ansible to extract all occurrences of a pattern from strings for processing.

---

If you have used `regex_search` to extract the first match of a pattern from a string, you have probably run into situations where you need all the matches, not just the first one. That is exactly what `regex_findall` does. It scans the entire string and returns a list of every substring that matches your pattern. This makes it perfect for parsing log files, extracting all IP addresses from a config block, pulling out all port numbers, or gathering every occurrence of some pattern from command output.

## Basic Syntax

The `regex_findall` filter takes a regular expression pattern and returns a list of all non-overlapping matches:

```jinja2
{# Find all numbers in a string #}
{{ "server1 on port 80 and server2 on port 443" | regex_findall('[0-9]+') }}
{# Output: ['1', '80', '2', '443'] #}
```

If nothing matches, you get an empty list:

```jinja2
{{ "no numbers here" | regex_findall('[0-9]+') }}
{# Output: [] #}
```

## Extracting All IP Addresses

One of the most common uses is pulling IP addresses from text:

```yaml
# extract_ips.yml - Find all IPs in command output
- name: Get current connections
  ansible.builtin.shell: ss -tn state established
  register: connections
  changed_when: false

- name: Extract all connected IP addresses
  ansible.builtin.set_fact:
    connected_ips: "{{ connections.stdout | regex_findall('[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+') | unique }}"

- name: Show unique connected IPs
  ansible.builtin.debug:
    var: connected_ips
```

The `| unique` filter at the end deduplicates the list since the same IP might appear multiple times.

## Using Capture Groups

When you add capture groups (parentheses) to your pattern, `regex_findall` returns the captured groups rather than the full matches:

```jinja2
{# Extract just the port numbers from "host:port" pairs #}
{{ "10.0.1.10:8080 10.0.1.11:9090 10.0.1.12:3000" | regex_findall(':([0-9]+)') }}
{# Output: ['8080', '9090', '3000'] #}
```

With multiple capture groups, each match returns a tuple (list):

```jinja2
{# Extract both host and port from each pair #}
{{ "10.0.1.10:8080 10.0.1.11:9090" | regex_findall('([0-9.]+):([0-9]+)') }}
{# Output: [['10.0.1.10', '8080'], ['10.0.1.11', '9090']] #}
```

## Practical Example: Parsing Log Files

Suppose you collect log data and need to extract all error codes:

```yaml
# parse_logs.yml - Extract error patterns from application logs
- name: Read recent application logs
  ansible.builtin.shell: tail -100 /var/log/myapp/error.log
  register: error_log
  changed_when: false

- name: Extract all HTTP error codes
  ansible.builtin.set_fact:
    error_codes: "{{ error_log.stdout | regex_findall('HTTP/[0-9.]+ ([4-5][0-9]{2})') }}"

- name: Count occurrences of each error code
  ansible.builtin.debug:
    msg: "Error {{ item }}: {{ error_codes | select('eq', item) | list | length }} occurrences"
  loop: "{{ error_codes | unique }}"
```

## Building Configuration from Extracted Data

Here is a scenario where you parse an existing configuration to build a new one. Say you are migrating from an old firewall format to a new one:

```yaml
# migrate_firewall.yml - Parse old firewall rules and generate new format
- name: Read old firewall rules
  ansible.builtin.slurp:
    src: /etc/old-firewall/rules.conf
  register: old_rules_raw

- name: Decode and parse rules
  ansible.builtin.set_fact:
    old_rules_content: "{{ old_rules_raw.content | b64decode }}"

# Old format: "ALLOW 10.0.1.0/24 -> PORT 8080"
# New format needs structured data
- name: Extract all allowed networks and ports
  ansible.builtin.set_fact:
    parsed_rules: "{{ old_rules_content | regex_findall('ALLOW\\s+([\\d./]+)\\s+->\\s+PORT\\s+(\\d+)') }}"

- name: Generate new firewall config
  ansible.builtin.template:
    src: new_firewall.j2
    dest: /etc/new-firewall/rules.conf
```

```jinja2
{# new_firewall.j2 - Generate new format from parsed data #}
# New Firewall Rules - Migrated by Ansible
{% for rule in parsed_rules %}
rule {
    action = allow
    source = {{ rule[0] }}
    destination_port = {{ rule[1] }}
    protocol = tcp
}
{% endfor %}
```

## Extracting Key-Value Pairs

A powerful pattern is extracting key-value pairs from semi-structured text:

```yaml
# parse_env.yml - Extract environment variables from a running process
- name: Get environment of a running process
  ansible.builtin.shell: cat /proc/$(pgrep -f myapp | head -1)/environ | tr '\0' '\n'
  register: proc_env
  changed_when: false

- name: Parse all environment variables
  ansible.builtin.set_fact:
    app_env_vars: "{{ proc_env.stdout | regex_findall('([A-Z_]+)=(.+)') }}"

- name: Display specific variables
  ansible.builtin.debug:
    msg: "{{ item[0] }} = {{ item[1] }}"
  loop: "{{ app_env_vars }}"
  when: item[0] in ['DATABASE_URL', 'REDIS_URL', 'LOG_LEVEL']
```

## Template Example: Generating Monitoring Rules

Here is a template that uses `regex_findall` to parse and reformat monitoring data:

```yaml
# monitoring_config.yml - Generate alerting rules from existing configs
- name: Configure alerting
  hosts: monitoring
  vars:
    raw_metric_config: |
      metric:cpu_usage threshold:90 severity:critical
      metric:memory_usage threshold:85 severity:warning
      metric:disk_usage threshold:95 severity:critical
      metric:network_errors threshold:100 severity:warning
      metric:request_latency threshold:500 severity:critical
  tasks:
    - name: Parse metric configurations
      ansible.builtin.set_fact:
        metrics: "{{ raw_metric_config | regex_findall('metric:(\\S+)\\s+threshold:(\\S+)\\s+severity:(\\S+)') }}"

    - name: Generate alerting rules
      ansible.builtin.template:
        src: alert_rules.yml.j2
        dest: /etc/alertmanager/rules.yml
```

```jinja2
{# alert_rules.yml.j2 - Prometheus alerting rules from parsed config #}
groups:
  - name: system_alerts
    rules:
{% for metric in metrics %}
      - alert: {{ metric[0] }}_high
        expr: {{ metric[0] }} > {{ metric[1] }}
        for: 5m
        labels:
          severity: {{ metric[2] }}
        annotations:
          summary: "{{ metric[0] | replace('_', ' ') | title }} exceeds threshold"
          description: "{{ metric[0] }} is above {{ metric[1] }} for more than 5 minutes"
{% endfor %}
```

## Combining regex_findall with Other Filters

### Finding and Counting

```jinja2
{# Count how many times a pattern appears #}
{% set matches = log_content | regex_findall('ERROR') %}
Total errors: {{ matches | length }}
```

### Finding and Filtering

```jinja2
{# Find all ports, then filter to just high ports #}
{% set all_ports = config_text | regex_findall('port\\s+(\\d+)') %}
{% set high_ports = all_ports | map('int') | select('gt', 1024) | list %}
High ports in use: {{ high_ports | join(', ') }}
```

### Finding and Joining

```jinja2
{# Extract all email addresses and create a comma-separated list #}
{% set emails = notification_text | regex_findall('[\\w.+-]+@[\\w-]+\\.[\\w.]+') %}
notification_recipients = {{ emails | join(', ') }}
```

## Parsing Multi-Format Data

Sometimes you need to parse data that comes in different formats. Here is how to handle that:

```yaml
# parse_mixed.yml - Parse configuration with mixed formats
- name: Parse mixed configuration data
  hosts: localhost
  vars:
    mixed_config: |
      # Server configuration
      server web-01 address=10.0.1.10 port=8080
      server web-02 address=10.0.1.11 port=8080
      server api-01 address=10.0.2.10 port=9090
      # End of servers
  tasks:
    - name: Extract server definitions
      ansible.builtin.set_fact:
        servers: "{{ mixed_config | regex_findall('server\\s+(\\S+)\\s+address=(\\S+)\\s+port=(\\S+)') }}"

    - name: Generate upstream config
      ansible.builtin.template:
        src: upstream.conf.j2
        dest: /etc/haproxy/upstream.conf
```

```jinja2
{# upstream.conf.j2 - Build HAProxy config from parsed data #}
{% for server in servers %}
{% set name = server[0] %}
{% set address = server[1] %}
{% set port = server[2] %}
    server {{ name }} {{ address }}:{{ port }} check inter 3000
{% endfor %}
```

## Case-Insensitive and Multiline Matching

Just like with `regex_search`, you can use inline flags:

```jinja2
{# Case-insensitive matching #}
{{ text | regex_findall('(?i)error|warning|critical') }}

{# Multiline matching where ^ and $ match line boundaries #}
{{ multiline_text | regex_findall('(?m)^\\s*server\\s+(.+)$') }}
```

## Error Handling

When working with `regex_findall`, always consider that it might return an empty list:

```yaml
# Safe usage with default and length check
- name: Extract data safely
  ansible.builtin.set_fact:
    extracted_data: "{{ raw_text | regex_findall('pattern:(\\S+)') | default([]) }}"

- name: Process only if data was found
  ansible.builtin.debug:
    msg: "Found {{ extracted_data | length }} matches"
  when: extracted_data | length > 0
```

In templates:

```jinja2
{# Safe iteration over regex_findall results #}
{% set matches = raw_data | regex_findall('item=(\\S+)') %}
{% if matches %}
# Found {{ matches | length }} items
{% for item in matches %}
  - {{ item }}
{% endfor %}
{% else %}
# No items found
{% endif %}
```

## Performance Considerations

For very large strings (like full log files), `regex_findall` can be slow because it processes the entire input. If you only need the first few matches, consider using `regex_search` in a loop or pre-filtering the input with `splitlines` and then matching individual lines:

```jinja2
{# More efficient for large inputs: filter lines first, then match #}
{% set error_lines = large_log.splitlines() | select('match', '.*ERROR.*') | list %}
{% for line in error_lines[:10] %}
{{ line | regex_search('ERROR:\\s*(.+)', '\\1') | first }}
{% endfor %}
```

## Wrapping Up

The `regex_findall` filter is essential for extracting multiple occurrences of a pattern from strings in Ansible. It returns a clean list that you can iterate over, filter, join, count, or process however you need. Combined with capture groups, it becomes a lightweight parser for semi-structured text data. Whenever you find yourself needing more than just the first match from a string, `regex_findall` is the filter to use.
