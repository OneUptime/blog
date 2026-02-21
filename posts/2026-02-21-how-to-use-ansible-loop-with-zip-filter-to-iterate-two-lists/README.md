# How to Use Ansible loop with zip Filter to Iterate Two Lists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Jinja2 Filters, Parallel Iteration

Description: Learn how to use the zip filter in Ansible to iterate over two or more lists in parallel, pairing corresponding elements together.

---

The `zip` filter pairs up elements from two or more lists by position. The first element of list A pairs with the first element of list B, the second with the second, and so on. This is fundamentally different from `product`, which creates all possible combinations. With `zip`, you get parallel iteration where corresponding items are processed together.

## zip vs. product

To understand `zip`, contrast it with `product`:

```yaml
# product creates all combinations: (a,1), (a,2), (b,1), (b,2)
- name: Product example (4 iterations)
  ansible.builtin.debug:
    msg: "{{ item.0 }}-{{ item.1 }}"
  loop: "{{ ['a','b'] | product([1,2]) | list }}"

# zip pairs by position: (a,1), (b,2)
- name: Zip example (2 iterations)
  ansible.builtin.debug:
    msg: "{{ item.0 }}-{{ item.1 }}"
  loop: "{{ ['a','b'] | zip([1,2]) | list }}"
```

Product gives you 4 iterations (2x2). Zip gives you 2 iterations (min of 2,2). This difference is critical to understand.

## Basic zip Usage

```yaml
# Pair server names with their IP addresses
- name: Configure host entries
  ansible.builtin.lineinfile:
    path: /etc/hosts
    line: "{{ item.1 }}  {{ item.0 }}"
    state: present
  loop: "{{ hostnames | zip(ip_addresses) | list }}"
  vars:
    hostnames:
      - web01.internal
      - web02.internal
      - db01.internal
    ip_addresses:
      - 10.0.1.10
      - 10.0.1.11
      - 10.0.2.10
```

Each hostname is paired with its corresponding IP address by position. The first hostname gets the first IP, and so on.

## Zipping Three or More Lists

You can zip multiple lists together:

```yaml
# Pair servers with their roles and ports
- name: Configure services
  ansible.builtin.debug:
    msg: "Server {{ item.0 }} runs {{ item.1 }} on port {{ item.2 }}"
  loop: "{{ servers | zip(roles, ports) | list }}"
  vars:
    servers:
      - web01
      - api01
      - db01
    roles:
      - nginx
      - flask
      - postgresql
    ports:
      - 80
      - 8080
      - 5432
```

Each iteration gets a three-element tuple: `item.0` from servers, `item.1` from roles, `item.2` from ports.

## Handling Lists of Different Lengths

By default, `zip` stops at the shortest list. If one list is shorter than the others, extra elements from longer lists are ignored:

```yaml
# zip stops at the shortest list
- name: Zip with different lengths
  ansible.builtin.debug:
    msg: "{{ item.0 }} -> {{ item.1 }}"
  loop: "{{ names | zip(values) | list }}"
  vars:
    names: [a, b, c, d, e]
    values: [1, 2, 3]
  # Only 3 iterations: (a,1), (b,2), (c,3)
```

If you need to iterate over the longest list and fill missing values, use `zip_longest`:

```yaml
# zip_longest pads shorter lists with a fill value
- name: Zip with padding
  ansible.builtin.debug:
    msg: "{{ item.0 }} -> {{ item.1 }}"
  loop: "{{ names | zip_longest(values, fillvalue='N/A') | list }}"
  vars:
    names: [a, b, c, d, e]
    values: [1, 2, 3]
  # 5 iterations: (a,1), (b,2), (c,3), (d,N/A), (e,N/A)
```

## Practical Example: Mapping Source Files to Destinations

A very common task is copying files from a list of sources to a list of destinations:

```yaml
# Copy configuration files from source paths to destination paths
- name: Deploy configuration files
  ansible.builtin.copy:
    src: "{{ item.0 }}"
    dest: "{{ item.1 }}"
    owner: root
    group: root
    mode: '0644'
  loop: "{{ source_files | zip(dest_paths) | list }}"
  loop_control:
    label: "{{ item.0 | basename }} -> {{ item.1 }}"
  vars:
    source_files:
      - files/nginx.conf
      - files/php.ini
      - files/redis.conf
    dest_paths:
      - /etc/nginx/nginx.conf
      - /etc/php/8.1/fpm/php.ini
      - /etc/redis/redis.conf
```

## Creating Users with Separate Attribute Lists

Sometimes your data arrives as parallel arrays rather than a list of objects:

```yaml
# Create users from parallel attribute lists
- name: Create user accounts
  ansible.builtin.user:
    name: "{{ item.0 }}"
    uid: "{{ item.1 }}"
    shell: "{{ item.2 }}"
    state: present
  loop: "{{ usernames | zip(uids, shells) | list }}"
  loop_control:
    label: "{{ item.0 }} (uid={{ item.1 }})"
  vars:
    usernames:
      - deploy
      - appuser
      - monitoring
    uids:
      - 1100
      - 1101
      - 1102
    shells:
      - /bin/bash
      - /bin/bash
      - /usr/sbin/nologin
```

This is cleaner than building a list of dictionaries when the source data comes in columnar format, like from a CSV or from separate variable sources.

## Zipping Registered Results

You can zip registered results from different tasks:

```yaml
# Compare file checksums between two directories
- name: Get checksums from source directory
  ansible.builtin.stat:
    path: "/opt/source/{{ item }}"
    checksum_algorithm: sha256
  loop:
    - config.yml
    - database.yml
    - secrets.yml
  register: source_stats

- name: Get checksums from deployed directory
  ansible.builtin.stat:
    path: "/opt/deployed/{{ item }}"
    checksum_algorithm: sha256
  loop:
    - config.yml
    - database.yml
    - secrets.yml
  register: deployed_stats

- name: Report files that differ
  ansible.builtin.debug:
    msg: "{{ item.0.item }} has changed (source={{ item.0.stat.checksum }}, deployed={{ item.1.stat.checksum }})"
  loop: "{{ source_stats.results | zip(deployed_stats.results) | list }}"
  when: item.0.stat.checksum != item.1.stat.checksum
  loop_control:
    label: "{{ item.0.item }}"
```

This zips the two registered result lists together, allowing you to compare checksums file by file.

## Building Key-Value Pairs

You can use `zip` to create dictionaries from two separate lists:

```yaml
# Create a dictionary from parallel key and value lists
- name: Build config dictionary
  ansible.builtin.set_fact:
    config: "{{ dict(config_keys | zip(config_values)) }}"
  vars:
    config_keys:
      - database_host
      - database_port
      - database_name
    config_values:
      - db.example.com
      - 5432
      - myapp

- name: Show resulting config
  ansible.builtin.debug:
    var: config
  # Output: {"database_host": "db.example.com", "database_port": 5432, "database_name": "myapp"}
```

The `dict()` constructor takes a list of key-value pairs (which is exactly what `zip` produces) and creates a dictionary.

## Assigning Ports to Services

```yaml
# Assign sequential ports to services
- name: Configure service ports
  ansible.builtin.template:
    src: service.conf.j2
    dest: "/etc/services.d/{{ item.0 }}.conf"
  loop: "{{ service_names | zip(service_ports) | list }}"
  loop_control:
    label: "{{ item.0 }} -> port {{ item.1 }}"
  vars:
    service_names:
      - api
      - auth
      - notifications
      - search
    service_ports:
      - 8080
      - 8081
      - 8082
      - 8083
```

## Practical Example: Multi-Site Deployment

Here is a complete playbook that uses zip for deploying to multiple sites:

```yaml
# Deploy application to multiple sites with site-specific configurations
- name: Multi-site deployment
  hosts: localhost
  vars:
    site_names:
      - us-production
      - eu-production
      - ap-production
    site_endpoints:
      - https://us.api.example.com
      - https://eu.api.example.com
      - https://ap.api.example.com
    site_databases:
      - postgres://us-db.internal:5432/app
      - postgres://eu-db.internal:5432/app
      - postgres://ap-db.internal:5432/app
    site_replicas:
      - 3
      - 2
      - 2

  tasks:
    - name: Generate deployment manifests
      ansible.builtin.template:
        src: deployment.yml.j2
        dest: "/opt/deployments/{{ item.0 }}.yml"
      loop: "{{ site_names | zip(site_endpoints, site_databases, site_replicas) | list }}"
      loop_control:
        label: "{{ item.0 }}"
      vars:
        site_name: "{{ item.0 }}"
        endpoint: "{{ item.1 }}"
        database_url: "{{ item.2 }}"
        replicas: "{{ item.3 }}"

    - name: Apply deployment manifests
      ansible.builtin.command: "kubectl apply -f /opt/deployments/{{ item.0 }}.yml"
      loop: "{{ site_names | zip(site_endpoints) | list }}"
      loop_control:
        label: "{{ item.0 }}"
      changed_when: true

    - name: Verify deployments
      ansible.builtin.uri:
        url: "{{ item.1 }}/health"
        status_code: 200
      loop: "{{ site_names | zip(site_endpoints) | list }}"
      loop_control:
        label: "{{ item.0 }}"
      register: health_checks
      until: health_checks.status == 200
      retries: 10
      delay: 5
```

## When to Use zip vs. product

Use `zip` when your lists have a positional relationship and you want to pair items 1:1. The first server goes with the first IP, the second with the second, and so on.

Use `product` when you want every possible combination. Every user needs access to every database, every config goes to every region.

If you find yourself thinking "these lists correspond to each other", use `zip`. If you are thinking "I need all combinations of these", use `product`.

## Summary

The `zip` filter is the parallel iteration tool in Ansible. It pairs elements from two or more lists by their position, producing tuples that you can access with `item.0`, `item.1`, etc. Use it when your data is organized as parallel arrays, when you need to pair related data from different sources, or when you want to build dictionaries from separate key and value lists. Combined with `zip_longest` for uneven lists, it covers all positional iteration needs.
