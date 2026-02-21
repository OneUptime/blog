# How to Use Ansible Conditionals with Boolean Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Conditionals, Boolean, YAML

Description: Learn how to correctly handle boolean values in Ansible conditionals, including YAML boolean types, string booleans, and the bool filter.

---

Boolean values in Ansible are deceptively tricky. YAML has native boolean types, but variables can also arrive as strings from inventories, extra vars, or environment variables. The string "true" and the YAML boolean `true` look the same in your playbook but behave differently in conditionals. Getting this wrong leads to tasks that always run or always skip, regardless of what you intended. Let me walk through how boolean handling actually works in Ansible and how to write reliable conditionals around them.

## YAML Native Booleans

YAML recognizes several values as boolean. All of these are parsed as `true` by the YAML parser: `true`, `True`, `TRUE`, `yes`, `Yes`, `YES`, `on`, `On`, `ON`. And these as `false`: `false`, `False`, `FALSE`, `no`, `No`, `NO`, `off`, `Off`, `OFF`.

```yaml
# YAML native boolean values
---
- name: Boolean basics
  hosts: localhost
  gather_facts: false

  vars:
    # All of these are YAML true
    flag_true: true
    flag_yes: yes
    flag_on: on

    # All of these are YAML false
    flag_false: false
    flag_no: no
    flag_off: off

  tasks:
    - name: Check true flags
      ansible.builtin.debug:
        msg: "{{ item.name }} is {{ item.value }} (type: {{ item.value | type_debug }})"
      loop:
        - { name: "true", value: "{{ flag_true }}" }
        - { name: "yes", value: "{{ flag_yes }}" }
        - { name: "on", value: "{{ flag_on }}" }

    - name: Simple boolean conditional
      ansible.builtin.debug:
        msg: "This runs because flag_true is true"
      when: flag_true
```

## The String Boolean Problem

Here is where things get confusing. When you pass variables via `-e` on the command line, through inventories, or from some lookups, they arrive as strings rather than native booleans.

```yaml
# The string boolean problem
---
- name: String vs native boolean
  hosts: localhost
  gather_facts: false

  vars:
    native_bool: true          # This is a YAML boolean
    string_bool: "true"        # This is a string that says "true"
    number_bool: 1             # This is an integer

  tasks:
    # This works fine with a native boolean
    - name: Native boolean check
      ansible.builtin.debug:
        msg: "Native boolean works as expected"
      when: native_bool

    # CAUTION: A non-empty string is always truthy
    - name: String "true" is truthy
      ansible.builtin.debug:
        msg: "This ALWAYS runs for any non-empty string"
      when: string_bool
      # Even "false" as a string would be truthy here!

    # This is the gotcha - the string "false" is truthy because it is a non-empty string
    - name: Demonstrate the gotcha
      ansible.builtin.debug:
        msg: "The string 'false' is truthy!"
      vars:
        misleading_var: "false"
      when: misleading_var
      # This WILL run because "false" is a non-empty string
```

## The bool Filter

The `bool` filter converts string representations of booleans into actual boolean values. This is the fix for the string boolean problem.

```yaml
# Using the bool filter for safe boolean conversion
---
- name: Safe boolean handling
  hosts: localhost
  gather_facts: false

  vars:
    enable_feature: "true"     # String from extra vars or inventory
    disable_cache: "false"     # String from extra vars or inventory
    use_ssl: "yes"             # Another boolean-like string

  tasks:
    - name: Use bool filter for string-to-boolean conversion
      ansible.builtin.debug:
        msg: "Feature is enabled"
      when: enable_feature | bool

    - name: Check disabled flag correctly
      ansible.builtin.debug:
        msg: "Cache is disabled"
      when: not (disable_cache | bool)

    - name: Bool filter handles yes/no strings
      ansible.builtin.debug:
        msg: "SSL is enabled"
      when: use_ssl | bool

    - name: Demonstrate what bool converts
      ansible.builtin.debug:
        msg: >
          "true" -> {{ "true" | bool }},
          "false" -> {{ "false" | bool }},
          "yes" -> {{ "yes" | bool }},
          "no" -> {{ "no" | bool }},
          "1" -> {{ "1" | bool }},
          "0" -> {{ "0" | bool }}
```

## Best Practice: Always Use the bool Filter

My rule of thumb is to always apply the `bool` filter to variables that might be booleans, especially when the source is uncertain. It is safe to apply `bool` to an already-boolean value (it just passes through), so there is no downside.

```yaml
# Best practice pattern for boolean variables
---
- name: Robust boolean handling
  hosts: all
  become: true

  vars:
    enable_monitoring: true
    enable_backups: "yes"
    enable_logging: "1"
    debug_mode: false

  tasks:
    - name: Configure monitoring
      ansible.builtin.template:
        src: monitoring.conf.j2
        dest: /etc/monitoring/agent.conf
      when: enable_monitoring | bool

    - name: Configure backups
      ansible.builtin.template:
        src: backup.conf.j2
        dest: /etc/backup/config.yml
      when: enable_backups | bool

    - name: Enable debug logging
      ansible.builtin.lineinfile:
        path: /etc/app/app.conf
        regexp: '^LOG_LEVEL='
        line: "LOG_LEVEL=DEBUG"
      when: debug_mode | bool

    - name: Set normal logging
      ansible.builtin.lineinfile:
        path: /etc/app/app.conf
        regexp: '^LOG_LEVEL='
        line: "LOG_LEVEL=INFO"
      when: not (debug_mode | bool)
```

## Boolean Variables from Extra Vars

When passing boolean values via `ansible-playbook -e`, the behavior depends on how you format the value.

```bash
# Different ways to pass boolean extra vars
# These pass a native boolean (correct):
ansible-playbook site.yml -e '{"enable_debug": true}'
ansible-playbook site.yml -e @vars.json

# These pass a STRING (be careful):
ansible-playbook site.yml -e "enable_debug=true"
ansible-playbook site.yml -e "enable_debug=yes"
```

```yaml
# Handle extra vars safely
---
- name: Handle extra vars booleans
  hosts: all
  gather_facts: false

  tasks:
    - name: Task that handles both string and native booleans
      ansible.builtin.debug:
        msg: "Debug mode is ON"
      when: (enable_debug | default(false)) | bool

    - name: Inverse check with default
      ansible.builtin.debug:
        msg: "Debug mode is OFF"
      when: not ((enable_debug | default(false)) | bool)
```

The `default(false)` handles the case where the variable is not defined at all, and the `bool` filter handles the case where it is a string.

## Boolean Logic with Multiple Conditions

Combining boolean variables with `and`, `or`, and `not` follows standard logic, but the `bool` filter needs to be applied to each variable individually.

```yaml
# Complex boolean logic
---
- name: Multi-boolean conditions
  hosts: all
  become: true

  vars:
    is_production: true
    enable_ssl: "yes"
    maintenance_mode: false
    feature_flag_v2: "true"

  tasks:
    - name: Full deployment (production + not maintenance + v2 enabled)
      ansible.builtin.debug:
        msg: "Running full v2 deployment"
      when:
        - is_production | bool
        - not (maintenance_mode | bool)
        - feature_flag_v2 | bool

    - name: Maintenance page
      ansible.builtin.debug:
        msg: "Showing maintenance page"
      when: maintenance_mode | bool

    - name: SSL configuration
      ansible.builtin.debug:
        msg: "Configuring SSL"
      when:
        - enable_ssl | bool
        - is_production | bool
```

## Ternary Operator for Boolean-Based Values

The `ternary` filter is useful for setting values based on boolean conditions.

```yaml
# Ternary operator with booleans
---
- name: Ternary for config values
  hosts: all
  become: true

  vars:
    debug_mode: false
    use_ssl: true

  tasks:
    - name: Set log level based on debug flag
      ansible.builtin.lineinfile:
        path: /etc/app/config.ini
        regexp: '^log_level='
        line: "log_level={{ (debug_mode | bool) | ternary('DEBUG', 'INFO') }}"

    - name: Set protocol based on SSL flag
      ansible.builtin.lineinfile:
        path: /etc/app/config.ini
        regexp: '^protocol='
        line: "protocol={{ (use_ssl | bool) | ternary('https', 'http') }}"

    - name: Set port based on SSL flag
      ansible.builtin.lineinfile:
        path: /etc/app/config.ini
        regexp: '^port='
        line: "port={{ (use_ssl | bool) | ternary('443', '80') }}"
```

## Boolean Variables in Templates

When using boolean variables in Jinja2 templates, the same gotchas apply. Always use the `bool` filter in template conditionals.

```yaml
# Template with boolean handling
---
- name: Template with booleans
  hosts: all
  become: true

  vars:
    features:
      auth_enabled: true
      cache_enabled: "yes"
      debug_enabled: "false"

  tasks:
    - name: Deploy application config
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/app/app.conf
```

The corresponding template would use the `bool` filter:

```jinja2
# app.conf.j2 - Application configuration
# Generated by Ansible

[features]
{% if features.auth_enabled | bool %}
authentication = enabled
auth_backend = ldap
{% else %}
authentication = disabled
{% endif %}

{% if features.cache_enabled | bool %}
cache = redis
cache_ttl = 3600
{% endif %}

{% if features.debug_enabled | bool %}
debug = true
log_level = DEBUG
{% else %}
debug = false
log_level = INFO
{% endif %}
```

## Testing for Boolean Type

Sometimes you need to know if a variable is actually a boolean type versus a string that looks like one.

```yaml
# Check variable types
---
- name: Type checking for booleans
  hosts: localhost
  gather_facts: false

  vars:
    native_bool: true
    string_bool: "true"
    int_bool: 1

  tasks:
    - name: Show types
      ansible.builtin.debug:
        msg: |
          native_bool type: {{ native_bool | type_debug }}
          string_bool type: {{ string_bool | type_debug }}
          int_bool type: {{ int_bool | type_debug }}

    - name: Check if variable is a native boolean
      ansible.builtin.debug:
        msg: "{{ item.name }} is a native boolean"
      loop:
        - { name: "native_bool", value: "{{ native_bool }}" }
        - { name: "string_bool", value: "{{ string_bool }}" }
        - { name: "int_bool", value: "{{ int_bool }}" }
      when: item.value | type_debug == 'bool'
```

Boolean handling in Ansible requires attention to detail. The key takeaway is: always use the `bool` filter when there is any chance your variable might be a string instead of a native boolean. It costs nothing when the variable is already boolean, and it prevents subtle bugs when it is not. Make this a habit and you will avoid an entire category of hard-to-debug conditional issues.
