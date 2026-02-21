# How to Migrate from with_fileglob to loop in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Migration, File Management, Automation

Description: Learn how to migrate from the legacy with_fileglob syntax to the modern loop keyword with the fileglob lookup plugin in Ansible.

---

The `with_fileglob` keyword in Ansible matched files on the control node using glob patterns and iterated over the results. It was commonly used to copy or template multiple files from a directory without listing each one individually. The modern replacement is `loop` combined with the `lookup('fileglob', ...)` plugin or the `query('fileglob', ...)` function.

This post covers the migration, explains the differences between the old and new syntax, and shows practical patterns for file globbing in modern Ansible.

## Understanding with_fileglob

The `with_fileglob` keyword ran a glob pattern on the Ansible control machine (not the managed hosts) and iterated over matching files.

```yaml
# OLD: Copy all .conf files from a local directory to remote hosts
- name: Copy configuration files
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/myapp/
    mode: '0644'
  with_fileglob:
    - "files/configs/*.conf"
```

Important: The glob runs on the control machine where Ansible executes, not on the remote hosts.

## The Basic Migration

Replace `with_fileglob` with `loop` and the `fileglob` lookup.

Before:

```yaml
# OLD: with_fileglob
- name: Copy all config files
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/myapp/
    mode: '0644'
  with_fileglob:
    - "files/configs/*.conf"
```

After:

```yaml
# NEW: loop with fileglob lookup
- name: Copy all config files
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/myapp/
    mode: '0644'
  loop: "{{ lookup('fileglob', 'files/configs/*.conf', wantlist=True) }}"
```

The `wantlist=True` parameter tells the lookup to return a list, which is what `loop` expects.

## lookup vs query

You can also use `query` (or its alias `q`) instead of `lookup`. The `query` function always returns a list, so you do not need `wantlist=True`.

```yaml
# Using query (always returns a list)
- name: Copy config files
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/myapp/
    mode: '0644'
  loop: "{{ query('fileglob', 'files/configs/*.conf') }}"
```

The `query` approach is cleaner for use with `loop` because it removes the need for the `wantlist` parameter.

## Multiple Glob Patterns

With `with_fileglob`, you could specify multiple patterns. With `loop`, you can combine multiple lookups.

Before:

```yaml
# OLD: Multiple glob patterns
- name: Copy various config files
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/myapp/conf.d/
    mode: '0644'
  with_fileglob:
    - "files/configs/*.conf"
    - "files/overrides/*.conf"
```

After:

```yaml
# NEW: Combine multiple fileglob lookups
- name: Copy various config files
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/myapp/conf.d/
    mode: '0644'
  loop: >-
    {{
      query('fileglob', 'files/configs/*.conf')
      + query('fileglob', 'files/overrides/*.conf')
    }}
```

We concatenate two lists with the `+` operator.

## Practical Example: Template Multiple Files

A common pattern is templating all `.j2` files from a directory.

Before:

```yaml
# OLD: Template all Jinja2 files
- name: Deploy configuration templates
  ansible.builtin.template:
    src: "{{ item }}"
    dest: "/etc/myapp/{{ item | basename | regex_replace('\\.j2$', '') }}"
    mode: '0644'
  with_fileglob:
    - "templates/myapp/*.j2"
```

After:

```yaml
# NEW: Template with fileglob lookup
- name: Deploy configuration templates
  ansible.builtin.template:
    src: "{{ item }}"
    dest: "/etc/myapp/{{ item | basename | regex_replace('\\.j2$', '') }}"
    mode: '0644'
  loop: "{{ query('fileglob', 'templates/myapp/*.j2') }}"
```

The `basename` filter extracts just the filename, and `regex_replace` strips the `.j2` extension to get the destination filename.

## Handling the Path Differences

One subtle difference between `with_fileglob` and the `fileglob` lookup is how paths are resolved. With `with_fileglob`, relative paths were resolved from the role's `files/` directory (when used in a role). The `fileglob` lookup behaves the same way, but it is worth verifying after migration.

```yaml
# In a role, both resolve relative to roles/myrole/files/
# OLD:
  with_fileglob:
    - "configs/*.conf"
# Resolves to: roles/myrole/files/configs/*.conf

# NEW:
  loop: "{{ query('fileglob', 'configs/*.conf') }}"
# Resolves to: roles/myrole/files/configs/*.conf (same behavior)
```

For templates, the lookup resolves relative to the role's `templates/` directory.

## Copying Files and Preserving Structure

When you want to preserve the subdirectory structure of matched files, you need to extract the relative path.

```yaml
# copy-preserve-structure.yml
# Copies files while maintaining their directory structure
- name: Copy files preserving directory structure
  hosts: webservers
  become: true
  tasks:
    - name: Find all static files
      ansible.builtin.set_fact:
        static_files: "{{ query('fileglob', 'files/static/**/*') }}"

    - name: Copy static files
      ansible.builtin.copy:
        src: "{{ item }}"
        dest: "/var/www/{{ item | relpath('files/') }}"
        mode: '0644'
      loop: "{{ static_files }}"
```

Note: The `fileglob` lookup does NOT recurse into subdirectories by default. If you need recursive globbing, use `find` module on the control node or the `filetree` lookup.

## Recursive File Discovery

Since `fileglob` does not recurse into subdirectories, you may need an alternative for recursive patterns.

```yaml
# non-recursive-glob.yml
# fileglob only matches files in the specified directory (not subdirectories)
- name: List files in configs directory
  ansible.builtin.debug:
    msg: "{{ item }}"
  loop: "{{ query('fileglob', 'files/configs/*.conf') }}"
  # Only matches: files/configs/app.conf, files/configs/db.conf
  # Does NOT match: files/configs/subdir/other.conf
```

For recursive needs, use the `filetree` lookup or the `find` module.

```yaml
# Recursive alternative using find on the control node
- name: Find all config files recursively
  ansible.builtin.find:
    paths: "{{ playbook_dir }}/files/configs"
    patterns: "*.conf"
    recurse: true
  delegate_to: localhost
  register: found_files

- name: Copy found files
  ansible.builtin.copy:
    src: "{{ item.path }}"
    dest: "/etc/myapp/{{ item.path | basename }}"
    mode: '0644'
  loop: "{{ found_files.files }}"
```

## Sorting Globbed Files

The order of files returned by `fileglob` is not guaranteed. If order matters, sort the results.

```yaml
# Sort globbed files alphabetically
- name: Deploy config files in alphabetical order
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/myapp/conf.d/
    mode: '0644'
  loop: "{{ query('fileglob', 'files/configs/*.conf') | sort }}"
```

## Conditional File Deployment

Combine `fileglob` with filters to deploy files conditionally.

```yaml
# conditional-deploy.yml
# Only deploy files that match a naming convention
- name: Deploy only production configs
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/myapp/
    mode: '0644'
  loop: >-
    {{
      query('fileglob', 'files/configs/*.conf')
      | select('search', 'production')
      | list
    }}
```

## Registered Variables

The registered variable structure works the same way with both approaches.

```yaml
# Register results from fileglob loop
- name: Copy config files
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/myapp/
    mode: '0644'
  loop: "{{ query('fileglob', 'files/configs/*.conf') }}"
  register: copy_results

- name: Show changed files
  ansible.builtin.debug:
    msg: "Updated: {{ item.item | basename }}"
  loop: "{{ copy_results.results }}"
  when: item.changed
```

## Handling Empty Glob Results

If the glob pattern matches no files, `with_fileglob` simply skipped the task. With `loop`, you get the same behavior since looping over an empty list means zero iterations.

```yaml
# Both handle empty results the same way (task is skipped)
- name: Copy optional config files
  ansible.builtin.copy:
    src: "{{ item }}"
    dest: /etc/myapp/optional/
    mode: '0644'
  loop: "{{ query('fileglob', 'files/optional-configs/*.conf') }}"
  # If no files match, the task is skipped with no error
```

## Migration Checklist

Follow these steps for each `with_fileglob` migration:

1. Replace `with_fileglob` with `loop: "{{ query('fileglob', 'pattern') }}"`
2. If there were multiple patterns, concatenate them with `+`
3. Verify that relative paths still resolve correctly (especially in roles)
4. Add `| sort` if file order matters
5. Test with `--check --diff` to verify no behavioral changes

```bash
# Find all with_fileglob occurrences in your project
grep -rn "with_fileglob" --include="*.yml" --include="*.yaml" .
```

## Migration Quick Reference

| Old Syntax | New Syntax |
|-----------|-----------|
| `with_fileglob: "*.conf"` | `loop: "{{ query('fileglob', '*.conf') }}"` |
| `with_fileglob: ["*.conf", "*.ini"]` | `loop: "{{ query('fileglob', '*.conf') + query('fileglob', '*.ini') }}"` |
| `item` (filename) | `item` (filename) - unchanged |

## Summary

Migrating from `with_fileglob` to `loop` with `query('fileglob', ...)` is a clean replacement. The `query` function always returns a list, making it ideal for `loop`. The key things to remember are: `fileglob` runs on the control node (not remote hosts), it does not recurse into subdirectories, and the file order is not guaranteed so add `| sort` if needed. For recursive file discovery, switch to the `find` module or the `filetree` lookup. After migration, verify that relative path resolution still works correctly, especially when using roles.
