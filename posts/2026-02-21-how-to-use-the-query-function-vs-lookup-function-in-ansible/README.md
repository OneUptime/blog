# How to Use the query Function vs lookup Function in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Jinja2, Playbook Development

Description: Learn the differences between Ansible's query and lookup functions, including return types, error handling, and when to use each one.

---

Ansible provides two ways to invoke lookup plugins: the `lookup()` function and the `query()` function (also available as `q()` for short). They call the same underlying plugins, but they differ in how they return results. This distinction matters more than you might expect, and getting it wrong can cause subtle bugs that are hard to track down.

## The Basic Difference

The `lookup()` function returns a comma-separated string by default. The `query()` function always returns a list. That is the fundamental difference, and it affects how you use the returned data in loops, conditionals, and variable assignments.

```yaml
# Demonstrating the difference between lookup and query return types
- hosts: localhost
  gather_facts: false
  tasks:
    - name: lookup returns a string
      debug:
        msg: "{{ lookup('sequence', 'start=1 end=5') }}"
      # Output: "1,2,3,4,5" (a string)

    - name: query returns a list
      debug:
        msg: "{{ query('sequence', 'start=1 end=5') }}"
      # Output: ["1", "2", "3", "4", "5"] (a list)

    - name: q is a shorthand for query
      debug:
        msg: "{{ q('sequence', 'start=1 end=5') }}"
      # Output: ["1", "2", "3", "4", "5"] (same as query)
```

## Why This Matters for Loops

When you use `loop` with a lookup, you need to make sure you are passing it a list. Since `lookup()` returns a string, you would have to manually split it or use `wantlist=True`. With `query()`, you get a list automatically.

```yaml
# Using query with loop is cleaner than lookup
- hosts: localhost
  gather_facts: false
  tasks:
    # The recommended way: query returns a list, perfect for loop
    - name: Loop with query
      debug:
        msg: "Processing file {{ item }}"
      loop: "{{ query('fileglob', 'configs/*.yml') }}"

    # The old way: lookup needs wantlist=True to work with loop
    - name: Loop with lookup and wantlist
      debug:
        msg: "Processing file {{ item }}"
      loop: "{{ lookup('fileglob', 'configs/*.yml', wantlist=True) }}"

    # This would FAIL because lookup returns a single string
    # - name: Broken loop with lookup
    #   debug:
    #     msg: "{{ item }}"
    #   loop: "{{ lookup('fileglob', 'configs/*.yml') }}"
    #   # This iterates over characters in the string, not file paths!
```

## Return Type Comparison Table

Let me illustrate with different lookup plugins to show how the return types differ:

```yaml
# Comparing return types across different lookups
- hosts: localhost
  gather_facts: false
  vars:
    test_dict:
      key1: value1
      key2: value2
  tasks:
    # dict lookup comparison
    - name: lookup with dict returns a string
      debug:
        msg: "{{ lookup('dict', test_dict) }}"
      # Returns: "{'key': 'key1', 'value': 'value1'},{'key': 'key2', 'value': 'value2'}"

    - name: query with dict returns a list of dicts
      debug:
        msg: "{{ query('dict', test_dict) }}"
      # Returns: [{"key": "key1", "value": "value1"}, {"key": "key2", "value": "value2"}]

    # env lookup comparison (single value)
    - name: lookup with env
      debug:
        msg: "{{ lookup('env', 'HOME') }}"
      # Returns: "/home/user" (string, same either way)

    - name: query with env
      debug:
        msg: "{{ query('env', 'HOME') }}"
      # Returns: ["/home/user"] (list with one element)
```

## The Practical Impact on Type Checking

Since `query()` always returns a list, you can reliably check its length, iterate over it, or use list-specific filters without worrying about type coercion.

```yaml
# query makes type-safe operations straightforward
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Safely check if any config files exist
      set_fact:
        config_files: "{{ query('fileglob', 'configs/*.yml') }}"

    - name: Report the count
      debug:
        msg: "Found {{ config_files | length }} config files"

    - name: Conditionally process configs
      debug:
        msg: "First config: {{ config_files[0] }}"
      when: config_files | length > 0
```

With `lookup()`, this would be trickier because an empty result returns an empty string `""`, while `query()` returns an empty list `[]`.

```yaml
# Demonstrating the empty result difference
- hosts: localhost
  gather_facts: false
  tasks:
    - name: lookup with no matches returns empty string
      set_fact:
        result_lookup: "{{ lookup('fileglob', 'nonexistent/*.xyz') }}"
      # result_lookup is "" (empty string, but truthy check passes for string type)

    - name: query with no matches returns empty list
      set_fact:
        result_query: "{{ query('fileglob', 'nonexistent/*.xyz') }}"
      # result_query is [] (empty list, falsy)

    # This conditional is more reliable with query
    - name: Check with query result
      debug:
        msg: "No config files found"
      when: result_query | length == 0
```

## Error Handling Differences

Both `lookup()` and `query()` raise errors in the same way by default. However, the `errors` parameter works identically with both:

```yaml
# Error handling works the same for both functions
- hosts: localhost
  gather_facts: false
  tasks:
    - name: lookup with error suppression
      debug:
        msg: "{{ lookup('file', '/nonexistent/path', errors='ignore') }}"
      # Returns empty string on error

    - name: query with error suppression
      debug:
        msg: "{{ query('file', '/nonexistent/path', errors='ignore') }}"
      # Returns empty list on error

    - name: query with warn on error
      debug:
        msg: "{{ query('file', '/nonexistent/path', errors='warn') }}"
      # Returns empty list and prints a warning
```

## When to Use lookup()

There are still valid use cases for `lookup()`. When you specifically want a single string value, `lookup()` is more natural.

```yaml
# Cases where lookup makes more sense
- hosts: localhost
  gather_facts: false
  tasks:
    # Reading a single file into a string variable
    - name: Load SSH key
      set_fact:
        ssh_key: "{{ lookup('file', '~/.ssh/id_rsa.pub') }}"

    # Reading an environment variable
    - name: Get home dir
      set_fact:
        home_dir: "{{ lookup('env', 'HOME') }}"

    # Generating a password (you want a string, not a list)
    - name: Generate password
      set_fact:
        db_password: "{{ lookup('password', '/dev/null length=24') }}"

    # Using in a template string
    - name: Build connection string
      set_fact:
        conn_string: "postgres://admin:{{ lookup('password', '/dev/null length=16') }}@{{ lookup('env', 'DB_HOST') }}:5432/mydb"
```

## When to Use query()

Use `query()` whenever you expect multiple results or plan to iterate over the output.

```yaml
# Cases where query is the better choice
- hosts: localhost
  gather_facts: false
  tasks:
    # Iterating over files
    - name: Include all variable files
      include_vars:
        file: "{{ item }}"
      loop: "{{ query('fileglob', 'vars/*.yml') }}"

    # Working with inventory data
    - name: Get all hosts in a group
      debug:
        msg: "Host: {{ item }}"
      loop: "{{ query('inventory_hostnames', 'webservers') }}"

    # Processing multiple items from a sequence
    - name: Create numbered backup directories
      file:
        path: "/backups/slot-{{ item }}"
        state: directory
      loop: "{{ query('sequence', 'start=1 end=10') }}"

    # Combining with filters
    - name: Get sorted list of template files
      set_fact:
        templates: "{{ query('fileglob', 'templates/*.j2') | sort }}"
```

## Migration Strategy

If you are working with older playbooks that use `with_*` loops, the modern equivalent uses `loop` with `query()`:

```yaml
# Old style using with_fileglob
- name: Old style
  copy:
    src: "{{ item }}"
    dest: /etc/app/
  with_fileglob:
    - "configs/*.conf"

# Modern style using loop + query
- name: Modern style
  copy:
    src: "{{ item }}"
    dest: /etc/app/
  loop: "{{ query('fileglob', 'configs/*.conf') }}"
```

The `with_*` syntax internally calls the corresponding lookup plugin with `wantlist=True`, which is exactly what `query()` does. So `query()` is the direct replacement.

## Quick Reference

```yaml
# Quick reference: when to use what
# Use lookup() when:
#   - You want a single string result
#   - You are embedding the result in a larger string
#   - You are reading one file or one env variable

# Use query() when:
#   - You are using the result with loop
#   - You expect multiple results
#   - You need to check the length of results
#   - You want consistent list typing
#   - You are replacing with_* loops
```

## Summary

The `query()` function is generally the safer default choice because it always returns a list, making your playbooks more predictable. Use `lookup()` when you specifically need a single string value. When migrating from `with_*` loops to `loop`, always use `query()` (or its shorthand `q()`) rather than `lookup()` to avoid type mismatch issues. Both functions call the same underlying plugins, so the difference is purely in the return type.
