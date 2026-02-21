# How to Use Lookup Plugins with wantlist Parameter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Playbook Development, Data Types

Description: Master the wantlist parameter in Ansible lookup plugins to control return types and avoid common pitfalls with string vs list results.

---

The `wantlist` parameter is one of those small Ansible features that solves a very specific but annoying problem. When you use `lookup()`, the result comes back as a comma-separated string. If you need a list instead, you have two options: use `query()` (which always returns a list) or pass `wantlist=True` to `lookup()`. Understanding `wantlist` is important because you will encounter it in existing codebases, and there are situations where it is the right tool for the job.

## The Problem wantlist Solves

By default, the `lookup()` function joins all results with a comma and returns a string. This works fine when you only need a single value, but it causes issues when you need to iterate or perform list operations.

```yaml
# Demonstrating the problem: lookup returns a string, not a list
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Without wantlist - returns a string
      set_fact:
        file_list_str: "{{ lookup('fileglob', 'configs/*.yml') }}"

    - name: Check the type
      debug:
        msg: "Type is {{ file_list_str | type_debug }}, value is {{ file_list_str }}"
      # Output: Type is AnsibleUnsafeText, value is configs/a.yml,configs/b.yml,configs/c.yml
```

If you try to loop over this string, Ansible will iterate over each character, not each file path. That is almost never what you want.

## Using wantlist=True

Adding `wantlist=True` tells the `lookup()` function to return the raw list from the plugin instead of joining it into a string.

```yaml
# Using wantlist=True to get a proper list from lookup
- hosts: localhost
  gather_facts: false
  tasks:
    - name: With wantlist - returns a list
      set_fact:
        file_list: "{{ lookup('fileglob', 'configs/*.yml', wantlist=True) }}"

    - name: Check the type
      debug:
        msg: "Type is {{ file_list | type_debug }}, value is {{ file_list }}"
      # Output: Type is list, value is ['configs/a.yml', 'configs/b.yml', 'configs/c.yml']

    - name: Now looping works correctly
      debug:
        msg: "File: {{ item }}"
      loop: "{{ file_list }}"
```

## wantlist with Different Lookup Plugins

The behavior of `wantlist` is consistent across all lookup plugins. Here are examples with several common ones:

```yaml
# wantlist behavior across different lookup plugins
- hosts: localhost
  gather_facts: false
  vars:
    my_dict:
      name: webserver
      port: 8080
      env: production

  tasks:
    # dict lookup: each key-value pair becomes a list item
    - name: Dict lookup without wantlist
      debug:
        msg: "{{ lookup('dict', my_dict) }}"
      # Returns: "{'key': 'name', 'value': 'webserver'},...

    - name: Dict lookup with wantlist
      debug:
        msg: "{{ lookup('dict', my_dict, wantlist=True) }}"
      # Returns: [{'key': 'name', 'value': 'webserver'}, ...]

    # sequence lookup
    - name: Sequence without wantlist
      debug:
        msg: "{{ lookup('sequence', 'start=1 end=5') }}"
      # Returns: "1,2,3,4,5"

    - name: Sequence with wantlist
      debug:
        msg: "{{ lookup('sequence', 'start=1 end=5', wantlist=True) }}"
      # Returns: ["1", "2", "3", "4", "5"]

    # lines lookup: each line becomes a list item
    - name: Lines without wantlist
      debug:
        msg: "{{ lookup('lines', 'cat /etc/hosts') }}"
      # Returns all lines joined by comma

    - name: Lines with wantlist
      debug:
        msg: "{{ lookup('lines', 'cat /etc/hosts', wantlist=True) }}"
      # Returns a list of lines
```

## Real-World Use Cases

### Iterating Over Configuration Files

When you need to load and merge multiple configuration files, `wantlist` ensures you get a proper list to loop over.

```yaml
# Loading multiple YAML config files and merging them
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Find all config fragments
      set_fact:
        config_files: "{{ lookup('fileglob', 'config.d/*.yml', wantlist=True) | sort }}"

    - name: Load each config fragment
      set_fact:
        merged_config: "{{ merged_config | default({}) | combine(lookup('file', item) | from_yaml) }}"
      loop: "{{ config_files }}"

    - name: Show merged configuration
      debug:
        var: merged_config
```

### Processing Inventory Groups

```yaml
# Getting hosts from multiple groups as a proper list
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Get all web and app server hostnames
      set_fact:
        target_hosts: >-
          {{ lookup('inventory_hostnames', 'webservers:appservers', wantlist=True) }}

    - name: Show count of target hosts
      debug:
        msg: "Will deploy to {{ target_hosts | length }} hosts"

    - name: Process each host
      debug:
        msg: "Deploying to {{ item }}"
      loop: "{{ target_hosts }}"
```

### Building Dynamic Variables from Templates

```yaml
# Using wantlist with template lookup to generate multiple values
- hosts: localhost
  gather_facts: false
  vars:
    services:
      - name: nginx
        port: 80
      - name: api
        port: 3000
      - name: worker
        port: 5672

  tasks:
    - name: Generate systemd unit names
      set_fact:
        unit_names: "{{ lookup('template', 'unit_name.j2', wantlist=True) }}"
      vars:
        service_list: "{{ services }}"

    - name: Show generated unit names
      debug:
        msg: "{{ unit_names }}"
```

## wantlist vs query: Which to Use

Since `query()` was introduced (Ansible 2.5+), it has become the preferred way to get list results from lookup plugins. However, there are specific situations where `wantlist=True` with `lookup()` is still useful.

```yaml
# Comparing the three approaches
- hosts: localhost
  gather_facts: false
  tasks:
    # Approach 1: lookup with wantlist (verbose but explicit)
    - name: Using lookup with wantlist
      set_fact:
        result1: "{{ lookup('fileglob', '*.yml', wantlist=True) }}"

    # Approach 2: query (cleaner, modern)
    - name: Using query
      set_fact:
        result2: "{{ query('fileglob', '*.yml') }}"

    # Approach 3: q shorthand (shortest)
    - name: Using q shorthand
      set_fact:
        result3: "{{ q('fileglob', '*.yml') }}"

    # All three produce identical results
```

Use `wantlist=True` when:
- You are maintaining older playbooks that already use `lookup()` throughout
- You want to be explicit about the list conversion for readability
- You are mixing lookup calls where some need strings and others need lists

Use `query()` when:
- Writing new playbooks from scratch
- You always want list results
- You prefer shorter syntax

## Combining wantlist with Other Parameters

The `wantlist` parameter works alongside other lookup parameters without any conflicts:

```yaml
# wantlist works alongside other lookup-specific parameters
- hosts: localhost
  gather_facts: false
  tasks:
    # Combining wantlist with errors parameter
    - name: Get files with error handling as a list
      set_fact:
        safe_files: "{{ lookup('fileglob', '/maybe/missing/*.conf', errors='ignore', wantlist=True) }}"

    - name: Process files if any were found
      debug:
        msg: "Found file: {{ item }}"
      loop: "{{ safe_files }}"
      when: safe_files | length > 0
```

## Edge Cases to Watch For

### Single Item Results

When a lookup returns only one item, `wantlist=True` still wraps it in a list. This is actually the desired behavior because it makes your code consistent regardless of how many results come back.

```yaml
# Single item with wantlist still returns a list
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Single env var with wantlist
      debug:
        msg: "{{ lookup('env', 'HOME', wantlist=True) }}"
      # Returns: ["/home/user"] (a list with one element)

    - name: Single file with wantlist
      debug:
        msg: "{{ lookup('file', '/etc/hostname', wantlist=True) }}"
      # Returns: ["myserver"] (a list with one element)
```

### Empty Results

When no results are found, `wantlist=True` returns an empty list, not an empty string. This makes boolean checks work as expected.

```yaml
# Empty result behavior
- hosts: localhost
  gather_facts: false
  tasks:
    - name: No matches without wantlist
      set_fact:
        empty_str: "{{ lookup('fileglob', 'nonexistent/*') }}"
      # empty_str is "" (empty string)

    - name: No matches with wantlist
      set_fact:
        empty_list: "{{ lookup('fileglob', 'nonexistent/*', wantlist=True) }}"
      # empty_list is [] (empty list)

    # Empty string is truthy in some Jinja2 contexts, empty list is not
    - name: Reliable emptiness check
      debug:
        msg: "No files found"
      when: empty_list | length == 0
```

## Summary

The `wantlist` parameter bridges the gap between the string-returning behavior of `lookup()` and the list-returning behavior of `query()`. Use `wantlist=True` when you need your `lookup()` call to return a list for iteration, length checks, or list-specific filter operations. For new code, prefer `query()` since it always returns a list by default. But knowing how `wantlist` works is essential for reading and maintaining existing Ansible codebases where it appears frequently.
