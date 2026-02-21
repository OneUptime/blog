# How to Iterate Over a Dictionary in Ansible with dict2items

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Dictionaries, Jinja2 Filters

Description: Learn how to use the dict2items filter to iterate over dictionaries in Ansible loops with practical configuration management examples.

---

Dictionaries (also called hashes or maps) are a natural way to organize configuration data in Ansible. But the `loop` keyword expects a list, not a dictionary. The `dict2items` filter bridges this gap by converting a dictionary into a list of key-value pair objects that you can loop over. This filter is essential for any Ansible user who works with structured data.

## The Problem: Looping Over Dictionaries

Consider this dictionary of sysctl parameters:

```yaml
sysctl_settings:
  net.core.somaxconn: 1024
  net.ipv4.tcp_max_syn_backlog: 2048
  vm.swappiness: 10
  fs.file-max: 65536
```

You cannot pass this dictionary directly to `loop` because `loop` expects a list. If you try, Ansible will throw an error. You need to convert it first.

## How dict2items Works

The `dict2items` filter transforms a dictionary into a list of dictionaries, each with a `key` and `value` attribute:

```yaml
# Convert a dictionary to a list of key-value pairs
- name: Show dict2items output
  ansible.builtin.debug:
    msg: "{{ my_dict | dict2items }}"
  vars:
    my_dict:
      name: webserver
      port: 8080
      protocol: https
```

The output looks like this:

```json
[
  {"key": "name", "value": "webserver"},
  {"key": "port", "value": 8080},
  {"key": "protocol", "value": "https"}
]
```

Now you have a list that `loop` can work with, and you access each entry with `item.key` and `item.value`.

## Basic Dictionary Iteration

Here is the sysctl example done properly:

```yaml
# Apply sysctl settings by iterating over a dictionary
- name: Configure kernel parameters
  ansible.posix.sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    state: present
    reload: yes
  loop: "{{ sysctl_settings | dict2items }}"
  vars:
    sysctl_settings:
      net.core.somaxconn: "1024"
      net.ipv4.tcp_max_syn_backlog: "2048"
      vm.swappiness: "10"
      fs.file-max: "65536"
```

This is clean and readable. The dictionary format makes the data easy to understand at a glance, and `dict2items` converts it into the list format that `loop` requires.

## Custom Key and Value Names

By default, `dict2items` creates entries with `key` and `value` attributes. You can customize these names using the `key_name` and `value_name` parameters:

```yaml
# Use custom attribute names in dict2items output
- name: Show custom key/value names
  ansible.builtin.debug:
    msg: "Parameter {{ item.parameter }} = {{ item.setting }}"
  loop: "{{ config | dict2items(key_name='parameter', value_name='setting') }}"
  vars:
    config:
      max_connections: 100
      timeout: 30
      debug_mode: false
```

This produces entries like `{"parameter": "max_connections", "setting": 100}` instead of `{"key": "max_connections", "value": 100}`. It can make your task more readable when the generic "key" and "value" names do not convey the meaning well.

## Iterating Over Nested Dictionaries

When dictionary values are themselves dictionaries, `dict2items` still works, and you get the nested dictionary as the value:

```yaml
# Configure multiple virtual hosts from a nested dictionary
- name: Deploy virtual host configurations
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: "/etc/nginx/sites-available/{{ item.key }}.conf"
  loop: "{{ virtual_hosts | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  vars:
    virtual_hosts:
      api.example.com:
        port: 8080
        upstream: api_backend
        ssl: true
      app.example.com:
        port: 3000
        upstream: app_backend
        ssl: true
      static.example.com:
        port: 80
        upstream: none
        ssl: false
```

Inside the template, you can access `item.key` for the domain name and `item.value.port`, `item.value.upstream`, etc. for the configuration details.

## Combining dict2items with Filters

You can chain `dict2items` with other Jinja2 filters for more complex processing:

```yaml
# Filter dictionary entries before iterating
- name: Configure only SSL-enabled virtual hosts
  ansible.builtin.template:
    src: ssl-vhost.conf.j2
    dest: "/etc/nginx/sites-available/{{ item.key }}.conf"
  loop: >-
    {{
      virtual_hosts
      | dict2items
      | selectattr('value.ssl')
      | list
    }}
  loop_control:
    label: "{{ item.key }}"
  vars:
    virtual_hosts:
      api.example.com:
        port: 8080
        ssl: true
      internal.example.com:
        port: 9090
        ssl: false
      app.example.com:
        port: 3000
        ssl: true
```

Here we convert to items, filter to only those with `ssl: true`, convert back to a list, and then loop. Only `api.example.com` and `app.example.com` will be processed.

## The Reverse: items2dict

Sometimes you need to go the other direction. The `items2dict` filter converts a list of key-value pairs back into a dictionary:

```yaml
# Convert a list of key-value pairs into a dictionary
- name: Build config dictionary from list
  ansible.builtin.set_fact:
    config: "{{ config_items | items2dict }}"
  vars:
    config_items:
      - key: database_host
        value: db.example.com
      - key: database_port
        value: 5432
      - key: database_name
        value: myapp

- name: Show resulting dictionary
  ansible.builtin.debug:
    var: config
  # Output: {"database_host": "db.example.com", "database_port": 5432, "database_name": "myapp"}
```

This is useful when you receive data in list format (from an API, a registered result, etc.) and need to work with it as a dictionary.

## Environment Variables from Dictionary

A common use case is setting environment variables from a dictionary:

```yaml
# Write environment variables to a file from a dictionary
- name: Configure application environment
  ansible.builtin.lineinfile:
    path: /etc/myapp/environment
    regexp: "^{{ item.key }}="
    line: "{{ item.key }}={{ item.value }}"
    create: yes
    mode: '0600'
  loop: "{{ app_env | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  vars:
    app_env:
      DATABASE_URL: "postgresql://localhost/myapp"
      REDIS_URL: "redis://localhost:6379"
      SECRET_KEY: "change-me-in-production"
      LOG_LEVEL: "info"
      WORKERS: "4"
```

Each dictionary entry becomes a line in the environment file. The `regexp` parameter ensures that if a variable already exists, it gets updated rather than duplicated.

## Managing Firewall Rules from Dictionary

```yaml
# Configure firewall rules from a dictionary mapping service names to ports
- name: Open service ports
  ansible.posix.firewalld:
    port: "{{ item.value }}/tcp"
    permanent: yes
    state: enabled
    immediate: yes
  loop: "{{ service_ports | dict2items }}"
  loop_control:
    label: "{{ item.key }} ({{ item.value }})"
  vars:
    service_ports:
      http: 80
      https: 443
      ssh: 22
      monitoring: 9090
      grafana: 3000
```

The `label` in `loop_control` gives you nice output like "http (80)" instead of showing the full dictionary structure.

## Practical Example: Multi-Service Configuration

Here is a complete playbook that manages multiple services using dictionary iteration:

```yaml
# Configure and manage multiple services from a dictionary definition
- name: Multi-service configuration
  hosts: app_servers
  become: yes
  vars:
    services:
      nginx:
        package: nginx
        config_src: nginx.conf.j2
        config_dest: /etc/nginx/nginx.conf
        port: 80
        enabled: true
      postgresql:
        package: postgresql
        config_src: postgresql.conf.j2
        config_dest: /etc/postgresql/14/main/postgresql.conf
        port: 5432
        enabled: true
      redis:
        package: redis-server
        config_src: redis.conf.j2
        config_dest: /etc/redis/redis.conf
        port: 6379
        enabled: true
      memcached:
        package: memcached
        config_src: memcached.conf.j2
        config_dest: /etc/memcached.conf
        port: 11211
        enabled: false

  tasks:
    - name: Install service packages
      ansible.builtin.apt:
        name: "{{ item.value.package }}"
        state: present
      loop: "{{ services | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
      when: item.value.enabled

    - name: Deploy service configurations
      ansible.builtin.template:
        src: "{{ item.value.config_src }}"
        dest: "{{ item.value.config_dest }}"
        owner: root
        group: root
        mode: '0644'
      loop: "{{ services | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
      when: item.value.enabled
      notify: "restart {{ item.key }}"

    - name: Manage service state
      ansible.builtin.systemd:
        name: "{{ item.key }}"
        state: "{{ 'started' if item.value.enabled else 'stopped' }}"
        enabled: "{{ item.value.enabled }}"
      loop: "{{ services | dict2items }}"
      loop_control:
        label: "{{ item.key }}"

    - name: Open firewall ports for enabled services
      ansible.posix.firewalld:
        port: "{{ item.value.port }}/tcp"
        permanent: yes
        state: "{{ 'enabled' if item.value.enabled else 'disabled' }}"
      loop: "{{ services | dict2items }}"
      loop_control:
        label: "{{ item.key }} port {{ item.value.port }}"

  handlers:
    - name: restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted

    - name: restart postgresql
      ansible.builtin.service:
        name: postgresql
        state: restarted

    - name: restart redis
      ansible.builtin.service:
        name: redis-server
        state: restarted
```

This playbook manages four services from a single dictionary. Adding a fifth service means adding one more entry to the `services` dictionary. Every task adapts automatically because they all iterate over the same data structure.

## Key Takeaways

The `dict2items` filter is the bridge between Ansible's dictionary-friendly variable format and the list-based `loop` keyword. Use dictionaries for your data when key-value pairs make the data easier to understand. Use `dict2items` when you need to iterate over that data. And remember that you can chain it with `selectattr`, `rejectattr`, and other filters to narrow down which entries get processed. For the reverse conversion, `items2dict` turns lists back into dictionaries.
