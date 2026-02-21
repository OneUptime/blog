# How to Migrate from with_dict to loop in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Migration, Dictionaries, Automation

Description: Learn how to migrate from the legacy with_dict syntax to the modern loop keyword with dict2items filter in Ansible playbooks.

---

The `with_dict` keyword in Ansible was used to iterate over dictionary (hash/map) data structures. It provided each iteration with `item.key` and `item.value` variables. Since Ansible 2.5, the recommended approach is to use `loop` combined with the `dict2items` filter. The behavior is nearly identical, but the new syntax is more consistent with the rest of the loop system.

This post covers the migration process with side-by-side examples, explains the `dict2items` filter, and shows how to handle common patterns that relied on `with_dict`.

## The Basic Migration

The fundamental change is replacing `with_dict` with `loop` plus the `dict2items` filter.

Before:

```yaml
# OLD: Iterating over a dictionary with with_dict
- name: Create user accounts
  hosts: all
  become: true
  vars:
    users:
      alice:
        uid: 1001
        shell: /bin/bash
      bob:
        uid: 1002
        shell: /bin/zsh
      charlie:
        uid: 1003
        shell: /bin/bash
  tasks:
    - name: Create users
      ansible.builtin.user:
        name: "{{ item.key }}"
        uid: "{{ item.value.uid }}"
        shell: "{{ item.value.shell }}"
      with_dict: "{{ users }}"
```

After:

```yaml
# NEW: Using loop with dict2items
- name: Create user accounts
  hosts: all
  become: true
  vars:
    users:
      alice:
        uid: 1001
        shell: /bin/bash
      bob:
        uid: 1002
        shell: /bin/zsh
      charlie:
        uid: 1003
        shell: /bin/bash
  tasks:
    - name: Create users
      ansible.builtin.user:
        name: "{{ item.key }}"
        uid: "{{ item.value.uid }}"
        shell: "{{ item.value.shell }}"
      loop: "{{ users | dict2items }}"
```

The `item.key` and `item.value` references stay exactly the same. The only change is the loop line itself.

## Understanding dict2items

The `dict2items` filter converts a dictionary into a list of dictionaries, each with `key` and `value` attributes.

```yaml
# What dict2items produces
# Input dictionary:
#   nginx:
#     port: 80
#   redis:
#     port: 6379

# After dict2items:
# - { key: "nginx", value: { port: 80 } }
# - { key: "redis", value: { port: 6379 } }
```

This is exactly the format that `with_dict` produced internally, which is why `item.key` and `item.value` work unchanged after migration.

## Simple Key-Value Dictionaries

For flat dictionaries (where values are strings or numbers, not nested), the migration is identical.

Before:

```yaml
# OLD: Setting sysctl values from a dictionary
- name: Set sysctl parameters
  ansible.posix.sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    state: present
    reload: true
  with_dict:
    net.core.somaxconn: 65535
    net.ipv4.tcp_max_syn_backlog: 65535
    vm.swappiness: 10
    fs.file-max: 2097152
```

After:

```yaml
# NEW: Using loop with dict2items
- name: Set sysctl parameters
  ansible.posix.sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    state: present
    reload: true
  loop: "{{ sysctl_params | dict2items }}"
  vars:
    sysctl_params:
      net.core.somaxconn: 65535
      net.ipv4.tcp_max_syn_backlog: 65535
      vm.swappiness: 10
      fs.file-max: 2097152
```

Note: I moved the inline dictionary to a `vars` block for cleaner syntax since `loop` does not support inline dictionaries the way `with_dict` did.

## Inline Dictionary Migration

With `with_dict`, you could write the dictionary inline right after the keyword. With `loop`, you need to define it in a variable first.

Before:

```yaml
# OLD: Inline dictionary with with_dict
- name: Set environment variables
  ansible.builtin.lineinfile:
    path: /etc/environment
    regexp: "^{{ item.key }}="
    line: "{{ item.key }}={{ item.value }}"
  with_dict:
    LANG: en_US.UTF-8
    LC_ALL: en_US.UTF-8
    EDITOR: vim
```

After:

```yaml
# NEW: Dictionary in vars, then loop with dict2items
- name: Set environment variables
  ansible.builtin.lineinfile:
    path: /etc/environment
    regexp: "^{{ item.key }}="
    line: "{{ item.key }}={{ item.value }}"
  loop: "{{ env_vars | dict2items }}"
  vars:
    env_vars:
      LANG: en_US.UTF-8
      LC_ALL: en_US.UTF-8
      EDITOR: vim
```

Using task-level `vars` keeps the definition close to where it is used, which is a reasonable approach for small dictionaries.

## Nested Dictionary Values

When dictionary values are themselves dictionaries, the migration is still straightforward since `item.value` gives you the entire nested structure.

Before:

```yaml
# OLD: with_dict with nested values
- name: Create application databases
  community.postgresql.postgresql_db:
    name: "{{ item.key }}"
    encoding: "{{ item.value.encoding }}"
    owner: "{{ item.value.owner }}"
    state: present
  with_dict: "{{ databases }}"
```

After:

```yaml
# NEW: loop with dict2items
- name: Create application databases
  community.postgresql.postgresql_db:
    name: "{{ item.key }}"
    encoding: "{{ item.value.encoding }}"
    owner: "{{ item.value.owner }}"
    state: present
  loop: "{{ databases | dict2items }}"
```

No changes to the task body at all.

## Combining dict2items with Filters

The advantage of the new syntax is that you can chain filters. With `with_dict`, you could not easily filter or transform the dictionary before iteration.

```yaml
# Filter dictionary entries before looping (not possible with with_dict)
- name: Process only databases with replication enabled
  ansible.builtin.debug:
    msg: "{{ item.key }} has replication"
  loop: >-
    {{
      databases | dict2items
      | selectattr('value.replication', 'equalto', true)
      | list
    }}
  vars:
    databases:
      primary_db:
        owner: dbadmin
        replication: true
      analytics_db:
        owner: analyst
        replication: false
      reporting_db:
        owner: reporter
        replication: true
```

This was difficult to do with `with_dict` and usually required a `when` condition on the task.

## Dictionary Variable from group_vars

A realistic example: managing virtual hosts from a dictionary in group variables.

```yaml
# group_vars/webservers.yml
virtual_hosts:
  api.example.com:
    port: 8080
    ssl: true
    root: /var/www/api
  app.example.com:
    port: 3000
    ssl: true
    root: /var/www/app
  static.example.com:
    port: 80
    ssl: false
    root: /var/www/static
```

Before:

```yaml
# OLD: with_dict
- name: Generate vhost configs
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: "/etc/nginx/sites-available/{{ item.key }}.conf"
  with_dict: "{{ virtual_hosts }}"
```

After:

```yaml
# NEW: loop with dict2items
- name: Generate vhost configs
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: "/etc/nginx/sites-available/{{ item.key }}.conf"
  loop: "{{ virtual_hosts | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
```

I added `loop_control.label` to make the output cleaner, showing just the domain name instead of the full dictionary.

## Registered Variables

The registered variable structure is the same between `with_dict` and `loop` with `dict2items`.

Before:

```yaml
# OLD: register with with_dict
- name: Check database connectivity
  ansible.builtin.command: "pg_isready -h {{ item.value.host }} -p {{ item.value.port }}"
  with_dict: "{{ databases }}"
  register: db_checks
  changed_when: false

- name: Show failed connections
  ansible.builtin.debug:
    msg: "Cannot reach {{ item.item.key }}"
  with_items: "{{ db_checks.results }}"
  when: item.rc != 0
```

After:

```yaml
# NEW: register with loop
- name: Check database connectivity
  ansible.builtin.command: "pg_isready -h {{ item.value.host }} -p {{ item.value.port }}"
  loop: "{{ databases | dict2items }}"
  register: db_checks
  changed_when: false

- name: Show failed connections
  ansible.builtin.debug:
    msg: "Cannot reach {{ item.item.key }}"
  loop: "{{ db_checks.results }}"
  when: item.rc != 0
```

## Migration Checklist

Here is a step-by-step process for migrating each `with_dict` usage:

1. Find the `with_dict` line
2. Identify if the dictionary is inline or a variable
3. If inline, move it to a `vars` block
4. Replace `with_dict: "{{ dict_var }}"` with `loop: "{{ dict_var | dict2items }}"`
5. Verify that `item.key` and `item.value` references in the task body remain correct (they should be fine)
6. Optionally add `loop_control.label` for cleaner output
7. Run the playbook in check mode to verify

```bash
# Find all with_dict occurrences
grep -rn "with_dict" --include="*.yml" --include="*.yaml" .

# Test the migrated playbook
ansible-playbook site.yml --check --diff
```

## Sorting Dictionary Items

With `loop` and `dict2items`, you can sort dictionary entries, which was not directly possible with `with_dict`.

```yaml
# Sort by key name before processing
- name: Process configs in alphabetical order
  ansible.builtin.template:
    src: "{{ item.key }}.conf.j2"
    dest: "/etc/myapp/{{ item.key }}.conf"
  loop: "{{ configs | dict2items | sort(attribute='key') }}"
```

## Summary

Migrating from `with_dict` to `loop` with `dict2items` is one of the simplest Ansible loop migrations. The `item.key` and `item.value` variable structure remains identical, so your task bodies do not change at all. The main adjustment is moving inline dictionaries to `vars` blocks and adding `| dict2items` to your loop expression. The benefit you get in return is the ability to chain filters for sorting, filtering, and transforming your dictionary data before the loop processes it.
