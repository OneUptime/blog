# How to Debug Variable Values with type_debug Filter in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, type_debug, Jinja2 Filters, Troubleshooting

Description: Learn how to use the Ansible type_debug filter to inspect variable types and resolve common type-related issues in playbooks.

---

Some of the most frustrating Ansible bugs happen when a variable looks correct in the debug output but behaves unexpectedly in conditionals or filters. The value `"3"` and `3` look the same in a debug message, but one is a string and the other is an integer, and they behave very differently in comparisons. The `type_debug` filter reveals the actual Python type of any variable, making these invisible problems visible.

## Basic type_debug Usage

The `type_debug` filter returns a string representing the Python type name of the value:

```yaml
# type-debug-basic.yml - Inspect variable types
---
- name: Show variable types
  hosts: localhost
  gather_facts: false
  vars:
    my_string: "hello"
    my_int: 42
    my_float: 3.14
    my_bool: true
    my_list:
      - one
      - two
    my_dict:
      key: value
    my_null: null
  tasks:
    - name: Display type of each variable
      ansible.builtin.debug:
        msg:
          - "my_string: {{ my_string | type_debug }}"    # AnsibleUnicode
          - "my_int: {{ my_int | type_debug }}"          # int
          - "my_float: {{ my_float | type_debug }}"      # float
          - "my_bool: {{ my_bool | type_debug }}"        # bool
          - "my_list: {{ my_list | type_debug }}"        # list
          - "my_dict: {{ my_dict | type_debug }}"        # dict
          - "my_null: {{ my_null | type_debug }}"        # NoneType
```

## Why Types Matter in Ansible

Here is a scenario that bites people regularly. You pass a port number as an extra var and wonder why your comparison fails:

```yaml
# type-mismatch.yml - Demonstrating type-related bugs
---
- name: Type mismatch demonstration
  hosts: localhost
  gather_facts: false
  vars:
    expected_port: 8080
  tasks:
    # Simulating a variable passed via -e on the command line
    - name: Set port from extra var (comes in as string)
      ansible.builtin.set_fact:
        actual_port: "8080"  # String, not integer

    - name: Check types
      ansible.builtin.debug:
        msg:
          - "expected_port type: {{ expected_port | type_debug }}"  # int
          - "actual_port type: {{ actual_port | type_debug }}"      # AnsibleUnicode
          - "Are they equal? {{ expected_port == actual_port }}"    # false!

    - name: Fix with int filter
      ansible.builtin.debug:
        msg:
          - "After casting: {{ expected_port == (actual_port | int) }}"  # true
```

## Common Type Surprises

### Registered Variables

The output of `register` always wraps results in a dictionary, but the sub-fields have their own types:

```yaml
# register-types.yml - Inspect registered variable types
---
- name: Check registered variable types
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Run a command
      ansible.builtin.command:
        cmd: echo 42
      register: cmd_result
      changed_when: false

    - name: Inspect the registered result
      ansible.builtin.debug:
        msg:
          - "cmd_result type: {{ cmd_result | type_debug }}"            # dict
          - "stdout type: {{ cmd_result.stdout | type_debug }}"         # AnsibleUnicode
          - "rc type: {{ cmd_result.rc | type_debug }}"                 # int
          - "changed type: {{ cmd_result.changed | type_debug }}"       # bool
          - "stdout_lines type: {{ cmd_result.stdout_lines | type_debug }}" # list

    # This comparison would fail without casting
    - name: Compare stdout to an integer
      ansible.builtin.debug:
        msg: "stdout as int equals 42: {{ cmd_result.stdout | int == 42 }}"
```

### YAML Parsing Surprises

YAML's type coercion can produce unexpected types:

```yaml
# yaml-type-surprises.yml - YAML type coercion
---
- name: YAML type coercion examples
  hosts: localhost
  gather_facts: false
  vars:
    looks_like_bool: yes          # bool (true)
    actual_string_yes: "yes"      # str
    looks_like_float: 1.0         # float
    looks_like_int: 1             # int
    scientific: 1e10              # float
    octal_problem: 0777           # int (octal in YAML 1.1)
    version_number: 1.2           # float, not string!
    version_string: "1.2"         # str
  tasks:
    - name: Show the actual types
      ansible.builtin.debug:
        msg:
          - "yes without quotes: {{ looks_like_bool | type_debug }}"
          - "'yes' with quotes: {{ actual_string_yes | type_debug }}"
          - "1.0: {{ looks_like_float | type_debug }}"
          - "1: {{ looks_like_int | type_debug }}"
          - "1e10: {{ scientific | type_debug }}"
          - "version 1.2: {{ version_number | type_debug }}"
          - "version '1.2': {{ version_string | type_debug }}"
```

The `version_number: 1.2` case is particularly nasty. If you try to use it in a string context expecting "1.2", you might get "1.2" or you might get unexpected behavior in comparisons.

## Using type_debug for Conditional Debugging

When a `when` clause does not behave as expected, adding a debug task before it with `type_debug` reveals the issue:

```yaml
# debug-conditional.yml - Debug a failing conditional
---
- name: Debug a failing conditional
  hosts: localhost
  gather_facts: false
  vars:
    feature_flag: "true"  # Looks like a boolean but is a string
  tasks:
    - name: Debug the variable
      ansible.builtin.debug:
        msg:
          - "Value: {{ feature_flag }}"
          - "Type: {{ feature_flag | type_debug }}"
          - "Bool evaluation: {{ feature_flag | bool }}"

    # This would work differently depending on type
    - name: This might not work as expected
      ansible.builtin.debug:
        msg: "Feature is enabled (string comparison)"
      when: feature_flag == true
      # This fails because "true" (string) != true (bool)

    - name: This works correctly
      ansible.builtin.debug:
        msg: "Feature is enabled (with bool filter)"
      when: feature_flag | bool
```

## Inspecting Complex Structures

For nested data structures, `type_debug` helps you understand what you are working with at each level:

```yaml
# complex-debug.yml - Debug nested structures
---
- name: Debug complex data structures
  hosts: localhost
  gather_facts: false
  vars:
    app_config:
      name: myapp
      ports:
        - 8080
        - 8443
      settings:
        debug: true
        timeout: "30"  # Oops, this is a string
  tasks:
    - name: Inspect nested types
      ansible.builtin.debug:
        msg:
          - "app_config: {{ app_config | type_debug }}"
          - "app_config.name: {{ app_config.name | type_debug }}"
          - "app_config.ports: {{ app_config.ports | type_debug }}"
          - "app_config.ports[0]: {{ app_config.ports[0] | type_debug }}"
          - "app_config.settings.debug: {{ app_config.settings.debug | type_debug }}"
          - "app_config.settings.timeout: {{ app_config.settings.timeout | type_debug }}"
```

## Building a Debug Helper Task File

For frequent debugging, create a reusable task file that dumps comprehensive type information:

```yaml
# tasks/debug-var.yml - Reusable variable debugger
# Usage: include_tasks with var_name and var_value
---
- name: "Debug {{ var_name }}"
  ansible.builtin.debug:
    msg:
      name: "{{ var_name }}"
      value: "{{ var_value }}"
      type: "{{ var_value | type_debug }}"
      is_string: "{{ var_value is string }}"
      is_number: "{{ var_value is number }}"
      is_iterable: "{{ var_value is iterable }}"
      is_mapping: "{{ var_value is mapping }}"
      length: "{{ var_value | length if var_value is iterable and var_value is not string else 'N/A' }}"
```

```yaml
# playbook.yml - Using the debug helper
---
- name: Debug various variables
  hosts: localhost
  gather_facts: false
  vars:
    my_var: [1, 2, 3]
  tasks:
    - name: Debug my_var
      ansible.builtin.include_tasks: tasks/debug-var.yml
      vars:
        var_name: my_var
        var_value: "{{ my_var }}"
```

## Type Checking in Jinja2 Tests

Beyond `type_debug`, Jinja2 provides several built-in tests for type checking:

```yaml
# type-tests.yml - Jinja2 type tests
---
- name: Jinja2 type tests
  hosts: localhost
  gather_facts: false
  vars:
    test_string: "hello"
    test_number: 42
    test_list: [1, 2, 3]
    test_dict: { a: 1 }
    test_bool: true
    test_none: null
  tasks:
    - name: Run type tests
      ansible.builtin.debug:
        msg:
          - "'hello' is string: {{ test_string is string }}"
          - "42 is number: {{ test_number is number }}"
          - "42 is integer: {{ test_number is integer }}"
          - "[1,2,3] is iterable: {{ test_list is iterable }}"
          - "dict is mapping: {{ test_dict is mapping }}"
          - "true is boolean: {{ test_bool is boolean }}"
          - "null is none: {{ test_none is none }}"
          - "'hello' is not number: {{ test_string is not number }}"
```

## Debugging Filters That Fail Silently

Some Jinja2 filters fail silently by returning unexpected values when the input type is wrong. `type_debug` helps you catch these:

```yaml
# silent-failure.yml - Catch silent filter failures
---
- name: Catch silent filter failures
  hosts: localhost
  gather_facts: false
  vars:
    port_string: "not_a_number"
  tasks:
    - name: Show what int filter does with bad input
      ansible.builtin.debug:
        msg:
          - "Input: {{ port_string }}"
          - "Input type: {{ port_string | type_debug }}"
          - "After int filter: {{ port_string | int }}"
          - "After int filter type: {{ (port_string | int) | type_debug }}"
          # int filter returns 0 for non-numeric strings, no error!

    - name: Safe conversion with validation
      ansible.builtin.assert:
        that:
          - port_string | int | string == port_string
        fail_msg: "'{{ port_string }}' is not a valid integer"
```

## Best Practices

Add `type_debug` to your debugging toolkit alongside `debug` messages. When a conditional or filter does not work as expected, the first thing to check is the variable type. Use explicit type casting (`| int`, `| bool`, `| string`) after checking types with `type_debug`. Be especially careful with variables from extra vars (always strings), registered command output (stdout is always a string), and YAML values that look like numbers or booleans. Remove `type_debug` tasks before committing since they are debugging aids, not production code.

The `type_debug` filter is the Ansible equivalent of a type inspector. It takes about 10 seconds to add to a debug task and can save you hours of staring at output that looks correct but is not.
