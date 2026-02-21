# How to Use the regex_search Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Regex

Description: Learn how to use the regex_search filter in Ansible to extract matching patterns from strings using regular expressions.

---

While `regex_replace` transforms strings by substituting matched patterns, `regex_search` does something different: it extracts the first substring that matches a given pattern. This is incredibly useful when you need to pull specific data out of a longer string, like grabbing a version number from a command output, extracting an IP address from a log line, or parsing structured text that you received from a `shell` task.

## Basic Syntax

The `regex_search` filter returns the first match of a regular expression pattern within a string. If nothing matches, it returns an empty string.

```jinja2
{# Extract the first sequence of digits from a string #}
{{ "server-42-production" | regex_search('[0-9]+') }}
{# Output: 42 #}
```

```jinja2
{# Try to match something that doesn't exist #}
{{ "no numbers here" | regex_search('[0-9]+') }}
{# Output: (empty string) #}
```

## Extracting Version Numbers

One of the most common uses is pulling version numbers from strings that contain extra text:

```jinja2
{# Extract semantic version from a longer string #}
{{ "nginx/1.24.0 (Ubuntu)" | regex_search('[0-9]+\\.[0-9]+\\.[0-9]+') }}
{# Output: 1.24.0 #}
```

In a playbook, you might use this to extract a version from command output:

```yaml
# get_version.yml - Extract version from installed software
- name: Get installed PostgreSQL version
  ansible.builtin.shell: psql --version
  register: psql_output
  changed_when: false

- name: Parse the version number
  ansible.builtin.set_fact:
    pg_version: "{{ psql_output.stdout | regex_search('[0-9]+\\.[0-9]+') }}"

- name: Display the extracted version
  ansible.builtin.debug:
    msg: "PostgreSQL version is {{ pg_version }}"
  # If psql --version returned "psql (PostgreSQL) 16.1"
  # pg_version will be "16.1"
```

## Using Capture Groups

When you need to extract a specific part of a match, use capture groups with parentheses. When capture groups are present, `regex_search` returns a list of captured groups instead of the full match.

```jinja2
{# Extract just the major version using a capture group #}
{{ "PostgreSQL 16.1.2" | regex_search('PostgreSQL ([0-9]+)\\.', '\\1') }}
{# Output: 16 #}
```

The `\\1` argument tells the filter to return the first capture group. You can extract multiple groups:

```jinja2
{# Extract host and port from a connection string #}
{% set result = "postgresql://user:pass@db.example.com:5432/mydb" | regex_search('@([^:]+):([0-9]+)/', '\\1', '\\2') %}
Host: {{ result[0] }}
Port: {{ result[1] }}
{# Output:
   Host: db.example.com
   Port: 5432
#}
```

## Practical Example: Parsing Disk Information

Suppose you run `df` on a server and want to extract specific information:

```yaml
# disk_check.yml - Parse disk usage information
- name: Get disk usage
  ansible.builtin.shell: df -h /data | tail -1
  register: disk_output
  changed_when: false

# Example output: "/dev/sda1       100G   45G   55G  45% /data"

- name: Parse disk information
  ansible.builtin.set_fact:
    disk_device: "{{ disk_output.stdout | regex_search('^(\\S+)', '\\1') | first }}"
    disk_total: "{{ disk_output.stdout | regex_search('\\s+(\\S+)\\s+\\S+\\s+\\S+\\s+\\S+%', '\\1') | first }}"
    disk_used_pct: "{{ disk_output.stdout | regex_search('([0-9]+)%', '\\1') | first }}"

- name: Report disk usage
  ansible.builtin.debug:
    msg: "Device {{ disk_device }} is {{ disk_used_pct }}% full (total: {{ disk_total }})"
```

Notice the `| first` at the end. When using capture groups, `regex_search` returns a list, so you need `| first` to get the actual string value.

## Using regex_search in Conditionals

You can use `regex_search` in `when` conditions to make decisions based on pattern matching:

```yaml
# conditional_tasks.yml - Run tasks based on pattern matching
- name: Check kernel version
  ansible.builtin.shell: uname -r
  register: kernel_version
  changed_when: false

- name: Apply kernel 5.x specific tuning
  ansible.builtin.sysctl:
    name: vm.swappiness
    value: "10"
  when: kernel_version.stdout | regex_search('^5\\.')

- name: Apply kernel 6.x specific tuning
  ansible.builtin.sysctl:
    name: vm.swappiness
    value: "5"
  when: kernel_version.stdout | regex_search('^6\\.')
```

## Template Example: Parsing and Categorizing Servers

Here is a template that categorizes servers based on their hostname patterns:

```yaml
# categorize_servers.yml - Group servers by hostname pattern
- name: Categorize servers
  hosts: localhost
  vars:
    all_servers:
      - "web-prod-01.us-east.example.com"
      - "web-prod-02.us-west.example.com"
      - "api-prod-01.us-east.example.com"
      - "db-staging-01.eu-west.example.com"
      - "cache-prod-01.us-east.example.com"
  tasks:
    - name: Generate server inventory report
      ansible.builtin.template:
        src: server_report.j2
        dest: /tmp/server_report.txt
```

```jinja2
{# server_report.j2 - Categorize servers using regex_search #}
Server Inventory Report
=======================

{% for server in all_servers %}
{% set role = server | regex_search('^([a-z]+)-', '\\1') | first %}
{% set env = server | regex_search('-([a-z]+)-', '\\1') | first %}
{% set region = server | regex_search('\\.([a-z]+-[a-z]+)\\.', '\\1') | first %}
Server: {{ server }}
  Role: {{ role }}
  Environment: {{ env }}
  Region: {{ region }}

{% endfor %}
```

Output:

```
Server Inventory Report
=======================

Server: web-prod-01.us-east.example.com
  Role: web
  Environment: prod
  Region: us-east

Server: web-prod-02.us-west.example.com
  Role: web
  Environment: prod
  Region: us-west

...
```

## Regex Flags

You can use inline regex flags for different matching behavior:

```jinja2
{# Case-insensitive search with (?i) #}
{{ "Error: Connection Failed" | regex_search('(?i)error:\\s*(.+)', '\\1') | first }}
{# Output: Connection Failed #}

{# Multiline matching with (?m) #}
{% set log_block = "INFO: started\nERROR: disk full\nINFO: recovered" %}
{{ log_block | regex_search('(?m)^ERROR:\\s*(.+)$', '\\1') | first }}
{# Output: disk full #}
```

## Handling No Match Gracefully

Since `regex_search` returns an empty string when there is no match, you should handle that case in your templates:

```jinja2
{# Safe extraction with a fallback value #}
{% set version = raw_string | regex_search('[0-9]+\\.[0-9]+') %}
{% if version %}
app_version = {{ version }}
{% else %}
app_version = unknown
{% endif %}
```

Or more concisely with the `default` filter:

```jinja2
{# One-liner with default fallback #}
app_version = {{ raw_string | regex_search('[0-9]+\\.[0-9]+') | default('unknown', true) }}
```

The `true` parameter on `default` is important here because an empty string is falsy, and without it, the default filter would not trigger.

## Extracting Data from Structured Output

Here is a practical example of parsing structured command output:

```yaml
# parse_ssl_cert.yml - Extract certificate details
- name: Get SSL certificate info
  ansible.builtin.shell: >
    openssl x509 -in /etc/ssl/certs/server.crt -noout -subject -enddate
  register: cert_info
  changed_when: false

# Example output:
# subject= /CN=example.com/O=My Org
# notAfter=Dec 31 23:59:59 2025 GMT

- name: Extract certificate details
  ansible.builtin.set_fact:
    cert_cn: "{{ cert_info.stdout | regex_search('CN=([^/\\n]+)', '\\1') | first }}"
    cert_expiry: "{{ cert_info.stdout | regex_search('notAfter=(.+)', '\\1') | first }}"

- name: Show certificate details
  ansible.builtin.debug:
    msg: "Certificate for {{ cert_cn }} expires on {{ cert_expiry }}"
```

## Comparing regex_search with regex_findall

It is worth knowing the difference between these two filters:

- `regex_search` returns the **first** match only
- `regex_findall` returns **all** matches as a list

```jinja2
{# regex_search returns only the first match #}
{{ "port 80 and port 443" | regex_search('[0-9]+') }}
{# Output: 80 #}

{# regex_findall returns all matches #}
{{ "port 80 and port 443" | regex_findall('[0-9]+') }}
{# Output: ['80', '443'] #}
```

Use `regex_search` when you only need the first occurrence. Use `regex_findall` when you need all occurrences.

## Using regex_search with Ansible Facts

You can parse Ansible facts that contain structured strings:

```yaml
# parse_facts.yml - Extract info from gathered facts
- name: Parse OS information
  ansible.builtin.set_fact:
    os_major_version: "{{ ansible_distribution_version | regex_search('^([0-9]+)', '\\1') | first }}"
    kernel_major: "{{ ansible_kernel | regex_search('^([0-9]+\\.[0-9]+)', '\\1') | first }}"

- name: Apply version-specific configuration
  ansible.builtin.template:
    src: "app.conf.j2"
    dest: "/etc/myapp/app.conf"
```

```jinja2
{# app.conf.j2 - Conditional config based on parsed versions #}
# OS Major Version: {{ os_major_version }}
# Kernel: {{ kernel_major }}

{% if os_major_version | int >= 22 %}
use_modern_syscalls = true
{% else %}
use_modern_syscalls = false
{% endif %}
```

## Wrapping Up

The `regex_search` filter is your go-to tool for extracting data from strings in Ansible. Whether you are parsing command output, pulling version numbers from software banners, extracting fields from structured text, or making conditional decisions based on pattern matching, `regex_search` gives you precise control over what you extract. Remember to use `| first` when working with capture groups, handle the empty-string case for missing matches, and consider `regex_findall` when you need all matches instead of just the first one.
