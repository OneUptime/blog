# How to Use the Ansible items Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Loops, Iteration

Description: Learn how to use the Ansible items lookup plugin to iterate over lists and flatten nested structures in your playbook loops.

---

The `items` lookup plugin is the most basic and commonly used lookup for looping in Ansible. It takes one or more lists and flattens them into a single list for iteration. If you have used `with_items` in older Ansible playbooks, you have already used this plugin. In modern Ansible, it is the mechanism behind the `loop` keyword when you pass a flat list.

## What the items Lookup Does

The `items` lookup takes one or more lists and returns a flattened (one level deep) list of their elements. If you pass it nested lists, it flattens them one level. This makes it easy to combine multiple lists into a single loop without worrying about nesting.

## Basic Usage

The simplest form iterates over a list of items.

This playbook installs multiple packages:

```yaml
# playbook.yml - Install packages using items
---
- name: Install required packages
  hosts: all
  tasks:
    # Modern approach using loop (recommended)
    - name: Install packages with loop
      ansible.builtin.package:
        name: "{{ item }}"
        state: present
      loop:
        - nginx
        - postgresql
        - redis
        - python3

    # Equivalent using the items lookup explicitly
    - name: Install packages with items lookup
      ansible.builtin.package:
        name: "{{ item }}"
        state: present
      loop: "{{ lookup('items', 'nginx', 'postgresql', 'redis', 'python3', wantlist=True) }}"
```

## Flattening Nested Lists

The key behavior of `items` is one-level flattening. This is useful when you combine multiple variable lists.

```yaml
# playbook.yml - Flatten nested lists with items
---
- name: Install packages from multiple sources
  hosts: all
  vars:
    common_packages:
      - vim
      - curl
      - wget
      - htop
    security_packages:
      - fail2ban
      - ufw
      - clamav
    monitoring_packages:
      - prometheus-node-exporter
      - collectd
  tasks:
    # items flattens one level, combining all three lists
    - name: Install all packages
      ansible.builtin.package:
        name: "{{ item }}"
        state: present
      loop: "{{ lookup('items', common_packages, security_packages, monitoring_packages, wantlist=True) }}"
```

This flattens the three separate lists into one loop that iterates over all packages.

## items vs flatten Filter

In modern Ansible, you can achieve the same result with the `flatten` filter:

```yaml
# playbook.yml - Comparing items lookup with flatten filter
---
- name: Compare flattening approaches
  hosts: localhost
  vars:
    list_a: [1, 2, 3]
    list_b: [4, 5, 6]
    nested_list: [[1, 2], [3, 4], [5, 6]]
  tasks:
    # Using items lookup to combine lists
    - name: With items
      ansible.builtin.debug:
        msg: "{{ item }}"
      loop: "{{ lookup('items', list_a, list_b, wantlist=True) }}"

    # Using flatten filter (modern equivalent)
    - name: With flatten
      ansible.builtin.debug:
        msg: "{{ item }}"
      loop: "{{ (list_a + list_b) | flatten(1) }}"

    # Flattening nested lists
    - name: Flatten one level
      ansible.builtin.debug:
        msg: "{{ item }}"
      loop: "{{ nested_list | flatten(1) }}"
```

## Practical Example: User Management

Here is a real-world scenario managing user accounts across different groups.

```yaml
# playbook.yml - Manage users from multiple group definitions
---
- name: Manage user accounts
  hosts: all
  vars:
    admin_users:
      - name: alice
        shell: /bin/bash
        groups: [sudo, adm]
      - name: bob
        shell: /bin/bash
        groups: [sudo]
    app_users:
      - name: deploy
        shell: /bin/bash
        groups: [www-data]
      - name: appworker
        shell: /usr/sbin/nologin
        groups: [www-data]
    monitoring_users:
      - name: prometheus
        shell: /usr/sbin/nologin
        groups: [monitoring]
  tasks:
    - name: Create all users from all groups
      ansible.builtin.user:
        name: "{{ item.name }}"
        shell: "{{ item.shell }}"
        groups: "{{ item.groups }}"
        state: present
      loop: "{{ lookup('items', admin_users, app_users, monitoring_users, wantlist=True) }}"
```

## Dynamic List Combination

You can conditionally include lists in the items lookup based on variables or facts.

```yaml
# playbook.yml - Conditionally combine package lists
---
- name: Install packages based on server role
  hosts: all
  vars:
    base_packages:
      - vim
      - curl
      - net-tools
    web_packages:
      - nginx
      - certbot
    db_packages:
      - postgresql
      - postgresql-contrib
    is_webserver: true
    is_dbserver: false
  tasks:
    - name: Build combined package list
      ansible.builtin.set_fact:
        all_packages: >-
          {{ base_packages
             + (web_packages if is_webserver else [])
             + (db_packages if is_dbserver else []) }}

    - name: Install all required packages
      ansible.builtin.package:
        name: "{{ item }}"
        state: present
      loop: "{{ all_packages }}"
```

## Service Management with items

Managing multiple services in a single loop:

```yaml
# playbook.yml - Start and enable multiple services
---
- name: Configure services
  hosts: all
  vars:
    enabled_services:
      - nginx
      - redis
      - postgresql
    disabled_services:
      - apache2
      - sendmail
  tasks:
    - name: Enable and start services
      ansible.builtin.service:
        name: "{{ item }}"
        state: started
        enabled: true
      loop: "{{ enabled_services }}"

    - name: Disable and stop services
      ansible.builtin.service:
        name: "{{ item }}"
        state: stopped
        enabled: false
      loop: "{{ disabled_services }}"
      ignore_errors: true
```

## Directory and File Structure Creation

Creating multiple directories and files in a single pass:

```yaml
# playbook.yml - Create application directory structure
---
- name: Set up application directories
  hosts: appservers
  vars:
    app_dirs:
      - /opt/myapp
      - /opt/myapp/bin
      - /opt/myapp/config
      - /opt/myapp/data
      - /opt/myapp/logs
      - /opt/myapp/tmp
    log_dirs:
      - /var/log/myapp
      - /var/log/myapp/access
      - /var/log/myapp/error
      - /var/log/myapp/audit
  tasks:
    - name: Create all application directories
      ansible.builtin.file:
        path: "{{ item }}"
        state: directory
        mode: '0755'
        owner: myapp
        group: myapp
      loop: "{{ lookup('items', app_dirs, log_dirs, wantlist=True) }}"
```

## Firewall Rules

Opening multiple ports with a simple list:

```yaml
# playbook.yml - Configure firewall rules from a list
---
- name: Configure firewall
  hosts: all
  vars:
    public_ports:
      - 80
      - 443
    internal_ports:
      - 8080
      - 9090
      - 5432
      - 6379
  tasks:
    - name: Open public ports
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "{{ item }}"
        source: "0.0.0.0/0"
        jump: ACCEPT
        comment: "Public port {{ item }}"
      loop: "{{ public_ports }}"

    - name: Open internal ports
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "{{ item }}"
        source: "10.0.0.0/8"
        jump: ACCEPT
        comment: "Internal port {{ item }}"
      loop: "{{ internal_ports }}"
```

## with_items vs loop

In older Ansible (pre-2.5), you used `with_items`. In modern Ansible, `loop` is the standard. Here is the migration:

```yaml
# playbook.yml - Old style vs new style
---
- name: Compare loop styles
  hosts: localhost
  vars:
    packages:
      - vim
      - curl
      - wget
  tasks:
    # Old style (still works but not recommended)
    - name: Install packages (old style)
      ansible.builtin.debug:
        msg: "{{ item }}"
      with_items: "{{ packages }}"

    # New style (recommended)
    - name: Install packages (new style)
      ansible.builtin.debug:
        msg: "{{ item }}"
      loop: "{{ packages }}"

    # Note: loop does NOT auto-flatten like with_items
    # If you need flattening with loop, use the flatten filter
    - name: Flatten with loop
      ansible.builtin.debug:
        msg: "{{ item }}"
      loop: "{{ [packages, ['git', 'make']] | flatten(1) }}"
```

One important difference: `loop` does NOT automatically flatten lists like `with_items` did. If you pass a nested list to `loop`, each element (including sub-lists) becomes an iteration item. To get the old `with_items` flattening behavior with `loop`, use the `flatten` filter.

## Performance Tip: Package Lists

For package management, most package modules accept a list directly, which is faster than looping:

```yaml
# playbook.yml - Efficient package installation
---
- name: Install packages efficiently
  hosts: all
  vars:
    packages:
      - vim
      - curl
      - wget
      - htop
      - tree
  tasks:
    # SLOW: One package manager call per item
    - name: Install one at a time (slow)
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop: "{{ packages }}"

    # FAST: One package manager call for all items
    - name: Install all at once (fast)
      ansible.builtin.apt:
        name: "{{ packages }}"
        state: present
```

The second approach makes a single call to the package manager with all packages, which is significantly faster.

## Tips

1. **Prefer loop over with_items**: In modern Ansible, use `loop` directly. The `items` lookup is mostly relevant for understanding legacy playbooks or when you need its flattening behavior.

2. **Flattening depth**: The `items` lookup only flattens one level. For deeper nesting, use the `flatten` filter with a specific depth or no arguments for full flattening.

3. **Package lists**: When installing packages, pass the full list to the `name` parameter instead of looping. It is much faster.

4. **Empty lists**: Looping over an empty list simply skips the task. No error is raised.

5. **String gotcha**: If you accidentally pass a string instead of a list to `loop`, it will iterate over each character. Always ensure your loop target is actually a list.

The `items` lookup is Ansible's simplest iteration tool. While modern Ansible favors the `loop` keyword with filters, understanding `items` is important because it is the foundation that all other loop constructs build upon, and you will encounter it in countless existing playbooks.
