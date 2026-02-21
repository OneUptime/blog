# How to Use the dict2items and items2dict Filters in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filters, Dictionaries, Data Transformation, Automation

Description: Learn how to convert between dictionaries and lists in Ansible using dict2items and items2dict for flexible data manipulation in playbooks.

---

Ansible playbooks regularly need to convert between dictionaries and lists. You might have a dictionary of configuration values that you need to loop over, or a list of key-value pairs from an API that you need to turn into a dictionary for lookups. The `dict2items` and `items2dict` filters handle these conversions, and they work as perfect inverses of each other.

## dict2items: Dictionary to List

The `dict2items` filter converts a dictionary into a list of dictionaries, where each entry has a `key` and `value` field:

```yaml
# Convert a dictionary to a list of key-value items
- name: Convert dict to items
  ansible.builtin.debug:
    msg: "{{ my_dict | dict2items }}"
  vars:
    my_dict:
      name: myapp
      port: 8080
      debug: false
```

Output:
```json
[
  {"key": "name", "value": "myapp"},
  {"key": "port", "value": 8080},
  {"key": "debug", "value": false}
]
```

## Why This Matters

The most common reason you need `dict2items` is to loop over a dictionary. Ansible's `loop` directive works with lists, not dictionaries directly. While you can use `dict.items()` in Jinja2, `dict2items` gives you named fields that are easier to work with:

```yaml
# Loop over dictionary entries to create environment variables
- name: Set environment variables
  ansible.builtin.lineinfile:
    path: /etc/environment
    regexp: "^{{ item.key }}="
    line: "{{ item.key }}={{ item.value }}"
  loop: "{{ env_vars | dict2items }}"
  vars:
    env_vars:
      JAVA_HOME: /usr/lib/jvm/java-17
      MAVEN_HOME: /opt/maven
      PATH: "/usr/local/bin:/usr/bin:/bin"
```

## Custom Key Names

By default, dict2items uses `key` and `value` as the field names. You can customize these with the `key_name` and `value_name` parameters:

```yaml
# Use custom field names for the output
- name: Convert with custom names
  ansible.builtin.debug:
    msg: "{{ my_dict | dict2items(key_name='parameter', value_name='setting') }}"
  vars:
    my_dict:
      max_connections: 100
      timeout: 30
      retry: 3
```

Output:
```json
[
  {"parameter": "max_connections", "setting": 100},
  {"parameter": "timeout", "setting": 30},
  {"parameter": "retry", "setting": 3}
]
```

## items2dict: List to Dictionary

The inverse operation converts a list of key-value items back into a dictionary:

```yaml
# Convert a list of items back to a dictionary
- name: Convert items to dict
  ansible.builtin.debug:
    msg: "{{ my_items | items2dict }}"
  vars:
    my_items:
      - key: hostname
        value: web01
      - key: ip
        value: 10.0.1.10
      - key: role
        value: webserver
```

Output:
```json
{"hostname": "web01", "ip": "10.0.1.10", "role": "webserver"}
```

## Custom Key Names for items2dict

If your list uses different field names, specify them:

```yaml
# Convert items with non-standard field names
- name: Custom field names
  ansible.builtin.debug:
    msg: "{{ records | items2dict(key_name='name', value_name='address') }}"
  vars:
    records:
      - name: web01
        address: 10.0.1.10
      - name: db01
        address: 10.0.2.10
      - name: cache01
        address: 10.0.3.10
```

Output:
```json
{"web01": "10.0.1.10", "db01": "10.0.2.10", "cache01": "10.0.3.10"}
```

## Practical Example: Managing Docker Labels

Docker labels are naturally key-value pairs, and dict2items makes it easy to work with them:

```yaml
# Apply Docker container labels from a dictionary
- name: Define container labels
  ansible.builtin.set_fact:
    container_labels:
      app: frontend
      environment: production
      version: "2.1.0"
      maintainer: team-platform
      monitoring: enabled

- name: Show labels for Docker run command
  ansible.builtin.debug:
    msg: "docker run {{ container_labels | dict2items | map('regex_replace', '^(.*)$', '--label \\1') | join(' ') }}"

# Better approach: use dict2items in a template
- name: Generate Docker Compose labels
  ansible.builtin.template:
    src: docker-compose.yml.j2
    dest: /opt/app/docker-compose.yml
```

The template:

```jinja2
{# templates/docker-compose.yml.j2 - Generate labels from dictionary #}
version: "3.8"
services:
  app:
    image: myapp:latest
    labels:
{% for item in container_labels | dict2items | sort(attribute='key') %}
      {{ item.key }}: "{{ item.value }}"
{% endfor %}
```

## Filtering Dictionary Entries

A powerful pattern is converting to items, filtering, then converting back:

```yaml
# Filter a dictionary by removing entries with empty values
- name: Clean up configuration dict
  ansible.builtin.set_fact:
    clean_config: >-
      {{ raw_config
         | dict2items
         | rejectattr('value', 'equalto', '')
         | rejectattr('value', 'none')
         | list
         | items2dict }}
  vars:
    raw_config:
      db_host: db.internal
      db_port: "5432"
      db_name: myapp
      db_password: ""
      cache_host: ""
      cache_port: "6379"
```

Result: Only entries with non-empty values remain.

## Transforming Dictionary Keys or Values

Convert to items, modify, and convert back:

```yaml
# Prefix all environment variable names with APP_
- name: Add prefix to dict keys
  ansible.builtin.set_fact:
    prefixed_env: >-
      {{ env_vars
         | dict2items
         | map('combine', {'key': 'APP_' + item.key})
         | list
         | items2dict }}
```

A simpler approach for key transformation:

```yaml
# Transform dict keys to uppercase
- name: Uppercase dict keys
  ansible.builtin.debug:
    msg: "{{ result }}"
  vars:
    original:
      database_host: localhost
      database_port: 5432
    items_list: "{{ original | dict2items }}"
    result: >-
      {% set ns = namespace(d={}) %}
      {% for item in items_list %}
      {% set ns.d = ns.d | combine({item.key | upper: item.value}) %}
      {% endfor %}
      {{ ns.d }}
```

## Working with API Responses

APIs often return data as lists that you want to look up by key:

```yaml
# Convert API response list to a lookup dictionary
- name: Get DNS records from API
  ansible.builtin.uri:
    url: https://api.example.com/dns/records
    return_content: true
  register: dns_response

# Suppose the response looks like:
# [{"name": "web01", "ip": "10.0.1.10"}, {"name": "db01", "ip": "10.0.2.10"}]

- name: Create lookup dictionary
  ansible.builtin.set_fact:
    dns_lookup: "{{ dns_response.json | items2dict(key_name='name', value_name='ip') }}"

# Now you can look up IPs by hostname
- name: Get web01 IP
  ansible.builtin.debug:
    msg: "web01 is at {{ dns_lookup.web01 }}"
```

## Generating Configuration Files

```yaml
# Generate a properties file from a dictionary
- name: Write application properties
  ansible.builtin.template:
    src: application.properties.j2
    dest: /opt/app/application.properties
  vars:
    app_properties:
      server.port: 8080
      server.address: 0.0.0.0
      spring.datasource.url: "jdbc:postgresql://db:5432/myapp"
      spring.datasource.username: appuser
      logging.level.root: WARN
      logging.level.com.myapp: DEBUG
```

```jinja2
{# templates/application.properties.j2 - Sorted properties from dictionary #}
# Application Properties - Managed by Ansible
{% for item in app_properties | dict2items | sort(attribute='key') %}
{{ item.key }}={{ item.value }}
{% endfor %}
```

## Round-Trip Conversion

Since these filters are inverses, you can verify that a round trip preserves data:

```yaml
# Verify round-trip conversion
- name: Round trip test
  ansible.builtin.assert:
    that:
      - original == (original | dict2items | items2dict)
    success_msg: "Round trip preserves data"
  vars:
    original:
      a: 1
      b: 2
      c: 3
```

## Merging Two Lists of Items into a Dictionary

If you have matching lists of keys and values:

```yaml
# Combine separate key and value lists into a dictionary
- name: Build dict from parallel lists
  ansible.builtin.debug:
    msg: "{{ keys | zip(values) | map('list') | map('items2dict_pair') }}"
  vars:
    keys: [name, port, protocol]
    values: [myapp, 8080, tcp]

# Simpler approach using dict()
- name: Build dict using zip
  ansible.builtin.set_fact:
    result: "{{ dict(keys | zip(values)) }}"
  vars:
    keys: [name, port, protocol]
    values: [myapp, 8080, tcp]
```

## Summary

The `dict2items` and `items2dict` filters are your tools for switching between dictionary and list representations of data. Use `dict2items` when you need to loop over dictionary entries, filter them, or sort them. Use `items2dict` when you need to convert list-based data (often from APIs or command output) into dictionaries for easy lookups. Together, they enable a transform pipeline pattern: convert to items, apply filters and transformations, and convert back. Remember to use the `key_name` and `value_name` parameters when your data does not use the default `key` and `value` field names.
