# How to Debug Ansible Variable Undefined Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Debugging, Troubleshooting

Description: Learn how to systematically track down and fix undefined variable errors in Ansible playbooks with practical debugging strategies.

---

"'my_variable' is undefined" is probably the single most common Ansible error message. It seems straightforward, but the tricky part is figuring out where the variable was supposed to come from and why it is missing. Variables in Ansible can originate from a dozen different sources, and the precedence rules are complex. This post provides a systematic approach to finding and fixing undefined variable errors.

## Understanding Where Variables Come From

Before debugging, you need to know the possible sources. Ansible loads variables from these locations (in rough order of precedence, low to high):

1. Role defaults (`roles/myrole/defaults/main.yml`)
2. Inventory file or script variables
3. Inventory `group_vars/`
4. Inventory `host_vars/`
5. Playbook `group_vars/`
6. Playbook `host_vars/`
7. Gathered facts
8. Play `vars` section
9. Play `vars_files`
10. Play `vars_prompt`
11. Task `vars`
12. `include_vars`
13. `set_fact` / `register`
14. Role parameters
15. Extra vars (`-e` on command line)

When a variable is undefined, it means none of these sources provided it.

## Step 1: Verify the Variable Name

The most common cause of undefined variables is a typo. Check the exact spelling:

```yaml
# Common typos that cause undefined errors
vars:
  database_host: db.example.com

tasks:
  # Typo: databse_host instead of database_host
  - name: This will fail with undefined error
    ansible.builtin.debug:
      msg: "Connecting to {{ databse_host }}"
```

Use grep to check for inconsistencies:

```bash
# Search for all references to the variable across your project
grep -r "database_host" roles/ group_vars/ host_vars/ *.yml
```

## Step 2: Check Variable Scope

Variables defined in one place might not be visible in another:

```yaml
# This variable is only available to hosts in the 'dbservers' group
# group_vars/dbservers.yml
db_port: 5432

# This playbook targets 'webservers', so db_port is undefined
- name: Configure web servers
  hosts: webservers
  tasks:
    - name: This fails because db_port is not defined for webservers
      ansible.builtin.debug:
        msg: "DB port: {{ db_port }}"
```

**Debugging the scope issue:**

```yaml
# Check which groups the current host belongs to
- name: Show host groups
  ansible.builtin.debug:
    var: group_names

# Check if the variable exists in hostvars
- name: Check variable across hosts
  ansible.builtin.debug:
    msg: "{{ hostvars[item].get('db_port', 'NOT DEFINED') }}"
  loop: "{{ groups['all'] }}"
  run_once: true
```

## Step 3: Use the debug Module to Inspect State

When you hit an undefined error, add debug tasks before the failing task:

```yaml
# Add these before the failing task
- name: List all available variable names
  ansible.builtin.debug:
    msg: "{{ hostvars[inventory_hostname] | dict2items | map(attribute='key') | sort | list }}"

# Search for partial matches
- name: Search for variables containing 'db'
  ansible.builtin.debug:
    msg: "{{ hostvars[inventory_hostname] | dict2items | selectattr('key', 'search', 'db') | list }}"

# Check a specific variable with a safe default
- name: Check db_port safely
  ansible.builtin.debug:
    msg: "db_port = {{ db_port | default('UNDEFINED') }}"
```

## Step 4: Trace the Variable Loading Order

When you are not sure which file should define the variable, add tracing:

```yaml
---
- name: Debug variable loading
  hosts: webservers

  pre_tasks:
    - name: Check variable at pre_tasks phase
      ansible.builtin.debug:
        msg: "my_var at pre_tasks = {{ my_var | default('UNDEFINED') }}"

  roles:
    - role: myrole

  tasks:
    - name: Check variable at tasks phase
      ansible.builtin.debug:
        msg: "my_var at tasks = {{ my_var | default('UNDEFINED') }}"
```

## Common Causes and Fixes

### Cause 1: Missing include_vars or vars_files

```yaml
# The variable is defined in a file that is not loaded
# vars/production.yml
---
api_key: "abc123"
database_url: "postgresql://..."

# Playbook forgot to include the file
- name: Deploy application
  hosts: webservers
  # Missing: vars_files: [ "vars/{{ env }}.yml" ]
  tasks:
    - name: Fails with undefined api_key
      ansible.builtin.debug:
        msg: "{{ api_key }}"
```

**Fix:**

```yaml
- name: Deploy application
  hosts: webservers
  vars_files:
    - "vars/{{ env }}.yml"
  tasks:
    - name: Now works
      ansible.builtin.debug:
        msg: "{{ api_key }}"
```

### Cause 2: Fact Gathering Disabled

If you disabled fact gathering, Ansible facts are not available:

```yaml
- name: Configure servers
  hosts: all
  gather_facts: false  # Facts are not collected

  tasks:
    - name: This fails because ansible_os_family is not defined
      ansible.builtin.debug:
        msg: "OS Family: {{ ansible_os_family }}"
```

**Fix:**

```yaml
- name: Configure servers
  hosts: all
  gather_facts: true  # Or just remove the gather_facts line

  tasks:
    - name: Now works
      ansible.builtin.debug:
        msg: "OS Family: {{ ansible_os_family }}"
```

### Cause 3: Variable From Another Host

When you need a variable from a different host:

```yaml
# This fails because db_primary_ip is defined on db hosts, not web hosts
- name: Configure web servers
  hosts: webservers
  tasks:
    - name: Connect to database
      ansible.builtin.debug:
        msg: "DB IP: {{ db_primary_ip }}"  # Undefined on webservers
```

**Fix:**

```yaml
- name: Configure web servers
  hosts: webservers
  tasks:
    - name: Connect to database
      ansible.builtin.debug:
        msg: "DB IP: {{ hostvars[groups['dbservers'][0]]['ansible_default_ipv4']['address'] }}"
```

### Cause 4: Conditional include_vars That Did Not Match

```yaml
# Variable only loaded for Debian systems
- name: Include OS-specific vars
  ansible.builtin.include_vars:
    file: "{{ ansible_os_family }}.yml"
  # If running on an unexpected OS, the file might not exist
  # and the variables from it will be undefined
```

**Fix with fallback:**

```yaml
- name: Include OS-specific vars with fallback
  ansible.builtin.include_vars:
    file: "{{ item }}"
  with_first_found:
    - "{{ ansible_distribution }}-{{ ansible_distribution_major_version }}.yml"
    - "{{ ansible_distribution }}.yml"
    - "{{ ansible_os_family }}.yml"
    - "defaults.yml"
```

### Cause 5: Variable Set by a Skipped Task

```yaml
- name: Get version from API
  ansible.builtin.uri:
    url: "http://localhost:8080/version"
  register: version_info
  when: check_api  # If this is false, version_info is not registered

- name: Show version
  ansible.builtin.debug:
    msg: "{{ version_info.json.version }}"
  # Fails when check_api was false because version_info is undefined
```

**Fix:**

```yaml
- name: Show version
  ansible.builtin.debug:
    msg: "{{ version_info.json.version }}"
  when: version_info is defined and version_info is succeeded
```

## Using the default Filter Strategically

The `default` filter is your primary defense against undefined variable errors:

```yaml
# Simple default value
database_port: "{{ db_port | default(5432) }}"

# Default to another variable
database_host: "{{ db_host | default(ansible_default_ipv4.address) }}"

# Default with undefined check (Jinja2 'undefined' value, not just empty)
api_url: "{{ custom_api_url | default(omit) }}"
# 'omit' removes the parameter entirely if the variable is undefined

# Default for nested access
server_name: "{{ config.server.name | default('localhost') }}"
# Warning: this fails if 'config' itself is undefined

# Safe nested access
server_name: "{{ (config | default({})).get('server', {}).get('name', 'localhost') }}"
```

## Listing All Variables for a Host

When you are completely lost about what variables are available:

```bash
# Use ansible-inventory to see all variables for a host
ansible-inventory --host web-01 --yaml

# Or use a debug playbook
ansible-playbook -i inventory debug-vars.yml --limit web-01
```

With a debug playbook:

```yaml
---
- name: Show all variables
  hosts: all
  gather_facts: true

  tasks:
    - name: Print all variables
      ansible.builtin.copy:
        content: "{{ hostvars[inventory_hostname] | to_nice_yaml }}"
        dest: "/tmp/ansible-vars-{{ inventory_hostname }}.yml"
      delegate_to: localhost
```

## Using assert to Validate Required Variables

Add validation at the beginning of your playbook:

```yaml
---
- name: Deploy application
  hosts: webservers

  tasks:
    - name: Validate required variables
      ansible.builtin.assert:
        that:
          - app_name is defined
          - app_version is defined
          - database_url is defined
          - secret_key is defined
        fail_msg: |
          Missing required variables. Please ensure the following are defined:
            app_name: {{ app_name | default('MISSING') }}
            app_version: {{ app_version | default('MISSING') }}
            database_url: {{ database_url | default('MISSING') }}
            secret_key: {{ secret_key | default('MISSING') }}

    # Rest of your tasks...
```

## Summary

Undefined variable errors in Ansible are almost always caused by typos, scope issues, missing file includes, disabled fact gathering, or variables from skipped tasks. Debug systematically by checking the variable name spelling, verifying which groups the host belongs to, confirming that vars_files are loaded, and using the debug module with the `default` filter to safely inspect values. Add `assert` tasks at the beginning of critical playbooks to catch missing variables early with clear error messages.
