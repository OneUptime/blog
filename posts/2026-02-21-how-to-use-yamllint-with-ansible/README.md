# How to Use yamllint with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, yamllint, YAML, Linting

Description: Configure yamllint specifically for Ansible projects with the right rules, exclusions, and integration alongside ansible-lint for complete coverage.

---

yamllint is a standalone YAML linter that checks your files for syntax errors, formatting issues, and style violations. While ansible-lint handles Ansible-specific logic, yamllint focuses purely on YAML correctness. Using both together gives you comprehensive coverage: yamllint catches YAML problems, and ansible-lint catches Ansible problems.

In this guide, we will set up yamllint for an Ansible project with a configuration that works well alongside ansible-lint without creating duplicate or conflicting warnings.

## Installing yamllint

```bash
# Install with pip
pip install yamllint

# Or with your system package manager
# Ubuntu/Debian
sudo apt install yamllint

# macOS
brew install yamllint

# Verify
yamllint --version
```

## Running yamllint

```bash
# Lint a single file
yamllint playbook.yml

# Lint a directory recursively
yamllint .

# Lint with a specific config file
yamllint -c .yamllint.yml .

# Lint with strict mode (warnings become errors)
yamllint -s .

# Output in parseable format (good for CI)
yamllint -f parsable .
```

## Creating the Configuration File

yamllint looks for configuration in these locations (in order):

1. File specified with `-c` flag
2. `.yamllint.yml` or `.yamllint.yaml` in the current directory
3. `.yamllint` in the current directory
4. `~/.config/yamllint/config`

Here is a configuration optimized for Ansible projects:

```yaml
# .yamllint.yml - Configuration tuned for Ansible
---
extends: default

rules:
  # Line length: Ansible tasks can get long, especially with Jinja2
  line-length:
    max: 160
    level: warning
    allow-non-breakable-words: true
    allow-non-breakable-inline-mappings: true

  # Truthy: enforce true/false over yes/no
  truthy:
    allowed-values: ["true", "false"]
    check-keys: false

  # Comments: require space after # and 2 spaces before inline comments
  comments:
    require-starting-space: true
    ignore-shebangs: true
    min-spaces-from-content: 2

  # Indentation: 2 spaces, consistent sequences
  indentation:
    spaces: 2
    indent-sequences: true
    check-multi-line-strings: false

  # Braces: allow single-line with spaces
  braces:
    forbid: false
    min-spaces-inside: 0
    max-spaces-inside: 1
    min-spaces-inside-empty: -1
    max-spaces-inside-empty: -1

  # Brackets: same as braces
  brackets:
    forbid: false
    min-spaces-inside: 0
    max-spaces-inside: 1

  # Document start: require ---
  document-start:
    present: true

  # Document end: do not require ...
  document-end: disable

  # Empty lines: max 2 consecutive, none at start
  empty-lines:
    max: 2
    max-start: 0
    max-end: 0

  # New lines: LF only
  new-lines:
    type: unix

  # Colons: standard spacing
  colons:
    max-spaces-before: 0
    max-spaces-after: 1

  # Hyphens: standard spacing
  hyphens:
    max-spaces-after: 1

  # Octal values: allow old-style octal (for file permissions like 0644)
  octal-values:
    forbid-implicit-octal: true
    forbid-explicit-octal: false

ignore: |
  .cache/
  .git/
  collections/
  roles/external/
  venv/
  node_modules/
```

## Understanding the Rules

### Line Length

Ansible playbooks tend to have longer lines than typical YAML files due to Jinja2 expressions. Setting the max to 160 gives enough room without being too permissive.

```yaml
# This 160-char limit works for most Ansible tasks
- name: Install required packages for web server
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop: "{{ web_packages }}"
  when: ansible_distribution == "Ubuntu"
```

### Truthy Values

Ansible accepts `yes`/`no` but the YAML spec prefers `true`/`false`. Enforcing `true`/`false` prevents confusion:

```yaml
# Setting check-keys: false is important because Ansible uses
# keys like 'on' in some contexts (e.g., GitHub Actions)
truthy:
  allowed-values: ["true", "false"]
  check-keys: false  # Do not flag dictionary keys
```

### Indentation

The `indent-sequences: true` setting means list items get indented relative to their parent key. This matches ansible-lint's expectations:

```yaml
# indent-sequences: true (recommended for Ansible)
tasks:
  - name: First task
    ansible.builtin.debug:
      msg: "hello"

# indent-sequences: false (not recommended for Ansible)
tasks:
- name: First task
  ansible.builtin.debug:
    msg: "hello"
```

### Octal Values

Ansible file permissions use octal notation. We need to allow explicit octal (`0644`) but forbid implicit octal (numbers starting with 0 that are not strings):

```yaml
# This should be allowed (explicit octal for file permissions)
- name: Set file permissions
  ansible.builtin.file:
    path: /etc/myapp/config
    mode: "0644"   # String, not implicit octal

# yamllint would flag this as implicit octal if not quoted
# mode: 0644  # This is treated as integer 420 in YAML!
```

## Excluding Files and Directories

The `ignore` section in the config file uses gitignore-style patterns:

```yaml
# .yamllint.yml - Exclusion patterns
ignore: |
  .cache/
  .git/
  .tox/
  collections/
  roles/external/
  venv/
  *.encrypted
  *vault*.yml
```

You can also exclude paths from the command line:

```bash
# Exclude specific paths
yamllint -c .yamllint.yml $(find . -name "*.yml" -not -path "./collections/*" -not -path "./.git/*")
```

## Running yamllint Before ansible-lint

The recommended approach is to run yamllint first because it catches syntax errors that would cause ansible-lint to fail with confusing messages.

```bash
# Run yamllint first, then ansible-lint
yamllint . && ansible-lint .

# Or in a Makefile
# Makefile - Lint targets
.PHONY: lint lint-yaml lint-ansible

lint: lint-yaml lint-ansible

lint-yaml:
	yamllint -c .yamllint.yml .

lint-ansible:
	ansible-lint
```

## Integration with Pre-Commit

Add yamllint to your pre-commit configuration alongside ansible-lint:

```yaml
# .pre-commit-config.yaml - yamllint before ansible-lint
---
repos:
  - repo: https://github.com/adrienverge/yamllint
    rev: v1.35.1
    hooks:
      - id: yamllint
        args: [-c, .yamllint.yml]

  - repo: https://github.com/ansible/ansible-lint
    rev: v24.10.0
    hooks:
      - id: ansible-lint
```

Pre-commit runs hooks in order, so yamllint runs first and blocks the commit if there are YAML syntax issues.

## Handling ansible-lint and yamllint Overlap

ansible-lint includes its own YAML checking via the `yaml` rule tag. To avoid duplicate warnings, you have two options:

### Option A: Disable yamllint Rules in ansible-lint

Let yamllint handle all YAML checks and disable the overlapping rules in ansible-lint:

```yaml
# .ansible-lint - Disable YAML rules handled by yamllint
---
profile: moderate

skip_list:
  - yaml  # Let yamllint handle all YAML formatting
```

### Option B: Rely on ansible-lint Only

If you prefer a single tool, skip yamllint and let ansible-lint's built-in YAML checks handle everything:

```yaml
# .ansible-lint - ansible-lint handles YAML too
---
profile: moderate
# No skip for yaml rules
```

I recommend Option A because yamllint is faster and more configurable for pure YAML checks.

## CI Pipeline Example

Here is a GitHub Actions workflow that runs both linters:

```yaml
# .github/workflows/lint.yml - CI linting pipeline
---
name: Lint Ansible
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Check out code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install linters
        run: pip install yamllint ansible-lint

      - name: Run yamllint
        run: yamllint -c .yamllint.yml .

      - name: Run ansible-lint
        run: ansible-lint
```

## Common Issues

**Issue: yamllint flags Jinja2 expressions as invalid YAML.**

yamllint does not understand Jinja2. If you have raw Jinja2 in your YAML files (outside of string values), yamllint might complain. The solution is to always quote Jinja2 expressions:

```yaml
# This might confuse yamllint
key: {{ value }}

# This is correct YAML and yamllint-safe
key: "{{ value }}"
```

**Issue: yamllint flags Ansible vault-encrypted files.**

Vault-encrypted files are not valid YAML. Exclude them:

```yaml
# .yamllint.yml
ignore: |
  *vault*.yml
  *.encrypted
```

yamllint and ansible-lint together form a solid foundation for Ansible code quality. yamllint handles the structural and formatting aspects of YAML, while ansible-lint focuses on Ansible-specific best practices. Set them both up early in your project and you will avoid many headaches down the road.
