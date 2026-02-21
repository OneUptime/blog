# How to Convert Between Lists and Dictionaries in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Filters, Data Transformation, DevOps

Description: Learn how to convert between list and dictionary data structures in Ansible using dict2items, items2dict, zip, and other transformation filters.

---

Ansible modules and filters often expect data in a specific format. Some tasks work better with dictionaries, others need lists. API responses come in one format while Jinja2 templates need another. Being able to convert fluently between lists and dictionaries is a core skill for writing effective playbooks. In this post, I will cover every conversion technique and show you when each one is the right choice.

## Dictionary to List: dict2items

The `dict2items` filter converts a dictionary into a list of key-value pairs:

```yaml
---
# dict-to-list.yml
# Convert dictionaries to lists for looping and filtering

- hosts: localhost
  vars:
    environment_vars:
      DATABASE_URL: postgresql://localhost/myapp
      REDIS_URL: redis://localhost:6379
      SECRET_KEY: abc123
      LOG_LEVEL: info
      PORT: "8080"

  tasks:
    # Convert dict to list of {key: ..., value: ...} items
    - name: Convert to list
      set_fact:
        env_list: "{{ environment_vars | dict2items }}"

    - name: Show the converted list
      debug:
        var: env_list
    # Output:
    # [
    #   {key: DATABASE_URL, value: postgresql://localhost/myapp},
    #   {key: REDIS_URL, value: redis://localhost:6379},
    #   {key: SECRET_KEY, value: abc123},
    #   {key: LOG_LEVEL, value: info},
    #   {key: PORT, value: "8080"}
    # ]

    # Now you can loop over the dict as a list
    - name: Write env file
      lineinfile:
        path: /opt/myapp/.env
        regexp: "^{{ item.key }}="
        line: "{{ item.key }}={{ item.value }}"
        create: yes
      loop: "{{ environment_vars | dict2items }}"

    # You can also filter dict items using list filters
    - name: Get only URL-type variables
      set_fact:
        url_vars: "{{ environment_vars | dict2items | selectattr('key', 'match', '.*_URL$') | list }}"

    - name: Show URL variables
      debug:
        var: url_vars
    # Output: [{key: DATABASE_URL, value: ...}, {key: REDIS_URL, value: ...}]
```

### Custom Key Names with dict2items

By default, `dict2items` uses `key` and `value` as field names. You can customize them:

```yaml
    # Use custom field names
    - name: Convert with custom field names
      set_fact:
        custom_list: "{{ environment_vars | dict2items(key_name='name', value_name='setting') }}"

    - name: Show custom field names
      debug:
        msg: "{{ item.name }}={{ item.setting }}"
      loop: "{{ custom_list }}"
```

## List to Dictionary: items2dict

The `items2dict` filter converts a list of key-value pairs back into a dictionary:

```yaml
---
# list-to-dict.yml
# Convert lists back to dictionaries

- hosts: localhost
  vars:
    # A list of key-value items
    config_items:
      - key: port
        value: 8080
      - key: workers
        value: 4
      - key: log_level
        value: info
      - key: timeout
        value: 30

  tasks:
    # Convert list to dictionary
    - name: Convert to dictionary
      set_fact:
        config_dict: "{{ config_items | items2dict }}"

    - name: Show the dictionary
      debug:
        var: config_dict
    # Output: {port: 8080, workers: 4, log_level: info, timeout: 30}
```

### Custom Key Names with items2dict

If your list items use different field names:

```yaml
  vars:
    services_list:
      - name: nginx
        port: 80
      - name: redis
        port: 6379
      - name: postgres
        port: 5432

  tasks:
    # Convert using custom field names as the dict key and value
    - name: Create port lookup dictionary
      set_fact:
        port_lookup: "{{ services_list | items2dict(key_name='name', value_name='port') }}"

    - name: Show port lookup
      debug:
        var: port_lookup
    # Output: {nginx: 80, redis: 6379, postgres: 5432}

    # Now you can look up ports by service name
    - name: Get nginx port
      debug:
        msg: "Nginx runs on port {{ port_lookup.nginx }}"
```

## Using zip to Create Dictionaries from Two Lists

The `zip` filter pairs up elements from two lists, which you can then convert to a dictionary:

```yaml
---
# zip-to-dict.yml
# Create dictionaries by zipping two parallel lists

- hosts: localhost
  vars:
    server_names:
      - web01
      - web02
      - web03
    server_ips:
      - 10.0.1.10
      - 10.0.1.11
      - 10.0.1.12

  tasks:
    # Zip two lists into pairs, then convert to a dictionary
    - name: Create server lookup dictionary
      set_fact:
        server_lookup: "{{ dict(server_names | zip(server_ips)) }}"

    - name: Show server lookup
      debug:
        var: server_lookup
    # Output: {web01: 10.0.1.10, web02: 10.0.1.11, web03: 10.0.1.12}

    # Access by server name
    - name: Get web02 IP
      debug:
        msg: "web02 IP: {{ server_lookup.web02 }}"
```

## Extracting Lists from Dictionaries

Pull out just the keys or values as lists:

```yaml
---
# extract-lists.yml
# Extract keys and values as separate lists

- hosts: localhost
  vars:
    ports:
      http: 80
      https: 443
      ssh: 22
      mysql: 3306
      postgres: 5432

  tasks:
    # Get keys as a list
    - name: Get protocol names
      debug:
        msg: "Protocols: {{ ports.keys() | list }}"
    # Output: [http, https, ssh, mysql, postgres]

    # Get values as a list
    - name: Get port numbers
      debug:
        msg: "Ports: {{ ports.values() | list }}"
    # Output: [80, 443, 22, 3306, 5432]

    # Get sorted port numbers
    - name: Get sorted ports
      debug:
        msg: "Sorted ports: {{ ports.values() | list | sort }}"
```

## Real-World Conversion Patterns

### Pattern 1: Gathering System Data into a Dictionary

```yaml
---
# gather-to-dict.yml
# Collect data from multiple tasks into a dictionary

- hosts: webservers
  tasks:
    # Gather data from multiple commands
    - name: Get hostname
      command: hostname -f
      register: hostname_result
      changed_when: false

    - name: Get kernel version
      command: uname -r
      register: kernel_result
      changed_when: false

    - name: Get uptime
      command: uptime -p
      register: uptime_result
      changed_when: false

    # Build a dictionary from the results
    - name: Create system info dictionary
      set_fact:
        system_info: "{{ dict(['hostname', 'kernel', 'uptime'] | zip([hostname_result.stdout, kernel_result.stdout, uptime_result.stdout])) }}"

    - name: Show system info
      debug:
        var: system_info
```

### Pattern 2: Transforming API Response Format

```yaml
---
# transform-api.yml
# Transform an API response from one format to another

- hosts: localhost
  vars:
    # Simulated API response: list of user objects
    api_response:
      - id: 1
        username: alice
        email: alice@example.com
        active: true
      - id: 2
        username: bob
        email: bob@example.com
        active: false
      - id: 3
        username: charlie
        email: charlie@example.com
        active: true

  tasks:
    # Convert list to a lookup dictionary by username
    - name: Create username lookup
      set_fact:
        user_lookup: "{{ dict(api_response | map(attribute='username') | zip(api_response)) }}"

    - name: Look up alice's email
      debug:
        msg: "Alice's email: {{ user_lookup.alice.email }}"

    # Create an email-to-username mapping
    - name: Create email to username mapping
      set_fact:
        email_to_user: "{{ dict(api_response | map(attribute='email') | zip(api_response | map(attribute='username'))) }}"

    - name: Look up user by email
      debug:
        msg: "bob@example.com belongs to: {{ email_to_user['bob@example.com'] }}"

    # Filter active users and create a list of their emails
    - name: Get active user emails
      set_fact:
        active_emails: "{{ api_response | selectattr('active') | map(attribute='email') | list }}"

    - name: Show active user emails
      debug:
        var: active_emails
    # Output: [alice@example.com, charlie@example.com]
```

### Pattern 3: Converting Flat Variables to Structured Data

```yaml
---
# flat-to-structured.yml
# Convert flat variables into structured configuration

- hosts: localhost
  vars:
    # Flat variables (might come from different sources)
    db_host: db.example.com
    db_port: 5432
    db_name: myapp
    db_user: myapp
    cache_host: redis.example.com
    cache_port: 6379
    cache_db: 0

  tasks:
    # Group flat variables into structured dictionaries
    - name: Build structured config from flat vars
      set_fact:
        app_config:
          database: "{{ dict(['host', 'port', 'name', 'user'] | zip([db_host, db_port, db_name, db_user])) }}"
          cache: "{{ dict(['host', 'port', 'db'] | zip([cache_host, cache_port, cache_db])) }}"

    - name: Show structured config
      debug:
        var: app_config
    # Output:
    # database: {host: db.example.com, port: 5432, name: myapp, user: myapp}
    # cache: {host: redis.example.com, port: 6379, db: 0}

    # Now use it in a template
    - name: Deploy structured configuration
      template:
        src: app-config.yml.j2
        dest: /opt/myapp/config.yml
```

### Pattern 4: Grouping List Items by Attribute

```yaml
---
# group-by-attribute.yml
# Group a list of items by a specific attribute

- hosts: localhost
  vars:
    servers:
      - name: web01
        role: web
      - name: web02
        role: web
      - name: db01
        role: database
      - name: db02
        role: database
      - name: cache01
        role: cache

  tasks:
    # Group servers by role into a dictionary
    - name: Group by role
      set_fact:
        by_role: "{{ by_role | default({}) | combine({item: servers | selectattr('role', 'eq', item) | map(attribute='name') | list}) }}"
      loop: "{{ servers | map(attribute='role') | unique | list }}"

    - name: Show grouped servers
      debug:
        var: by_role
    # Output:
    # web: [web01, web02]
    # database: [db01, db02]
    # cache: [cache01]
```

## Wrapping Up

Converting between lists and dictionaries is a daily task in Ansible. The `dict2items` and `items2dict` filters handle the standard conversions. The `zip` function paired with `dict()` lets you create dictionaries from parallel lists. The `map(attribute=...)` filter extracts specific fields into flat lists. And combining these conversions with `selectattr` and `rejectattr` gives you powerful data transformation capabilities. Once you internalize these patterns, you can reshape any data structure to match what your modules, templates, and downstream tasks expect.
