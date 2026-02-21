# How to Fix ansible-lint YAML Formatting Warnings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-lint, YAML, Formatting

Description: Practical fixes for common ansible-lint YAML formatting warnings including line length, truthy values, indentation, and document markers.

---

YAML formatting warnings are usually the first batch of issues you see when running ansible-lint on an existing project. They are not about Ansible logic but about how your YAML is structured. Fixing them makes your files more consistent and easier to read. Let us go through each common YAML warning and how to fix it properly.

## yaml[line-length]: Line Too Long

This is the single most common warning. The default limit is 160 characters.

**The problem:**

```yaml
# This line is way too long and will trigger yaml[line-length]
- name: Install a bunch of packages needed for the production web application server including monitoring and logging tools
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop: ["nginx", "prometheus-node-exporter", "filebeat", "logrotate", "fail2ban", "unattended-upgrades", "apt-transport-https", "ca-certificates"]
```

**The fix:** Break long lines using YAML multi-line syntax or restructure your data.

```yaml
# Fix: break the task name
- name: Install packages needed for the production web server
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop:
    - nginx
    - prometheus-node-exporter
    - filebeat
    - logrotate
    - fail2ban
    - unattended-upgrades
    - apt-transport-https
    - ca-certificates
```

For long Jinja2 expressions, use variables or filters:

```yaml
# Before: long inline expression
- name: Set connection string
  ansible.builtin.set_fact:
    conn_str: "postgresql://{{ db_user }}:{{ db_pass }}@{{ db_host }}:{{ db_port }}/{{ db_name }}?sslmode={{ db_ssl_mode }}&connect_timeout={{ db_timeout }}"

# After: break it up using a variable or YAML folded scalar
- name: Set connection string
  ansible.builtin.set_fact:
    conn_str: >-
      postgresql://{{ db_user }}:{{ db_pass }}@{{ db_host }}:{{ db_port }}/{{ db_name }}?sslmode={{ db_ssl_mode }}&connect_timeout={{ db_timeout }}
```

If you really cannot shorten your lines, adjust the limit in your yamllint config:

```yaml
# .yamllint.yml - Increase line length limit
---
rules:
  line-length:
    max: 200
    allow-non-breakable-inline-mappings: true
```

## yaml[truthy]: Truthy Value Should Be true/false

YAML allows `yes`, `no`, `on`, `off`, `True`, `False`, and several other truthy/falsy values. ansible-lint wants you to use only `true` and `false` (lowercase).

**The problem:**

```yaml
# These all trigger yaml[truthy]
---
- name: Configure services
  hosts: all
  become: yes       # Should be true
  gather_facts: no  # Should be false
  tasks:
    - name: Enable service
      ansible.builtin.systemd:
        name: nginx
        enabled: Yes   # Should be true
        state: started
      vars:
        force_restart: True  # Should be true
```

**The fix:**

```yaml
# Corrected truthy values
---
- name: Configure services
  hosts: all
  become: true
  gather_facts: false
  tasks:
    - name: Enable service
      ansible.builtin.systemd:
        name: nginx
        enabled: true
        state: started
      vars:
        force_restart: true
```

To fix this across your entire project quickly:

```bash
# Find all yes/no/True/False patterns in YAML files
grep -rn "become: yes\|become: no\|gather_facts: yes\|gather_facts: no" --include="*.yml"

# Use sed to replace (review changes carefully before committing)
find . -name "*.yml" -exec sed -i 's/: yes$/: true/g; s/: no$/: false/g' {} +
```

## yaml[indentation]: Indentation Issues

ansible-lint expects consistent indentation, usually 2 spaces.

**The problem:**

```yaml
# Inconsistent indentation
---
- name: Bad indentation example
  hosts: all
  tasks:
      - name: Too many spaces here
        ansible.builtin.debug:
            msg: "also too many spaces"
    - name: Too few spaces here
      ansible.builtin.debug:
        msg: "this is fine"
```

**The fix:**

```yaml
# Consistent 2-space indentation
---
- name: Correct indentation example
  hosts: all
  tasks:
    - name: Proper indentation
      ansible.builtin.debug:
        msg: "all good"

    - name: Also proper indentation
      ansible.builtin.debug:
        msg: "this is fine"
```

Configure your editor to use 2-space indentation for YAML files. In VS Code:

```json
{
  "[yaml]": {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "editor.detectIndentation": false
  }
}
```

## yaml[new-line-at-end-of-file]: Missing Final Newline

POSIX standard says text files should end with a newline character.

**The fix:** Make sure every YAML file ends with a single newline. Most editors can be configured to do this automatically.

In VS Code:

```json
{
  "files.insertFinalNewline": true,
  "files.trimFinalNewlines": true
}
```

In `.editorconfig`:

```ini
# .editorconfig - Ensure consistent file endings
[*.{yml,yaml}]
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2
```

## yaml[document-start]: Missing Document Start Marker

YAML documents should begin with `---`.

**The problem:**

```yaml
# Missing --- at the start
- name: My playbook
  hosts: all
  tasks:
    - name: Do something
      ansible.builtin.debug:
        msg: "hello"
```

**The fix:**

```yaml
---
- name: My playbook
  hosts: all
  tasks:
    - name: Do something
      ansible.builtin.debug:
        msg: "hello"
```

## yaml[trailing-spaces]: Trailing Whitespace

Invisible trailing spaces at the end of lines.

**The fix:** Configure your editor to trim trailing whitespace on save, and add it to your `.editorconfig`.

To find and fix existing trailing spaces:

```bash
# Find files with trailing whitespace
grep -rn ' $' --include="*.yml" .

# Fix with sed
find . -name "*.yml" -exec sed -i 's/[[:space:]]*$//' {} +
```

## yaml[empty-lines]: Too Many Blank Lines

By default, YAML lint allows a maximum of 2 consecutive blank lines, and 0 at the start of the file.

**The problem:**

```yaml
---
- name: My playbook
  hosts: all
  tasks:
    - name: First task
      ansible.builtin.debug:
        msg: "first"



    - name: Second task  # Three blank lines above is too many
      ansible.builtin.debug:
        msg: "second"
```

**The fix:**

```yaml
---
- name: My playbook
  hosts: all
  tasks:
    - name: First task
      ansible.builtin.debug:
        msg: "first"

    - name: Second task
      ansible.builtin.debug:
        msg: "second"
```

## yaml[comments]: Comment Formatting

Comments need a space after the `#` character.

**The problem:**

```yaml
---
#This comment has no space after the hash
- name: My playbook
  hosts: all #This inline comment also has no space
```

**The fix:**

```yaml
---
# This comment has proper spacing
- name: My playbook
  hosts: all  # This inline comment is correct too
```

## Bulk Fixing YAML Issues

For large projects, manually fixing every YAML issue is tedious. Use `yamlfmt` or `prettier` to auto-format:

```bash
# Install yamlfmt
go install github.com/google/yamlfmt/cmd/yamlfmt@latest

# Format all YAML files
yamlfmt .

# Or use prettier with the YAML plugin
npm install -g prettier
prettier --write "**/*.yml"
```

Configure yamlfmt to match ansible-lint's expectations:

```yaml
# .yamlfmt.yml - Format settings matching ansible-lint
---
formatter:
  type: basic
  indent: 2
  line_ending: lf
  retain_line_breaks: true
  trim_trailing_whitespace: true
  eof_newline: true
```

## Recommended yamllint Configuration

Create a `.yamllint.yml` that matches ansible-lint's expectations:

```yaml
# .yamllint.yml - Configuration for yamllint
---
extends: default

rules:
  line-length:
    max: 160
    level: warning
  truthy:
    allowed-values: ["true", "false"]
    check-keys: false
  comments:
    require-starting-space: true
    min-spaces-from-content: 2
  indentation:
    spaces: 2
    indent-sequences: true
  document-start:
    present: true
  empty-lines:
    max: 2
    max-start: 0
    max-end: 0
```

YAML formatting warnings might seem trivial, but consistent formatting across a codebase significantly reduces cognitive load when reading playbooks. Fix the easy ones first, configure your editor to prevent new violations, and use auto-formatters to handle bulk cleanup. Your future self and your teammates will appreciate it.
