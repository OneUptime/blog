# How to Use Ansible loop with query and lookup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Lookups, Data Sources

Description: Learn the differences between query and lookup in Ansible loops and how to use lookup plugins to feed dynamic data into your iteration logic.

---

Ansible lookup plugins pull data from external sources like files, environment variables, password stores, APIs, and more. When you combine lookups with `loop`, you can iterate over dynamically fetched data rather than static lists. The `query` and `lookup` functions are the two ways to call these plugins, and understanding their differences is important for writing correct playbooks.

## lookup vs query: The Key Difference

The main difference is what they return:

- `lookup()` returns a string (comma-separated by default)
- `query()` returns a list

Since `loop` expects a list, `query` is the natural fit:

```yaml
# Using query (returns a list - works directly with loop)
- name: Process files with query
  ansible.builtin.debug:
    msg: "{{ item }}"
  loop: "{{ query('fileglob', 'files/*.conf') }}"

# Using lookup with wantlist (converts string to list for loop compatibility)
- name: Process files with lookup
  ansible.builtin.debug:
    msg: "{{ item }}"
  loop: "{{ lookup('fileglob', 'files/*.conf', wantlist=True) }}"
```

Both produce the same result, but `query` is cleaner because you do not need the `wantlist=True` parameter. For new playbooks, prefer `query` when using the result in a `loop`.

## Common Lookup Plugins for Loops

### fileglob - Find Files

```yaml
# Find all YAML files in a directory on the control node
- name: Deploy config files
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: "/etc/myapp/{{ item | basename }}"
  loop: "{{ query('fileglob', 'files/configs/*.yml') }}"
  loop_control:
    label: "{{ item | basename }}"
```

### lines - Read File Lines

```yaml
# Read lines from a file and iterate over them
- name: Add hosts from a file
  ansible.builtin.lineinfile:
    path: /etc/hosts
    line: "{{ item }}"
    state: present
  loop: "{{ query('lines', 'cat files/extra_hosts.txt') }}"
```

The `lines` lookup executes a command and returns each line of output as a list element.

### env - Environment Variables

```yaml
# Get a colon-separated path and iterate over each directory
- name: Check PATH directories exist
  ansible.builtin.stat:
    path: "{{ item }}"
  loop: "{{ lookup('env', 'PATH').split(':') }}"
  register: path_checks
```

### sequence - Number Ranges

```yaml
# Generate a sequence of numbers
- name: Create numbered resources
  ansible.builtin.debug:
    msg: "Resource {{ item }}"
  loop: "{{ query('sequence', 'start=1 end=5 format=%d') }}"
```

### inventory_hostnames - Host Patterns

```yaml
# Get hostnames matching a pattern
- name: Show all web servers
  ansible.builtin.debug:
    msg: "Web server: {{ item }}"
  loop: "{{ query('inventory_hostnames', 'webservers') }}"
```

### dict - Dictionary Iteration

```yaml
# Iterate over a dictionary using the dict lookup
- name: Set environment variables
  ansible.builtin.lineinfile:
    path: /etc/environment
    regexp: "^{{ item.key }}="
    line: "{{ item.key }}={{ item.value }}"
  loop: "{{ query('dict', env_vars) }}"
  vars:
    env_vars:
      LANG: en_US.UTF-8
      LC_ALL: en_US.UTF-8
      EDITOR: vim
```

## Using lookup for Single Values in Loops

While `query` is better for loops, `lookup` is useful when you need to generate a single value to use in constructing a loop:

```yaml
# Use lookup to build a loop list from multiple sources
- name: Build comprehensive package list
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop: >-
    {{
      query('fileglob', 'files/packages/*.list')
      | map('lookup', 'file')
      | map('split', '\n')
      | flatten
      | select
      | list
    }}
```

This finds all `.list` files, reads their contents, splits by newlines, flattens into a single list, filters out empty strings, and loops over the result.

## The pipe Lookup

The `pipe` lookup executes a command and returns its output:

```yaml
# Get container IDs from Docker and iterate over them
- name: Inspect running containers
  ansible.builtin.command: "docker inspect {{ item }}"
  loop: "{{ query('pipe', 'docker ps -q') | split('\n') | select | list }}"
  register: container_info
  changed_when: false
```

Note that `pipe` returns a single string, so you need to split it into a list yourself.

## Combining Multiple Lookups

You can combine results from multiple lookups:

```yaml
# Deploy configs from multiple locations
- name: Deploy all configuration files
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: "/etc/myapp/conf.d/{{ item | basename }}"
  loop: >-
    {{
      query('fileglob', 'files/base-configs/*.conf') +
      query('fileglob', 'files/env-configs/' + environment + '/*.conf') +
      query('fileglob', 'files/host-configs/' + inventory_hostname + '/*.conf')
    }}
  loop_control:
    label: "{{ item | basename }}"
```

This merges files from three directories: base configs, environment-specific configs, and host-specific configs.

## Error Handling with Lookups

Lookups can fail. Handle errors gracefully:

```yaml
# Handle lookup failures gracefully
- name: Read optional config files
  ansible.builtin.set_fact:
    extra_packages: "{{ query('fileglob', 'files/optional-packages/*.list') }}"

- name: Deploy optional packages if files exist
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: "/etc/apt/sources.list.d/{{ item | basename }}"
  loop: "{{ extra_packages }}"
  when: extra_packages | length > 0
  loop_control:
    label: "{{ item | basename }}"
```

If no files match the glob, `query` returns an empty list and the task is cleanly skipped.

## Using Lookup with Ansible Vault

```yaml
# Read encrypted values from vault for each service
- name: Configure service secrets
  ansible.builtin.template:
    src: "{{ item.name }}-secrets.j2"
    dest: "/etc/{{ item.name }}/secrets.conf"
    mode: '0600'
  loop:
    - { name: "api", vault_key: "api_secrets" }
    - { name: "worker", vault_key: "worker_secrets" }
    - { name: "scheduler", vault_key: "scheduler_secrets" }
  loop_control:
    label: "{{ item.name }}"
```

## first_found Lookup for Fallback Patterns

The `first_found` lookup is great for finding the first matching file from a list of candidates:

```yaml
# Load the most specific variable file available
- name: Load variables with fallback
  ansible.builtin.include_vars: "{{ item }}"
  loop:
    - "{{ query('first_found', params) }}"
  vars:
    params:
      files:
        - "{{ ansible_distribution }}-{{ ansible_distribution_version }}.yml"
        - "{{ ansible_distribution }}.yml"
        - "{{ ansible_os_family }}.yml"
        - "default.yml"
      paths:
        - vars
```

## Practical Example: Dynamic Infrastructure Setup

Here is a complete playbook that uses various lookups with loops:

```yaml
# Dynamic infrastructure setup using multiple lookup types
- name: Infrastructure provisioning
  hosts: all
  become: yes
  vars:
    app_name: mywebapp
    environment: production

  tasks:
    - name: Deploy SSL certificates found in the certs directory
      ansible.builtin.copy:
        src: "{{ item }}"
        dest: "/etc/ssl/private/{{ item | basename }}"
        owner: root
        group: ssl-cert
        mode: '0640'
      loop: "{{ query('fileglob', 'files/certs/' + environment + '/*.pem') }}"
      loop_control:
        label: "{{ item | basename }}"

    - name: Deploy configuration templates
      ansible.builtin.template:
        src: "{{ item }}"
        dest: "/etc/{{ app_name }}/{{ item | basename | regex_replace('\\.j2$', '') }}"
        owner: "{{ app_name }}"
        mode: '0640'
      loop: "{{ query('fileglob', 'templates/' + app_name + '/*.j2') }}"
      loop_control:
        label: "{{ item | basename }}"
      notify: restart application

    - name: Create cron jobs from definitions
      ansible.builtin.cron:
        name: "{{ item.key }}"
        minute: "{{ item.value.minute | default('*') }}"
        hour: "{{ item.value.hour | default('*') }}"
        job: "{{ item.value.command }}"
        user: "{{ item.value.user | default('root') }}"
      loop: "{{ query('dict', cron_definitions) }}"
      loop_control:
        label: "{{ item.key }}"
      vars:
        cron_definitions:
          backup:
            minute: "0"
            hour: "3"
            command: "/opt/scripts/backup.sh"
            user: backup
          log_rotation:
            minute: "30"
            hour: "2"
            command: "/usr/sbin/logrotate /etc/logrotate.conf"
          health_check:
            minute: "*/5"
            command: "/opt/scripts/health-check.sh"

    - name: Configure access for all web servers
      ansible.builtin.lineinfile:
        path: "/etc/{{ app_name }}/allowed_origins.conf"
        line: "{{ item }}"
        create: yes
      loop: "{{ query('inventory_hostnames', 'webservers') }}"

  handlers:
    - name: restart application
      ansible.builtin.systemd:
        name: "{{ app_name }}"
        state: restarted
```

## Performance Considerations

Lookups run on the control node, not on target hosts. This means:

- `fileglob` searches the control node's filesystem
- `pipe` executes commands on the control node
- Network lookups (like URL) make requests from the control node

For large result sets, lookups can be slow. Cache results in `set_fact` if you need the same lookup data in multiple tasks:

```yaml
# Cache lookup results to avoid repeated execution
- name: Cache file list
  ansible.builtin.set_fact:
    config_files: "{{ query('fileglob', 'files/configs/**/*.conf') }}"

- name: Use cached list in multiple tasks
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: "/etc/myapp/{{ item | basename }}"
  loop: "{{ config_files }}"

- name: Verify deployed configs
  ansible.builtin.stat:
    path: "/etc/myapp/{{ item | basename }}"
  loop: "{{ config_files }}"
```

## Summary

The `query` function is the preferred way to feed lookup plugin results into `loop` because it returns a list directly. Use `lookup` when you need a string result or when working outside of a loop context. Lookup plugins like `fileglob`, `lines`, `pipe`, `dict`, `inventory_hostnames`, and `sequence` provide dynamic data sources for your loops. Combine multiple lookups with list concatenation, filter results with Jinja2 filters, and cache results in `set_fact` when the same data is needed across multiple tasks.
