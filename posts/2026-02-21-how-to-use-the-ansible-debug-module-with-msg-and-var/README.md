# How to Use the Ansible debug Module with msg and var

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Playbooks, Troubleshooting

Description: Understand the differences between msg and var parameters in the Ansible debug module and when to use each one effectively.

---

The Ansible debug module has two primary parameters for output: `msg` and `var`. While both display information during playbook execution, they behave differently and serve different purposes. Choosing the right one for the situation can save you time and prevent confusion. This post breaks down exactly how each parameter works and when to reach for one versus the other.

## The var Parameter

The `var` parameter takes a variable name as a plain string (no Jinja2 curly braces) and outputs the variable along with its value in JSON format.

```yaml
# Using var to print a simple variable
- name: Show the deploy version
  ansible.builtin.debug:
    var: deploy_version
```

Output:

```
ok: [web-01] => {
    "deploy_version": "3.2.1"
}
```

Key things about `var`:
- You pass the variable name as a string, not wrapped in `{{ }}`
- The output always includes the variable name as the key
- Complex data structures (dicts, lists) are printed in JSON format
- You can use dot notation to access nested values

```yaml
# Accessing nested values with var
- name: Show the default IPv4 address
  ansible.builtin.debug:
    var: ansible_default_ipv4.address

- name: Show the first DNS server
  ansible.builtin.debug:
    var: ansible_dns.nameservers[0]
```

Output:

```
ok: [web-01] => {
    "ansible_default_ipv4.address": "10.0.1.50"
}

ok: [web-01] => {
    "ansible_dns.nameservers[0]": "10.0.0.2"
}
```

## The msg Parameter

The `msg` parameter takes a string that can include Jinja2 expressions and outputs a custom message:

```yaml
# Using msg to print a formatted message
- name: Show deployment info
  ansible.builtin.debug:
    msg: "Deploying version {{ deploy_version }} to {{ inventory_hostname }}"
```

Output:

```
ok: [web-01] => {
    "msg": "Deploying version 3.2.1 to web-01"
}
```

Key things about `msg`:
- You use standard Jinja2 `{{ }}` syntax for variables
- You can include multiple variables in one message
- You can use Jinja2 filters, conditions, and expressions
- The output key is always "msg"

## When to Use var vs msg

Here is a practical guide for choosing between them:

**Use `var` when:**
- You want to see the raw value and structure of a variable
- You are exploring an unfamiliar data structure
- You need to see the exact type (string, int, list, dict)
- You want quick, no-frills output

```yaml
# Exploring a registered result structure
- name: Run a command
  ansible.builtin.command:
    cmd: whoami
  register: who_result
  changed_when: false

# var gives you the complete structure
- name: Inspect the full result
  ansible.builtin.debug:
    var: who_result
```

Output with `var`:

```json
{
    "who_result": {
        "changed": false,
        "cmd": ["whoami"],
        "delta": "0:00:00.003",
        "end": "2026-02-21 10:15:22",
        "msg": "",
        "rc": 0,
        "start": "2026-02-21 10:15:22",
        "stderr": "",
        "stdout": "root",
        "stdout_lines": ["root"]
    }
}
```

**Use `msg` when:**
- You want human-readable output
- You need to combine multiple variables in context
- You want to add explanatory text around values
- You are building log-style messages

```yaml
# msg gives you formatted, contextual output
- name: Report command result
  ansible.builtin.debug:
    msg: "Command ran as user '{{ who_result.stdout }}' with exit code {{ who_result.rc }}"
```

## Using var with Jinja2 Expressions

A lesser-known feature is that `var` can actually evaluate Jinja2 expressions, not just variable names. But the syntax can be confusing:

```yaml
# var can evaluate expressions (but the output key is the expression itself)
- name: Show filtered list
  ansible.builtin.debug:
    var: my_servers | selectattr('role', 'equalto', 'web') | list
```

Output:

```
ok: [localhost] => {
    "my_servers | selectattr('role', 'equalto', 'web') | list": [
        {"name": "web-01", "role": "web"},
        {"name": "web-02", "role": "web"}
    ]
}
```

This works but the output key becomes the entire expression, which is harder to read. For filtered or transformed data, `msg` is usually better:

```yaml
# More readable with msg
- name: Show web servers
  ansible.builtin.debug:
    msg: "{{ my_servers | selectattr('role', 'equalto', 'web') | map(attribute='name') | list }}"
```

## Multiline msg Output

The `msg` parameter supports multiline strings, which is great for creating formatted reports:

```yaml
# Multiline output with msg using YAML literal block scalar
- name: Show system summary
  ansible.builtin.debug:
    msg: |
      System Summary for {{ inventory_hostname }}
      =============================================
      OS: {{ ansible_distribution }} {{ ansible_distribution_version }}
      Kernel: {{ ansible_kernel }}
      CPU Cores: {{ ansible_processor_vcpus }}
      Total Memory: {{ ansible_memtotal_mb }}MB
      Free Memory: {{ ansible_memfree_mb }}MB
      Default IP: {{ ansible_default_ipv4.address }}
```

Output:

```
ok: [web-01] => {
    "msg": "System Summary for web-01\n=============================================\nOS: Ubuntu 22.04\nKernel: 5.15.0-91-generic\nCPU Cores: 4\nTotal Memory: 8192MB\nFree Memory: 4521MB\nDefault IP: 10.0.1.50\n"
}
```

## Common Mistake: Using Curly Braces with var

One of the most common mistakes is wrapping the variable name in curly braces when using `var`:

```yaml
# WRONG: This will print the value of the variable, not the variable itself
- name: Incorrect var usage
  ansible.builtin.debug:
    var: "{{ deploy_version }}"
  # If deploy_version = "3.2.1", this tries to print a variable named "3.2.1"

# CORRECT: Pass the variable name as a string
- name: Correct var usage
  ansible.builtin.debug:
    var: deploy_version
```

## Printing Multiple Variables

With `var`, you can only print one variable at a time. With `msg`, you can include as many as you want:

```yaml
# var: one variable at a time
- name: Show version
  ansible.builtin.debug:
    var: deploy_version

- name: Show environment
  ansible.builtin.debug:
    var: target_env

# msg: multiple variables in one task
- name: Show all deployment parameters
  ansible.builtin.debug:
    msg: "Version: {{ deploy_version }}, Env: {{ target_env }}, Branch: {{ git_branch }}"
```

For printing multiple variables cleanly, you can also use `msg` with a dictionary:

```yaml
# Print a structured summary using msg
- name: Show deployment parameters
  ansible.builtin.debug:
    msg:
      version: "{{ deploy_version }}"
      environment: "{{ target_env }}"
      branch: "{{ git_branch }}"
      hosts: "{{ ansible_play_hosts | length }}"
```

Output:

```
ok: [web-01] => {
    "msg": {
        "branch": "release/3.2",
        "environment": "production",
        "hosts": "5",
        "version": "3.2.1"
    }
}
```

## Using msg with Conditional Logic

You can embed conditional logic directly in `msg`:

```yaml
# Conditional messages
- name: Report deployment readiness
  ansible.builtin.debug:
    msg: >-
      Host {{ inventory_hostname }} is
      {{ 'READY' if (ansible_memfree_mb | int > 512 and disk_free_pct | int > 20)
         else 'NOT READY (check resources)' }}
      for deployment

# Ternary filter for cleaner conditionals
- name: Show SSL status
  ansible.builtin.debug:
    msg: "SSL is {{ ssl_enabled | ternary('enabled', 'disabled') }} on {{ inventory_hostname }}"
```

## Practical Comparison: Debugging a Failed Task

Here is a side-by-side comparison for debugging a task that did not work as expected:

```yaml
- name: Attempt to fetch API data
  ansible.builtin.uri:
    url: "http://{{ api_host }}:{{ api_port }}/api/v1/status"
    return_content: true
  register: api_result
  ignore_errors: true

# Approach 1: Use var to dump everything and explore
- name: Dump full API result for inspection
  ansible.builtin.debug:
    var: api_result

# Approach 2: Use msg to show specific fields you care about
- name: Show API response summary
  ansible.builtin.debug:
    msg: |
      API Call Summary:
        URL: http://{{ api_host }}:{{ api_port }}/api/v1/status
        Status: {{ api_result.status | default('N/A') }}
        Failed: {{ api_result.failed }}
        Message: {{ api_result.msg | default('No message') }}
        Content: {{ api_result.content | default('No content') | truncate(200) }}
```

The first approach (var) is what you use when you do not know what fields are available. The second approach (msg) is what you use when you know the structure and want a clean, focused summary.

## Performance Note

The debug module has essentially zero overhead since it runs on the controller, not on remote hosts. However, printing very large data structures (like all facts or extensive registered results) can slow down output rendering. Use the `verbosity` parameter (covered in a separate post) to hide debug output during normal runs.

## Default Behavior

If you call the debug module with no parameters, it prints "Hello world!":

```yaml
# Default output when no parameters given
- name: Default debug
  ansible.builtin.debug:
  # Prints: {"msg": "Hello world!"}
```

This is not particularly useful but good to know in case you see it in someone else's playbook.

## Summary

Use `var` for quick variable inspection and data structure exploration. Use `msg` for formatted, human-readable output that combines multiple variables with context. Start with `var` when debugging an unfamiliar issue to see the full picture, then switch to `msg` for targeted output once you know what you are looking for. Both are essential tools in your Ansible debugging workflow, and knowing when to reach for each one makes troubleshooting significantly faster.
