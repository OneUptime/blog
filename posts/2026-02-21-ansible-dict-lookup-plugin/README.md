# How to Use the Ansible dict Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Dictionaries, Data Structures

Description: Learn how to use the Ansible dict lookup plugin to iterate over dictionary key-value pairs in your playbooks and roles.

---

Dictionaries (also called hashes or maps) are fundamental data structures in Ansible. You use them to represent structured data like user accounts, service configurations, or host metadata. The `dict` lookup plugin converts a dictionary into a list of key-value pairs, making it easy to loop over the entries and work with both the key and value in each iteration.

## What the dict Lookup Does

The `dict` lookup takes a dictionary and returns a list of objects, each containing a `key` and `value` attribute. This transforms an unordered dictionary into something you can iterate over with `loop`, giving you access to both the key name and its associated value.

## Basic Usage

The simplest form converts a dictionary to a loopable list.

This playbook creates users from a dictionary:

```yaml
# playbook.yml - Loop over a dictionary of users
---
- name: Create user accounts
  hosts: all
  vars:
    users:
      alice:
        uid: 1001
        shell: /bin/bash
        groups: [sudo, developers]
      bob:
        uid: 1002
        shell: /bin/zsh
        groups: [developers]
      charlie:
        uid: 1003
        shell: /bin/bash
        groups: [operators]
  tasks:
    - name: Create each user
      ansible.builtin.user:
        name: "{{ item.key }}"
        uid: "{{ item.value.uid }}"
        shell: "{{ item.value.shell }}"
        groups: "{{ item.value.groups }}"
        state: present
      loop: "{{ lookup('dict', users, wantlist=True) }}"
```

Each `item` in the loop has two attributes:
- `item.key` contains the dictionary key (e.g., `alice`, `bob`, `charlie`)
- `item.value` contains the associated value (e.g., the nested dictionary with uid, shell, groups)

## Simple Key-Value Dictionaries

For flat dictionaries where values are simple strings or numbers, the pattern is even cleaner.

This playbook sets environment variables from a dictionary:

```yaml
# playbook.yml - Set environment variables from a dictionary
---
- name: Configure application environment
  hosts: appservers
  vars:
    app_env:
      APP_NAME: myapp
      APP_PORT: "8080"
      APP_LOG_LEVEL: info
      APP_DB_HOST: db.internal.example.com
      APP_CACHE_TTL: "3600"
  tasks:
    - name: Write environment file
      ansible.builtin.lineinfile:
        path: /etc/myapp/environment
        regexp: "^{{ item.key }}="
        line: "{{ item.key }}={{ item.value }}"
        create: true
        mode: '0644'
      loop: "{{ lookup('dict', app_env, wantlist=True) }}"
```

## Practical Example: Service Management

Here is a real-world scenario managing multiple systemd services with different configurations.

```yaml
# playbook.yml - Manage multiple services from a dictionary
---
- name: Configure and manage services
  hosts: all
  vars:
    services:
      nginx:
        package: nginx
        config_src: templates/nginx.conf.j2
        config_dest: /etc/nginx/nginx.conf
        enabled: true
        state: started
      redis:
        package: redis-server
        config_src: templates/redis.conf.j2
        config_dest: /etc/redis/redis.conf
        enabled: true
        state: started
      memcached:
        package: memcached
        config_src: templates/memcached.conf.j2
        config_dest: /etc/memcached.conf
        enabled: false
        state: stopped
  tasks:
    - name: Install service packages
      ansible.builtin.package:
        name: "{{ item.value.package }}"
        state: present
      loop: "{{ lookup('dict', services, wantlist=True) }}"

    - name: Deploy service configurations
      ansible.builtin.template:
        src: "{{ item.value.config_src }}"
        dest: "{{ item.value.config_dest }}"
        mode: '0644'
      loop: "{{ lookup('dict', services, wantlist=True) }}"
      notify: "restart {{ item.key }}"

    - name: Manage service states
      ansible.builtin.service:
        name: "{{ item.key }}"
        state: "{{ item.value.state }}"
        enabled: "{{ item.value.enabled }}"
      loop: "{{ lookup('dict', services, wantlist=True) }}"
```

## Filtering Dictionary Entries

You can combine `dict` lookup with `selectattr` to filter entries based on their values.

```yaml
# playbook.yml - Filter dictionary entries
---
- name: Work with filtered dictionaries
  hosts: localhost
  vars:
    applications:
      webapp:
        deploy: true
        port: 8080
        replicas: 3
      api:
        deploy: true
        port: 9090
        replicas: 2
      worker:
        deploy: false
        port: null
        replicas: 1
      scheduler:
        deploy: true
        port: null
        replicas: 1
  tasks:
    # Only process applications where deploy is true
    - name: Deploy enabled applications
      ansible.builtin.debug:
        msg: "Deploying {{ item.key }} with {{ item.value.replicas }} replicas"
      loop: "{{ lookup('dict', applications, wantlist=True) | selectattr('value.deploy', 'equalto', true) | list }}"

    # Only process applications that have a port defined
    - name: Configure port forwarding for apps with ports
      ansible.builtin.debug:
        msg: "{{ item.key }} listens on port {{ item.value.port }}"
      loop: "{{ lookup('dict', applications, wantlist=True) | selectattr('value.port', 'defined') | rejectattr('value.port', 'none') | list }}"
```

## DNS Records Management

Managing DNS records is a perfect use case for dictionary iteration.

```yaml
# playbook.yml - Manage DNS records from a dictionary
---
- name: Configure DNS records
  hosts: dns_servers
  vars:
    dns_records:
      web.example.com:
        type: A
        value: 192.168.1.10
        ttl: 300
      api.example.com:
        type: A
        value: 192.168.1.11
        ttl: 300
      mail.example.com:
        type: MX
        value: 10 mail.example.com.
        ttl: 3600
      _dmarc.example.com:
        type: TXT
        value: "v=DMARC1; p=reject"
        ttl: 86400
  tasks:
    - name: Display DNS record configuration
      ansible.builtin.debug:
        msg: "{{ item.key }} {{ item.value.type }} {{ item.value.value }} (TTL: {{ item.value.ttl }})"
      loop: "{{ lookup('dict', dns_records, wantlist=True) }}"

    - name: Generate BIND zone file entries
      ansible.builtin.lineinfile:
        path: /etc/bind/zones/db.example.com
        line: "{{ item.key }}. {{ item.value.ttl }} IN {{ item.value.type }} {{ item.value.value }}"
        regexp: "^{{ item.key | regex_escape }}\\."
      loop: "{{ lookup('dict', dns_records, wantlist=True) }}"
```

## Firewall Rules from Dictionaries

Another practical pattern is managing firewall rules stored as dictionaries.

```yaml
# playbook.yml - Firewall rules from dictionaries
---
- name: Configure firewall rules
  hosts: all
  vars:
    firewall_rules:
      allow_ssh:
        port: 22
        protocol: tcp
        source: 10.0.0.0/8
        action: accept
      allow_http:
        port: 80
        protocol: tcp
        source: 0.0.0.0/0
        action: accept
      allow_https:
        port: 443
        protocol: tcp
        source: 0.0.0.0/0
        action: accept
      allow_monitoring:
        port: 9100
        protocol: tcp
        source: 10.0.50.0/24
        action: accept
  tasks:
    - name: Apply firewall rules
      ansible.builtin.iptables:
        chain: INPUT
        protocol: "{{ item.value.protocol }}"
        destination_port: "{{ item.value.port }}"
        source: "{{ item.value.source }}"
        jump: "{{ item.value.action | upper }}"
        comment: "{{ item.key }}"
      loop: "{{ lookup('dict', firewall_rules, wantlist=True) }}"
```

## Nested Dictionaries

When dealing with deeply nested dictionaries, you can access nested values using dot notation.

```yaml
# playbook.yml - Working with nested dictionaries
---
- name: Configure databases from nested dict
  hosts: dbservers
  vars:
    databases:
      production:
        connection:
          host: prod-db.internal
          port: 5432
        settings:
          max_connections: 200
          shared_buffers: 4GB
      staging:
        connection:
          host: staging-db.internal
          port: 5432
        settings:
          max_connections: 50
          shared_buffers: 1GB
  tasks:
    - name: Display database configurations
      ansible.builtin.debug:
        msg: >
          {{ item.key }}: host={{ item.value.connection.host }},
          port={{ item.value.connection.port }},
          max_conn={{ item.value.settings.max_connections }}
      loop: "{{ lookup('dict', databases, wantlist=True) }}"
```

## dict vs dict2items Filter

Ansible also provides a `dict2items` filter that does the same thing as the `dict` lookup. Here is how they compare:

```yaml
# playbook.yml - Comparing dict lookup with dict2items filter
---
- name: Compare dict lookup and dict2items
  hosts: localhost
  vars:
    my_dict:
      key1: value1
      key2: value2
      key3: value3
  tasks:
    # Using dict lookup
    - name: With dict lookup
      ansible.builtin.debug:
        msg: "{{ item.key }}={{ item.value }}"
      loop: "{{ lookup('dict', my_dict, wantlist=True) }}"

    # Using dict2items filter (functionally equivalent)
    - name: With dict2items filter
      ansible.builtin.debug:
        msg: "{{ item.key }}={{ item.value }}"
      loop: "{{ my_dict | dict2items }}"
```

Both produce the same result. The `dict2items` filter is generally preferred in modern Ansible because it is more readable and can be chained with other filters. However, the `dict` lookup works in contexts where filters are not available (like `with_dict` in older playbooks).

## Tips and Gotchas

1. **Dictionary order**: Dictionaries in Python (and YAML) do not guarantee order in older Python versions. In Python 3.7+ (which modern Ansible requires), insertion order is preserved. But do not rely on a specific iteration order if you need deterministic results; sort the output instead.

2. **wantlist is important**: Always use `wantlist=True` when using the dict lookup with `loop`. Without it, a single-entry dictionary might not behave as expected.

3. **Undefined values**: If a nested value might not exist, use the `default` filter: `{{ item.value.optional_field | default('fallback') }}`.

4. **Large dictionaries**: The dict lookup materializes the entire list in memory. For very large dictionaries (thousands of entries), this is fine, but be aware of it.

5. **Combining with other plugins**: You can use `dict` lookup output as input to other operations, like `json_query` or `map`, for complex data transformations.

The `dict` lookup plugin is bread-and-butter Ansible. Any time you have structured data in a dictionary and need to iterate over it, this plugin (or its `dict2items` filter equivalent) is the way to go.
