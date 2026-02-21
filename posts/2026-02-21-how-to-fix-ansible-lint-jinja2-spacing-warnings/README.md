# How to Fix ansible-lint Jinja2 Spacing Warnings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-lint, Jinja2, YAML

Description: Fix ansible-lint Jinja2 spacing warnings including variable braces, filter pipes, conditional expressions, and template formatting issues.

---

Jinja2 spacing warnings are one of the more annoying categories in ansible-lint because the rules feel picky at first. But consistent Jinja2 formatting actually matters a lot for readability, especially when expressions get complex. When your team follows the same spacing conventions, Jinja2 expressions become much easier to scan and debug.

Let us go through each Jinja2 spacing warning and how to fix it.

## jinja[spacing]: The Core Rule

The main rule is straightforward: there should be exactly one space after `{{` and before `}}`, and exactly one space after `{%` and before `%}`.

**The problem:**

```yaml
# Various Jinja2 spacing violations
---
- name: Deploy application
  hosts: webservers
  tasks:
    - name: Set server name
      ansible.builtin.set_fact:
        server_name: "{{inventory_hostname}}"           # No spaces inside braces

    - name: Set port number
      ansible.builtin.set_fact:
        port: "{{  app_port  }}"                        # Double spaces inside braces

    - name: Create config from template
      ansible.builtin.set_fact:
        config_line: "{{ app_name}}"                    # Missing space before }}

    - name: Set full URL
      ansible.builtin.set_fact:
        url: "{{app_name }}"                            # Missing space after {{
```

**The fix:**

```yaml
# Correct Jinja2 spacing: one space after {{ and before }}
---
- name: Deploy application
  hosts: webservers
  tasks:
    - name: Set server name
      ansible.builtin.set_fact:
        server_name: "{{ inventory_hostname }}"

    - name: Set port number
      ansible.builtin.set_fact:
        port: "{{ app_port }}"

    - name: Create config from template
      ansible.builtin.set_fact:
        config_line: "{{ app_name }}"

    - name: Set full URL
      ansible.builtin.set_fact:
        url: "{{ app_name }}"
```

## Spacing with Filters

When using Jinja2 filters (the pipe `|` character), maintain spaces around the pipe.

**The problem:**

```yaml
# Bad spacing around filter pipes
- name: Process data
  ansible.builtin.set_fact:
    upper_name: "{{ app_name|upper }}"              # No spaces around pipe
    joined: "{{ my_list|join(',') }}"               # No spaces around pipe
    default_val: "{{ my_var|default('none') }}"     # No spaces around pipe
```

**The fix:**

```yaml
# Correct spacing around filter pipes
- name: Process data
  ansible.builtin.set_fact:
    upper_name: "{{ app_name | upper }}"
    joined: "{{ my_list | join(',') }}"
    default_val: "{{ my_var | default('none') }}"
```

## Spacing in Conditional Expressions

The `when` clause uses Jinja2 expressions but should NOT have `{{ }}` braces. However, if you use Jinja2 inline, the spacing rules still apply.

```yaml
# Correct: no braces in when clause
- name: Install on Debian
  ansible.builtin.apt:
    name: nginx
    state: present
  when: ansible_os_family == "Debian"

# Also correct: complex condition without braces
- name: Configure if needed
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
  when:
    - app_installed | bool
    - app_version is version('2.0', '>=')
```

If you accidentally put `{{ }}` in a `when` clause, ansible-lint will flag it with `no-jinja-when`:

```yaml
# Wrong: braces in when clause
- name: Check version
  ansible.builtin.debug:
    msg: "New version"
  when: "{{ app_version }} == '2.0'"

# Correct: no braces needed in when
- name: Check version
  ansible.builtin.debug:
    msg: "New version"
  when: app_version == '2.0'
```

## Spacing in Complex Expressions

Complex Jinja2 expressions with multiple operations need careful spacing.

**The problem:**

```yaml
# Cramped complex expressions
- name: Build connection string
  ansible.builtin.set_fact:
    conn: "{{ db_host+':'+db_port|string+'/'+db_name }}"
    full_name: "{{ first_name+' '+last_name }}"
    result: "{{ (count|int * multiplier|int)+offset|int }}"
```

**The fix:**

```yaml
# Properly spaced complex expressions
- name: Build connection string
  ansible.builtin.set_fact:
    conn: "{{ db_host + ':' + (db_port | string) + '/' + db_name }}"
    full_name: "{{ first_name + ' ' + last_name }}"
    result: "{{ (count | int * multiplier | int) + offset | int }}"
```

For very complex expressions, consider breaking them up:

```yaml
# Even better: break complex expressions into steps
- name: Calculate port as string
  ansible.builtin.set_fact:
    db_port_str: "{{ db_port | string }}"

- name: Build connection string
  ansible.builtin.set_fact:
    conn: "{{ db_host }}:{{ db_port_str }}/{{ db_name }}"
```

## Spacing in Template Files

The same spacing rules apply inside `.j2` template files, though ansible-lint only checks them when they are referenced by tasks.

```jinja2
{# templates/nginx.conf.j2 - Correct Jinja2 spacing in templates #}

server {
    listen {{ nginx_port | default(80) }};
    server_name {{ server_name }};

    {% if ssl_enabled | bool %}
    listen {{ ssl_port | default(443) }} ssl;
    ssl_certificate {{ ssl_cert_path }};
    ssl_certificate_key {{ ssl_key_path }};
    {% endif %}

    {% for location in nginx_locations %}
    location {{ location.path }} {
        proxy_pass {{ location.backend }};
        proxy_set_header Host $host;
    }
    {% endfor %}
}
```

## Spacing with Dictionary and List Access

When accessing dictionary keys or list elements, keep the spaces around the braces but not inside the accessors.

```yaml
# Correct spacing with dict/list access
- name: Access nested data
  ansible.builtin.debug:
    msg:
      - "{{ users[0].name }}"
      - "{{ config['database']['host'] }}"
      - "{{ hostvars[inventory_hostname]['ansible_default_ipv4']['address'] }}"
```

## Bulk Fixing Jinja2 Spacing

For large codebases, you can use regex replacements to fix the most common spacing issues.

```bash
#!/bin/bash
# fix_jinja_spacing.sh - Fix common Jinja2 spacing issues

# Fix {{variable}} -> {{ variable }}
# This is a simplified approach - review changes carefully
find . -name "*.yml" -o -name "*.yaml" | while read -r file; do
  # Fix missing space after {{
  sed -i 's/{{[^ {%-]/{{ &/g; s/{{ {{/{{ /g' "$file"

  # Fix missing space before }}
  sed -i 's/[^ }%-]}}/& }}/g; s/}} }}/ }}/g' "$file"
done
```

A more reliable approach is to use a proper Jinja2 formatter. The `j2lint` tool can help:

```bash
# Install j2lint
pip install j2lint

# Check Jinja2 formatting
j2lint templates/

# Or use the built-in ansible-lint --fix option (available in recent versions)
ansible-lint --fix playbook.yml
```

## The --fix Option

Recent versions of ansible-lint include an experimental `--fix` option that can automatically fix some Jinja2 spacing issues:

```bash
# Auto-fix supported issues (including Jinja2 spacing)
ansible-lint --fix playbook.yml

# Preview what would be fixed without making changes
ansible-lint --fix --diff playbook.yml
```

Not all rules support auto-fix, but Jinja2 spacing is one that often does. Always review the changes before committing.

## Configuring Jinja2 Spacing Rules

If you want to adjust or disable specific Jinja2 spacing rules:

```yaml
# .ansible-lint - Customize Jinja2 rules
---
profile: moderate

# Skip Jinja2 spacing entirely (not recommended)
# skip_list:
#   - jinja[spacing]

# Or warn instead of fail
warn_list:
  - jinja[spacing]
```

## Editor Integration

Most editors can show Jinja2 spacing issues in real time. In VS Code, install the Ansible extension:

```json
// .vscode/settings.json - Enable Jinja2 formatting
{
  "ansible.validation.lint.enabled": true,
  "ansible.validation.lint.path": "ansible-lint",
  "[jinja-yaml]": {
    "editor.defaultFormatter": "redhat.ansible"
  }
}
```

## Common Patterns Reference

Here is a quick reference of correctly spaced Jinja2 patterns:

```yaml
# Simple variable
value: "{{ my_var }}"

# Variable with default
value: "{{ my_var | default('fallback') }}"

# Variable with multiple filters
value: "{{ my_var | lower | replace(' ', '-') }}"

# Ternary expression
value: "{{ 'yes' if condition else 'no' }}"

# String concatenation
value: "{{ prefix + '-' + suffix }}"

# Dictionary access
value: "{{ my_dict['key'] }}"

# Nested variable access
value: "{{ hostvars[host]['ansible_host'] }}"

# Math expression
value: "{{ (count | int) + 1 }}"

# Conditional filter
value: "{{ items | selectattr('active', 'equalto', true) | list }}"
```

Jinja2 spacing is one of those rules that is easy to follow once you develop the habit. Configure your editor to highlight issues, use the `--fix` option when available, and the spacing will become second nature after a few days.
