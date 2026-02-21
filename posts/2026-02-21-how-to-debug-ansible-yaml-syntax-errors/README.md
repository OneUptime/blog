# How to Debug Ansible YAML Syntax Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Syntax, Debugging

Description: Learn how to identify and fix common YAML syntax errors in Ansible playbooks with practical examples and linting tools.

---

YAML syntax errors are the most basic and yet most frustrating problems in Ansible. A single misplaced space, a tab character, or a missing colon can prevent your entire playbook from loading. The error messages often point to the wrong line, and the fix is usually something invisible like incorrect indentation. This post catalogs the most common YAML mistakes in Ansible playbooks and shows you how to find and fix them quickly.

## Understanding Ansible's YAML Error Messages

When Ansible encounters a YAML syntax error, it produces a message like:

```
ERROR! We were unable to read either as JSON nor YAML, these are the errors we got from each:
JSON: Expecting value: line 1 column 1 (char 0)

Syntax Error while loading YAML.
  mapping values are not allowed in this context

The error appears to be in '/home/deploy/playbooks/deploy.yml': line 15, column 12
```

The line number is usually close but not always exact. Check the indicated line and the few lines above it.

## Error 1: Tabs Instead of Spaces

YAML does not allow tab characters. This is the number one cause of syntax errors, especially when copying code from web pages or switching between editors.

```yaml
# WRONG: Tab character before 'name' (invisible but fatal)
- hosts: webservers
	name: Deploy app
```

The error message:

```
found character '\t' that cannot start any token
```

**How to find tabs:**

```bash
# Search for tab characters in your playbook
grep -P '\t' deploy.yml

# Show tab characters visually
cat -A deploy.yml | grep '\^I'
```

**Fix: Replace tabs with spaces:**

```bash
# Replace all tabs with 2 spaces
sed -i 's/\t/  /g' deploy.yml

# Or use your editor's "Convert Indentation to Spaces" feature
```

## Error 2: Incorrect Indentation

YAML uses indentation to define structure. Every level must be consistently indented.

```yaml
# WRONG: Mixed indentation (3 spaces then 2 spaces)
- name: Deploy application
  hosts: webservers
  tasks:
     - name: Install packages
       ansible.builtin.apt:
        name: nginx
```

```yaml
# CORRECT: Consistent 2-space indentation
- name: Deploy application
  hosts: webservers
  tasks:
    - name: Install packages
      ansible.builtin.apt:
        name: nginx
```

**The error message for this is often misleading:**

```
mapping values are not allowed in this context
```

or

```
could not find expected ':'
```

## Error 3: Missing Colon After Key

Every YAML key needs a colon and a space:

```yaml
# WRONG: Missing colon
- name Deploy application
  hosts webservers

# CORRECT: Colon after every key
- name: Deploy application
  hosts: webservers
```

```yaml
# WRONG: Missing space after colon
- name:Deploy application
  hosts:webservers

# CORRECT: Space after colon
- name: Deploy application
  hosts: webservers
```

## Error 4: Special Characters in Strings

Certain characters have special meaning in YAML and need quoting:

```yaml
# WRONG: Colon in value without quotes
- name: Set message
  ansible.builtin.debug:
    msg: Error: connection failed

# CORRECT: Quote strings containing colons
- name: Set message
  ansible.builtin.debug:
    msg: "Error: connection failed"
```

Characters that require quoting:
- `:` (colon followed by space)
- `#` (hash/comment)
- `{` and `}` (JSON syntax)
- `[` and `]` (JSON arrays)
- `*` and `&` (YAML anchors/aliases)
- `!` (YAML tags)
- `%` (YAML directives)
- `@` and `` ` `` (reserved)

```yaml
# WRONG: Hash interpreted as comment
- name: Set config value
  ansible.builtin.debug:
    msg: Color is #FF0000

# CORRECT: Quote it
- name: Set config value
  ansible.builtin.debug:
    msg: "Color is #FF0000"

# WRONG: Braces interpreted as JSON
- name: Set template variable
  ansible.builtin.debug:
    msg: {{ my_var }}

# CORRECT: Quote Jinja2 expressions when they start the value
- name: Set template variable
  ansible.builtin.debug:
    msg: "{{ my_var }}"
```

## Error 5: Incorrect List Syntax

Lists in YAML use dashes with consistent indentation:

```yaml
# WRONG: Missing space after dash
- name: Install packages
  ansible.builtin.apt:
    name:
      -nginx
      -redis

# CORRECT: Space after dash
- name: Install packages
  ansible.builtin.apt:
    name:
      - nginx
      - redis
```

```yaml
# WRONG: Inconsistent list indentation
tasks:
  - name: First task
    ansible.builtin.debug:
      msg: hello
- name: Second task
  ansible.builtin.debug:
    msg: world

# CORRECT: All list items at the same level
tasks:
  - name: First task
    ansible.builtin.debug:
      msg: hello
  - name: Second task
    ansible.builtin.debug:
      msg: world
```

## Error 6: Boolean and Number Surprises

YAML automatically converts certain strings to booleans or numbers:

```yaml
# SURPRISE: These are all interpreted as boolean True
enable_feature: yes
enable_feature: Yes
enable_feature: YES
enable_feature: true
enable_feature: True
enable_feature: on
enable_feature: On

# SURPRISE: These are boolean False
disable_feature: no
disable_feature: false
disable_feature: off

# If you need the literal string "yes" or "no":
answer: "yes"
country_code: "no"  # Norway, not boolean false!
```

```yaml
# SURPRISE: Octal numbers
file_mode: 0644
# This is the integer 420 (octal 0644), not the string "0644"

# Fix: Quote it if you mean the string
file_mode: "0644"
```

## Error 7: Multi-line String Issues

YAML has multiple ways to handle multi-line strings, and mixing them up causes errors:

```yaml
# Literal block (preserves newlines)
description: |
  This is line one.
  This is line two.
  This is line three.

# Folded block (joins lines with spaces)
description: >
  This is a long sentence
  that wraps across multiple
  lines but becomes one line.

# WRONG: Inconsistent indentation in block
description: |
  Line one
    Line two with extra indent
  Line three
# This preserves the extra indent, which might not be what you want

# WRONG: Content on the same line as the block indicator
description: | This breaks
  because content cannot be on the same line as |
```

## Error 8: Duplicate Keys

YAML does not allow duplicate keys in the same mapping:

```yaml
# WRONG: Duplicate 'name' key
- name: Install packages
  ansible.builtin.apt:
    name: nginx
  name: Start service  # This overwrites the first 'name'!
  ansible.builtin.service:
    name: nginx
    state: started
```

This should be two separate tasks:

```yaml
# CORRECT: Separate tasks
- name: Install packages
  ansible.builtin.apt:
    name: nginx

- name: Start service
  ansible.builtin.service:
    name: nginx
    state: started
```

## Using ansible-lint

ansible-lint catches both YAML syntax errors and Ansible-specific issues:

```bash
# Install ansible-lint
pip install ansible-lint

# Lint a playbook
ansible-lint deploy.yml

# Lint with specific rules
ansible-lint -R -r ~/.ansible/lint-rules deploy.yml
```

Example output:

```
deploy.yml:15: syntax-check: 'deploy.yml' is not a valid YAML file
deploy.yml:23: yaml[indentation]: wrong indentation: expected 4 but found 6
deploy.yml:31: yaml[truthy]: truthy value should be one of [false, true]
deploy.yml:45: name[missing]: All tasks should be named
```

## Using yamllint

yamllint is a dedicated YAML linter:

```bash
# Install yamllint
pip install yamllint

# Lint a file
yamllint deploy.yml

# Lint with relaxed rules (good for Ansible)
yamllint -d relaxed deploy.yml
```

Create a config file for Ansible-friendly rules:

```yaml
# .yamllint
---
extends: default

rules:
  line-length:
    max: 160
  truthy:
    allowed-values: ['true', 'false', 'yes', 'no']
  comments:
    min-spaces-from-content: 1
  indentation:
    spaces: 2
    indent-sequences: true
```

## Using ansible-playbook --syntax-check

Ansible has a built-in syntax check:

```bash
# Check syntax without running the playbook
ansible-playbook deploy.yml --syntax-check
```

This catches YAML errors and basic Ansible structural problems but not all issues that ansible-lint finds.

## Using Python to Validate YAML

For a quick check without installing extra tools:

```bash
# Validate YAML with Python
python3 -c "
import yaml
with open('deploy.yml') as f:
    try:
        yaml.safe_load(f)
        print('YAML is valid')
    except yaml.YAMLError as e:
        print(f'YAML error: {e}')
"
```

## Editor Configuration

Prevent YAML errors by configuring your editor:

### VS Code

```json
// settings.json
{
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "editor.detectIndentation": false,
    "[yaml]": {
        "editor.tabSize": 2,
        "editor.insertSpaces": true,
        "editor.autoIndent": "keep"
    },
    "files.associations": {
        "*.yml": "yaml",
        "*.yaml": "yaml"
    }
}
```

Install the YAML extension (Red Hat) for real-time validation.

### Vim

```vim
" .vimrc
autocmd FileType yaml setlocal ts=2 sts=2 sw=2 expandtab
autocmd FileType yaml setlocal indentkeys-=0# indentkeys-=<:>
```

## Quick Fix Checklist

When you hit a YAML syntax error:

```bash
# 1. Check for tabs
grep -Pn '\t' playbook.yml

# 2. Validate YAML
python3 -c "import yaml; yaml.safe_load(open('playbook.yml'))"

# 3. Run syntax check
ansible-playbook playbook.yml --syntax-check

# 4. Run yamllint
yamllint playbook.yml

# 5. Check the line mentioned in the error AND the lines above it
# YAML errors often manifest one or two lines after the actual problem
```

## Summary

YAML syntax errors in Ansible are caused by tabs, inconsistent indentation, missing colons or spaces, unquoted special characters, duplicate keys, and multi-line string formatting. Prevent them with editor configuration (spaces not tabs, 2-space indent), catch them early with `yamllint` and `ansible-lint`, and debug them by checking the error line plus the surrounding lines. The most important rule: configure your editor to use spaces instead of tabs and set the indent to 2 spaces. That alone prevents the majority of YAML issues.
