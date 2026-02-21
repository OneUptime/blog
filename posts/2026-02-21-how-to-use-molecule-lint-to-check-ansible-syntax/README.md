# How to Use Molecule lint to Check Ansible Syntax

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Linting, Code Quality, DevOps

Description: Configure and use linting in Molecule to catch Ansible syntax errors, style issues, and best practice violations before running tests.

---

Catching errors before your playbook even runs saves a lot of time. Linting in Molecule checks your Ansible code for syntax errors, style violations, deprecated features, and security issues. It runs before any instances are created, so you get fast feedback on problems you can fix immediately. This post covers how to configure linting in Molecule, what the linters check for, and how to customize the rules for your project.

## How Linting Works in Molecule

Molecule's lint configuration runs external linting tools against your role files. The two main linters used with Ansible are:

- **ansible-lint** - Checks for Ansible-specific best practices, deprecated syntax, and common mistakes
- **yamllint** - Checks YAML formatting, indentation, line length, and structure

Both need to be installed separately.

```bash
# Install linting tools
pip install ansible-lint yamllint
```

## Configuring Lint in molecule.yml

In recent versions of Molecule (6+), linting is configured as a shell command in the `lint` key of `molecule.yml`.

```yaml
# molecule/default/molecule.yml - lint configuration
lint: |
  set -e
  yamllint .
  ansible-lint .
```

The `set -e` ensures the lint step fails if any linter reports an error. Each line is a shell command that runs sequentially.

For older Molecule versions, lint was configured differently.

```yaml
# Old-style lint config (Molecule < 4)
lint:
  name: yamllint
  options:
    config-file: .yamllint
```

The newer shell command approach is more flexible because you can run any combination of tools.

## Configuring yamllint

yamllint checks YAML formatting. Create a `.yamllint` configuration file in your role's root directory.

```yaml
# .yamllint - YAML linting rules
extends: default

rules:
  # Allow long lines for Ansible tasks with long module parameters
  line-length:
    max: 160
    level: warning

  # Allow truthy values that Ansible uses (yes/no, true/false)
  truthy:
    allowed-values: ['true', 'false', 'yes', 'no']

  # Require consistent indentation
  indentation:
    spaces: 2
    indent-sequences: true

  # Allow comments without a space after the #
  comments:
    require-starting-space: true
    min-spaces-from-content: 1

  # Do not require document start markers
  document-start: disable

  # Do not require document end markers
  document-end: disable

  # Bracket formatting
  brackets:
    min-spaces-inside: 0
    max-spaces-inside: 0

  # Brace formatting
  braces:
    min-spaces-inside: 0
    max-spaces-inside: 1
```

Run yamllint standalone to test your configuration.

```bash
# Lint all YAML files in the current directory
yamllint .

# Lint specific files
yamllint tasks/main.yml defaults/main.yml

# Show only errors (not warnings)
yamllint -s .
```

## Configuring ansible-lint

ansible-lint checks for Ansible-specific issues. Create a `.ansible-lint` configuration file.

```yaml
# .ansible-lint - Ansible linting rules
profile: moderate  # options: min, basic, moderate, safety, shared, production

# Paths to exclude from linting
exclude_paths:
  - .cache/
  - .github/
  - molecule/
  - .venv/

# Rules to skip
skip_list:
  - yaml[line-length]    # handled by yamllint
  - no-changed-when      # sometimes command modules legitimately change state
  - risky-shell-pipe     # allow piped shell commands

# Enable optional rules
enable_list:
  - no-log-password      # warn about passwords in logs
  - no-same-owner        # warn about file ownership

# Treat warnings as errors in CI
strict: false

# Use FQCN for all modules
use_default_rules: true
```

Run ansible-lint standalone.

```bash
# Lint the current directory
ansible-lint .

# Lint specific playbooks
ansible-lint tasks/main.yml

# Show all rules
ansible-lint -L

# Show rules with descriptions
ansible-lint -R

# Only check specific rules
ansible-lint -R -r no-changed-when .
```

## Common ansible-lint Rules

Here are the rules you will encounter most often, with examples of what triggers them and how to fix them.

### FQCN (Fully Qualified Collection Name)

```yaml
# Bad: triggers fqcn[action-core] rule
- name: Install nginx
  apt:
    name: nginx
    state: present

# Good: uses fully qualified module name
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
```

### no-changed-when

```yaml
# Bad: triggers no-changed-when rule
- name: Check application version
  ansible.builtin.command:
    cmd: myapp --version

# Good: explicitly state when the task changes state
- name: Check application version
  ansible.builtin.command:
    cmd: myapp --version
  changed_when: false
```

### name[missing]

```yaml
# Bad: task without a name
- ansible.builtin.apt:
    name: nginx
    state: present

# Good: every task has a descriptive name
- name: Install nginx web server
  ansible.builtin.apt:
    name: nginx
    state: present
```

### risky-file-permissions

```yaml
# Bad: creates a file without explicit permissions
- name: Create config file
  ansible.builtin.copy:
    src: myapp.conf
    dest: /etc/myapp/myapp.conf

# Good: explicit file permissions
- name: Create config file
  ansible.builtin.copy:
    src: myapp.conf
    dest: /etc/myapp/myapp.conf
    mode: '0644'
    owner: root
    group: root
```

### jinja[spacing]

```yaml
# Bad: no spaces inside Jinja2 braces
- name: Show a variable
  ansible.builtin.debug:
    msg: "{{myvar}}"

# Good: spaces inside braces
- name: Show a variable
  ansible.builtin.debug:
    msg: "{{ myvar }}"
```

## Running Lint in Molecule

With both linters configured, run them through Molecule.

```bash
# Run only the lint step
molecule lint

# Or as part of the full test sequence
molecule test
```

The lint step runs before instances are created, so it is fast. If lint fails, Molecule stops and does not proceed to create instances.

## Inline Rule Skipping

Sometimes a specific line legitimately needs to violate a rule. You can skip rules inline.

```yaml
# Skip a specific rule for one task
- name: Run database migration script  # noqa: no-changed-when
  ansible.builtin.command:
    cmd: /opt/app/migrate.sh

# Skip multiple rules
- name: Quick and dirty fix  # noqa: risky-shell-pipe no-changed-when
  ansible.builtin.shell:
    cmd: cat /proc/cpuinfo | grep processor | wc -l
```

## Custom Lint Script

For more complex linting needs, create a dedicated lint script.

```bash
#!/bin/bash
# lint.sh - comprehensive linting script
set -e

echo "=== Running yamllint ==="
yamllint -c .yamllint .

echo "=== Running ansible-lint ==="
ansible-lint .

echo "=== Checking for hardcoded passwords ==="
if grep -rn "password:" defaults/ vars/ tasks/ --include="*.yml" | grep -v "vault_" | grep -v "lookup" | grep -v "#"; then
  echo "WARNING: Possible hardcoded passwords found"
  exit 1
fi

echo "=== Checking for use of deprecated modules ==="
if grep -rn "include:" tasks/ --include="*.yml" | grep -v "include_tasks" | grep -v "include_role" | grep -v "#"; then
  echo "WARNING: Use include_tasks instead of include"
  exit 1
fi

echo "=== All checks passed ==="
```

Reference it in molecule.yml.

```yaml
# molecule/default/molecule.yml - use custom lint script
lint: |
  bash lint.sh
```

## Pre-commit Integration

For catching issues even earlier, integrate linting with Git pre-commit hooks.

```yaml
# .pre-commit-config.yaml - lint on every commit
repos:
  - repo: https://github.com/adrienverge/yamllint
    rev: v1.33.0
    hooks:
      - id: yamllint
        args: [-c, .yamllint]

  - repo: https://github.com/ansible/ansible-lint
    rev: v6.22.0
    hooks:
      - id: ansible-lint
        additional_dependencies:
          - ansible-core>=2.15
```

Install the pre-commit hooks.

```bash
pip install pre-commit
pre-commit install
```

Now linting runs automatically before every commit.

## CI Pipeline Integration

Run lint as a separate CI job for faster feedback.

```yaml
# .github/workflows/lint.yml - lint job in CI
name: Ansible Lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: pip install ansible-core ansible-lint yamllint

      - name: Run yamllint
        run: yamllint .

      - name: Run ansible-lint
        run: ansible-lint .
```

Since linting does not need Docker or any test infrastructure, it runs in seconds and provides immediate feedback.

## Handling False Positives

Sometimes linters flag things that are intentional. Here is how to handle them:

1. **Skip specific rules globally** in `.ansible-lint` if they do not apply to your project.
2. **Skip rules inline** with `# noqa: rule-name` for specific tasks that are exceptions.
3. **Adjust yamllint rules** in `.yamllint` to match your team's style preferences.
4. **Do not disable all rules.** Resist the urge to skip everything that fails. Most rules exist for good reasons.

## Tips

1. **Run lint first, always.** Fix lint issues before running converge. It saves time because lint takes seconds while converge takes minutes.

2. **Start with the moderate profile.** The `moderate` ansible-lint profile catches important issues without being overly strict. Move to `production` when your team is comfortable.

3. **Fix warnings gradually.** Start by fixing errors, then work on warnings over time. Do not try to fix everything at once on a large codebase.

4. **Agree on rules as a team.** Linting works best when everyone follows the same rules. Check your lint configuration into version control.

5. **Keep linters updated.** New versions of ansible-lint add rules for newly discovered anti-patterns. Update regularly to catch more issues.

Linting is the cheapest form of testing you can do. It catches real bugs with zero infrastructure cost and near-instant feedback. Make it a habit and your Ansible code will be better for it.
