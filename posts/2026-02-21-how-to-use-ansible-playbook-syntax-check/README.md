# How to Use Ansible Playbook --syntax-check

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Validation, CI/CD, DevOps

Description: Learn how to use the ansible-playbook --syntax-check flag to validate playbook syntax before execution and integrate it into your CI/CD pipeline.

---

Catching syntax errors before running a playbook against live servers is one of the simplest ways to prevent outages. The `--syntax-check` flag validates your playbook's YAML structure and Ansible-specific syntax without connecting to any hosts or executing any tasks. It runs in seconds and catches typos, indentation errors, and structural problems before they cause real damage.

## Basic Syntax Check

Run `--syntax-check` against any playbook:

```bash
# Check a single playbook for syntax errors
ansible-playbook --syntax-check deploy.yml
```

If the syntax is correct, you see:

```
playbook: deploy.yml
```

If there is an error, you get a detailed message:

```
ERROR! Syntax Error while loading YAML.
  mapping values are not allowed in this context

The error appears to be in '/opt/ansible/deploy.yml': line 12, column 18, but may
be elsewhere in the file depending on the exact syntax problem.

The offending line appears to be:

    - name: Install packages
      apt:
        name: nginx
         state: present
                ^ here
```

## What Syntax Check Catches

The syntax check validates:

1. **YAML structure**: Invalid YAML formatting, bad indentation, missing colons
2. **Ansible keywords**: Misspelled directives like `taks` instead of `tasks`
3. **Module parameters**: Missing required parameters in some cases
4. **Include/import paths**: References to non-existent files (for `import_*` directives)
5. **Jinja2 syntax**: Malformed template expressions

Here are examples of errors it catches:

```yaml
# Error 1: Bad YAML indentation
---
- name: Deploy app
  hosts: webservers
  tasks:
    - name: Install nginx
      apt:
        name: nginx
         state: present  # WRONG - extra space before 'state'
```

```yaml
# Error 2: Misspelled Ansible keyword
---
- name: Deploy app
  hosts: webservers
  taks:  # WRONG - should be 'tasks'
    - name: Install nginx
      apt:
        name: nginx
        state: present
```

```yaml
# Error 3: Missing colon after key
---
- name: Deploy app
  hosts webservers  # WRONG - missing colon after 'hosts'
  tasks:
    - name: Install nginx
      apt:
        name: nginx
```

```yaml
# Error 4: Bad Jinja2 syntax
---
- name: Deploy app
  hosts: webservers
  tasks:
    - name: Show version
      debug:
        msg: "Version is {{ version"  # WRONG - missing closing braces
```

## What Syntax Check Does NOT Catch

The syntax check has limitations. It does not catch:

- Logic errors (wrong variable names that are syntactically valid)
- Runtime errors (missing files on the target, permission issues)
- Undefined variables (these are only resolved at runtime)
- Module-specific validation (most parameter validation happens during execution)

```yaml
# These pass syntax check but will fail at runtime:

# Misspelled variable name (valid syntax, wrong variable)
- name: Install specific version
  apt:
    name: "nginx={{ ngnix_version }}"  # Typo in variable name
    state: present

# Module that doesn't exist (valid syntax, missing module)
- name: Do something
  nonexistent_module:
    param: value
```

## Checking Multiple Playbooks

Check all your playbooks at once:

```bash
# Check multiple playbooks
ansible-playbook --syntax-check site.yml webservers.yml dbservers.yml deploy.yml

# Check all YAML files matching a pattern
for playbook in *.yml; do
    echo "Checking $playbook..."
    ansible-playbook --syntax-check "$playbook"
done
```

A more robust script:

```bash
#!/bin/bash
# check-all-playbooks.sh - Validate all playbooks in the project
set -e

PLAYBOOK_DIR="."
ERRORS=0

echo "=== Ansible Playbook Syntax Check ==="

for playbook in $(find "$PLAYBOOK_DIR" -maxdepth 1 -name "*.yml" -type f); do
    echo -n "Checking $(basename $playbook)... "
    if ansible-playbook --syntax-check "$playbook" > /dev/null 2>&1; then
        echo "OK"
    else
        echo "FAILED"
        ansible-playbook --syntax-check "$playbook" 2>&1 | tail -5
        ERRORS=$((ERRORS + 1))
    fi
done

echo "=== Results: $ERRORS errors found ==="
exit $ERRORS
```

## Syntax Check with Inventory

Some playbooks reference inventory-specific variables or groups. You can specify an inventory for the syntax check:

```bash
# Syntax check with a specific inventory
ansible-playbook --syntax-check -i inventories/production/hosts.ini deploy.yml

# Syntax check with a temporary inventory
ansible-playbook --syntax-check -i "localhost," deploy.yml
```

## Integrating Syntax Check into CI/CD

Add syntax checking to your CI/CD pipeline to catch errors before they reach production.

### GitHub Actions

```yaml
# .github/workflows/ansible-lint.yml
name: Ansible Validation

on:
  pull_request:
    paths:
      - '**.yml'
      - '**.yaml'
      - 'roles/**'

jobs:
  syntax-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Ansible
        run: pip install ansible

      - name: Run syntax check on all playbooks
        run: |
          for playbook in *.yml; do
            if head -1 "$playbook" | grep -q "^---"; then
              echo "Checking $playbook..."
              ansible-playbook --syntax-check "$playbook" || exit 1
            fi
          done
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - deploy

syntax-check:
  stage: validate
  image: python:3.11
  before_script:
    - pip install ansible
  script:
    - ansible-playbook --syntax-check site.yml
    - ansible-playbook --syntax-check deploy.yml
    - ansible-playbook --syntax-check webservers.yml
  rules:
    - changes:
        - "*.yml"
        - "roles/**/*"
```

### Pre-commit Hook

Add a Git pre-commit hook to check syntax before every commit:

```bash
#!/bin/bash
# .git/hooks/pre-commit - Syntax check before commit

# Find all staged YAML files
STAGED_PLAYBOOKS=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^[^/]*\.yml$')

if [ -z "$STAGED_PLAYBOOKS" ]; then
    exit 0
fi

echo "Running Ansible syntax check on staged playbooks..."

for playbook in $STAGED_PLAYBOOKS; do
    if head -1 "$playbook" | grep -q "^---"; then
        if ! ansible-playbook --syntax-check "$playbook" > /dev/null 2>&1; then
            echo "Syntax error in $playbook:"
            ansible-playbook --syntax-check "$playbook" 2>&1
            exit 1
        fi
    fi
done

echo "All playbooks passed syntax check."
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Combining with ansible-lint

The `--syntax-check` flag catches structural errors, but `ansible-lint` goes further and checks for best practices, deprecated features, and style issues:

```bash
# Install ansible-lint
pip install ansible-lint

# Run ansible-lint (includes syntax checking plus best practices)
ansible-lint deploy.yml

# Run both for thorough validation
ansible-playbook --syntax-check deploy.yml && ansible-lint deploy.yml
```

A full validation script:

```bash
#!/bin/bash
# validate.sh - Complete playbook validation pipeline
set -e

echo "Step 1: YAML syntax validation"
for f in *.yml; do
    python3 -c "import yaml; yaml.safe_load(open('$f'))" && echo "  $f: valid YAML"
done

echo ""
echo "Step 2: Ansible syntax check"
for f in *.yml; do
    ansible-playbook --syntax-check "$f" > /dev/null && echo "  $f: valid Ansible"
done

echo ""
echo "Step 3: Ansible lint"
ansible-lint *.yml && echo "  All playbooks pass lint"

echo ""
echo "Step 4: Check mode dry run"
ansible-playbook --check -i inventories/staging/hosts.ini deploy.yml && echo "  Dry run passed"

echo ""
echo "All validation steps passed!"
```

## Syntax Check with Vault-Encrypted Files

If your playbook includes vault-encrypted variable files, the syntax check needs the vault password:

```bash
# Syntax check with vault password
ansible-playbook --syntax-check --ask-vault-pass deploy.yml

# Or use a vault password file
ansible-playbook --syntax-check --vault-password-file=~/.vault_pass deploy.yml
```

Without the vault password, you may see errors about being unable to decrypt files, but the basic syntax check will still work for the unencrypted parts.

## Common Syntax Errors and Fixes

Here is a quick reference of frequent syntax issues:

```yaml
# Problem: Tabs instead of spaces
# Fix: Use spaces only. Set your editor to insert spaces for tabs.

# Problem: Inconsistent indentation
# Fix: Always use 2 spaces per indentation level.

# Problem: Missing quotes around values with special characters
# Fix: Quote strings that start with { or contain : or #
- name: Set variable
  set_fact:
    my_var: "{{ some_value }}: with colons"  # Needs quotes

# Problem: Duplicate keys in a mapping
# Fix: Each key should appear only once per mapping
- name: Install package
  apt:
    name: nginx
    state: present
    name: apache2  # WRONG - duplicate 'name' key

# Problem: Using Python boolean instead of YAML
# Fix: Use yes/no or true/false (lowercase)
- name: Gather facts
  setup:
  gather_facts: True  # Should be: true or yes
```

## Summary

The `--syntax-check` flag is the first line of defense against playbook errors. It is fast, requires no remote access, and catches structural problems immediately. Run it locally during development, add it to pre-commit hooks, and make it a required step in your CI/CD pipeline. Combine it with `ansible-lint` for comprehensive validation and `--check --diff` for runtime verification. The few seconds it takes to run a syntax check can save you hours of debugging on live servers.
