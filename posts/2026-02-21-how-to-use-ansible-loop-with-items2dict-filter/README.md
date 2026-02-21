# How to Use Ansible loop with items2dict Filter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Filters, Data Transformation, Automation

Description: Learn how to use the Ansible items2dict filter to convert lists of key-value pairs into dictionaries for cleaner data handling in loops.

---

The `items2dict` filter in Ansible does the opposite of `dict2items`. While `dict2items` turns a dictionary into a list of key-value pairs, `items2dict` takes a list of dictionaries with key-value attributes and converts them back into a single dictionary. This is useful when you need to transform loop output, restructure data from external sources, or build dictionaries dynamically.

This post covers practical uses of `items2dict` in combination with loops, showing how to transform, filter, and reconstruct data structures for your playbooks.

## Understanding items2dict

The filter takes a list of dictionaries and merges them into a single dictionary. By default, it looks for `key` and `value` attributes in each list item.

```yaml
# basic-items2dict.yml
# Demonstrates the basic items2dict transformation
- name: Demonstrate items2dict
  hosts: localhost
  gather_facts: false
  vars:
    settings_list:
      - key: max_connections
        value: 100
      - key: timeout
        value: 30
      - key: retry_count
        value: 3
  tasks:
    - name: Convert list to dictionary
      ansible.builtin.debug:
        msg: "{{ settings_list | items2dict }}"
      # Output: {"max_connections": 100, "timeout": 30, "retry_count": 3}
```

The result is a dictionary: `{"max_connections": 100, "timeout": 30, "retry_count": 3}`.

## Custom Key and Value Names

Your data might not use `key` and `value` as attribute names. You can specify custom names with `key_name` and `value_name`.

```yaml
# custom-keys.yml
# Uses items2dict with custom attribute names
- name: Convert with custom key names
  hosts: localhost
  gather_facts: false
  vars:
    env_settings:
      - name: DATABASE_HOST
        setting: db.internal
      - name: DATABASE_PORT
        setting: "5432"
      - name: REDIS_URL
        setting: redis://cache.internal:6379
      - name: LOG_LEVEL
        setting: info
  tasks:
    - name: Build environment dictionary
      ansible.builtin.set_fact:
        env_dict: "{{ env_settings | items2dict(key_name='name', value_name='setting') }}"

    - name: Show result
      ansible.builtin.debug:
        msg: "{{ env_dict }}"
      # Output: {"DATABASE_HOST": "db.internal", "DATABASE_PORT": "5432", ...}
```

## Building Dictionaries from Loop Output

One of the most practical uses of `items2dict` is reconstructing a dictionary from registered loop output.

```yaml
# build-from-loop.yml
# Collects file stats in a loop and builds a lookup dictionary
- name: Build file stats dictionary
  hosts: all
  tasks:
    - name: Stat configuration files
      ansible.builtin.stat:
        path: "{{ item }}"
      loop:
        - /etc/nginx/nginx.conf
        - /etc/redis/redis.conf
        - /etc/postgresql/14/main/postgresql.conf
      register: stat_results

    - name: Build file existence dictionary
      ansible.builtin.set_fact:
        file_exists: >-
          {{
            stat_results.results
            | map('combine', {})
            | map(attribute='item')
            | zip(stat_results.results | map(attribute='stat.exists', default=false))
            | map('list')
            | map('zip', ['key', 'value'])
            | map('map', 'reverse')
            | map('community.general.dict')
            | items2dict
          }}
```

That chain is complex. A cleaner approach is to build the list explicitly and then convert it.

```yaml
    - name: Build existence map the clean way
      ansible.builtin.set_fact:
        file_exists: "{{ file_list | items2dict }}"
      vars:
        file_list: >-
          [
          {% for result in stat_results.results %}
            {"key": "{{ result.item }}", "value": {{ result.stat.exists | default(false) | lower }}}
            {{ "," if not loop.last else "" }}
          {% endfor %}
          ]

    - name: Show which files exist
      ansible.builtin.debug:
        msg: "{{ item.key }}: {{ 'exists' if item.value else 'missing' }}"
      loop: "{{ file_exists | dict2items }}"
```

## Transforming API Data

When you pull data from an API or external source, it often comes as a list of objects. `items2dict` helps restructure it for easy lookups.

```yaml
# api-data-transform.yml
# Transforms an API response list into a lookup dictionary
- name: Transform API data for lookups
  hosts: localhost
  gather_facts: false
  vars:
    # Simulating API response with a list of server records
    api_servers:
      - hostname: web-01
        ip_address: 10.0.1.10
        role: web
      - hostname: web-02
        ip_address: 10.0.1.11
        role: web
      - hostname: db-01
        ip_address: 10.0.2.10
        role: database
      - hostname: cache-01
        ip_address: 10.0.3.10
        role: cache
  tasks:
    - name: Create hostname-to-IP lookup
      ansible.builtin.set_fact:
        ip_lookup: "{{ api_servers | items2dict(key_name='hostname', value_name='ip_address') }}"

    - name: Look up a specific server IP
      ansible.builtin.debug:
        msg: "db-01 has IP: {{ ip_lookup['db-01'] }}"

    - name: Create hostname-to-role lookup
      ansible.builtin.set_fact:
        role_lookup: "{{ api_servers | items2dict(key_name='hostname', value_name='role') }}"

    - name: Show all lookups
      ansible.builtin.debug:
        msg: "{{ item.key }} is a {{ role_lookup[item.key] }} server at {{ item.value }}"
      loop: "{{ ip_lookup | dict2items }}"
```

## Combining items2dict with Filters

You can chain `items2dict` with other filters to transform and then convert data.

```yaml
# filter-and-convert.yml
# Filters a list then converts to dictionary for targeted operations
- name: Filter then convert
  hosts: localhost
  gather_facts: false
  vars:
    all_services:
      - name: nginx
        port: 80
        enabled: true
      - name: apache
        port: 80
        enabled: false
      - name: redis
        port: 6379
        enabled: true
      - name: memcached
        port: 11211
        enabled: false
      - name: postgresql
        port: 5432
        enabled: true
  tasks:
    - name: Build dictionary of enabled services
      ansible.builtin.set_fact:
        enabled_ports: >-
          {{
            all_services
            | selectattr('enabled', 'equalto', true)
            | items2dict(key_name='name', value_name='port')
          }}

    - name: Show enabled service ports
      ansible.builtin.debug:
        msg: "{{ item.key }} runs on port {{ item.value }}"
      loop: "{{ enabled_ports | dict2items }}"
      # Shows: nginx:80, redis:6379, postgresql:5432
```

## Dynamic Configuration Building

A practical use case is building configuration dictionaries from multiple sources and then writing them out.

```yaml
# dynamic-config.yml
# Builds a config dictionary from multiple sources and writes it
- name: Build and deploy dynamic configuration
  hosts: appservers
  become: true
  vars:
    base_config:
      - key: app_name
        value: myapp
      - key: log_level
        value: info
      - key: workers
        value: 4
    env_overrides:
      - key: log_level
        value: debug
      - key: debug_mode
        value: true
  tasks:
    - name: Merge base config and overrides
      ansible.builtin.set_fact:
        final_config: "{{ (base_config + env_overrides) | items2dict }}"
      # Later items override earlier ones with the same key

    - name: Write configuration file
      ansible.builtin.copy:
        dest: /etc/myapp/config.yml
        content: "{{ final_config | to_nice_yaml }}"
        mode: '0644'
```

The key behavior here is that when duplicate keys exist, the last one wins. So `env_overrides` will override the `log_level` from `base_config`.

## Using items2dict with Registered Variables

After running tasks in a loop, you can restructure the results using `items2dict`.

```yaml
# collect-and-convert.yml
# Gathers package versions and creates a lookup dictionary
- name: Collect package versions
  hosts: all
  tasks:
    - name: Get package versions
      ansible.builtin.shell: "dpkg-query -W -f='${Version}' {{ item }}"
      loop:
        - nginx
        - redis-server
        - postgresql-14
      register: version_results
      changed_when: false
      failed_when: false

    - name: Build version dictionary
      ansible.builtin.set_fact:
        package_versions: "{{ version_list | items2dict }}"
      vars:
        version_list: >-
          [
          {% for result in version_results.results %}
            {
              "key": "{{ result.item }}",
              "value": "{{ result.stdout | default('not installed') }}"
            }{{ "," if not loop.last else "" }}
          {% endfor %}
          ]

    - name: Display package versions
      ansible.builtin.debug:
        msg: "{{ item.key }}: {{ item.value }}"
      loop: "{{ package_versions | dict2items }}"
```

## Round-Trip: dict2items and items2dict

A powerful pattern is converting a dictionary to items, filtering or transforming them, and converting back.

```yaml
# round-trip.yml
# Filters a dictionary by converting to items, filtering, and converting back
- name: Filter dictionary entries
  hosts: localhost
  gather_facts: false
  vars:
    all_settings:
      database_host: db.internal
      database_port: 5432
      cache_host: redis.internal
      cache_port: 6379
      app_debug: false
      app_workers: 4
  tasks:
    - name: Extract only database settings
      ansible.builtin.set_fact:
        db_settings: >-
          {{
            all_settings | dict2items
            | selectattr('key', 'match', '^database_')
            | items2dict
          }}

    - name: Show database settings
      ansible.builtin.debug:
        msg: "{{ db_settings }}"
      # Output: {"database_host": "db.internal", "database_port": 5432}
```

This round-trip pattern (dict2items, filter, items2dict) is extremely useful for extracting subsets of configuration data.

## Summary

The `items2dict` filter fills an important gap in Ansible's data manipulation toolkit. It lets you convert lists of key-value pairs into dictionaries, which is the reverse of `dict2items`. The most common patterns are: transforming API or external data into lookup tables, rebuilding dictionaries from registered loop output, merging configuration from multiple sources where later entries override earlier ones, and the round-trip pattern of dict2items, filter, items2dict for extracting subsets of dictionary data. Combined with `loop`, it gives you flexible control over how complex data flows through your playbooks.
