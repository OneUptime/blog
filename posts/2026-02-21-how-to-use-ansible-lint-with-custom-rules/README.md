# How to Use ansible-lint with Custom Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-lint, Custom Rules, Code Quality

Description: Learn how to create and use custom ansible-lint rules to enforce your organization's specific Ansible coding standards and conventions.

---

The built-in rules in ansible-lint cover general best practices, but every team has its own standards. Maybe you require all tasks to have specific tags, or you prohibit certain modules in production playbooks, or you enforce a naming convention for variables. Custom rules let you encode these team-specific requirements into automated checks.

In this post, we will walk through creating custom ansible-lint rules from scratch, registering them with ansible-lint, and using them alongside the built-in rules.

## How ansible-lint Rules Work

Each ansible-lint rule is a Python class that extends `AnsibleLintRule`. The class defines what to check and how to report violations. Rules can inspect tasks, plays, playbooks, roles, or raw YAML content.

Here is the basic structure:

```python
# custom_rules/my_rule.py - Skeleton for a custom rule
"""Custom rule for ansible-lint."""
from ansiblelint.rules import AnsibleLintRule


class MyCustomRule(AnsibleLintRule):
    """Short description of the rule."""

    id = "custom-001"
    description = "Longer description of what this rule checks."
    severity = "MEDIUM"
    tags = ["custom", "style"]
    version_added = "1.0.0"

    def matchtask(self, task, file=None):
        """Check each task. Return a message string if there is a violation."""
        # Return False or empty string for no violation
        # Return a string message for a violation
        return False
```

## Setting Up Your Custom Rules Directory

Create a directory for your custom rules and tell ansible-lint where to find them.

```bash
# Create the rules directory in your project
mkdir -p custom_rules
```

Then reference it in your `.ansible-lint` configuration:

```yaml
# .ansible-lint - Point to custom rules directory
---
profile: moderate

rulesdir:
  - ./custom_rules/
```

## Example 1: Require Tags on All Tasks

This rule ensures every task has at least one tag defined. Tags are essential for running subsets of a playbook.

```python
# custom_rules/require_tags.py - Ensure all tasks have tags
"""Rule to require tags on all tasks."""
from ansiblelint.rules import AnsibleLintRule


class RequireTagsRule(AnsibleLintRule):
    """All tasks must have at least one tag."""

    id = "custom-tags-required"
    description = (
        "Every task must include at least one tag to support "
        "selective execution with --tags and --skip-tags."
    )
    severity = "MEDIUM"
    tags = ["custom", "tags"]

    def matchtask(self, task, file=None):
        """Check if the task has tags defined."""
        # Skip meta tasks and handlers
        if task.get("action", {}).get("__ansible_module__") == "meta":
            return False

        # Check for tags
        tags = task.get("tags", [])
        if not tags:
            return "Task is missing tags"

        return False
```

## Example 2: Prohibit Specific Modules

Some teams ban certain modules in production. For instance, you might prohibit `ansible.builtin.shell` in favor of specific modules, or ban `ansible.builtin.raw` entirely.

```python
# custom_rules/banned_modules.py - Prohibit specific modules
"""Rule to ban certain Ansible modules."""
from ansiblelint.rules import AnsibleLintRule


BANNED_MODULES = {
    "ansible.builtin.raw": "Use a specific module instead of raw.",
    "community.general.telegram": "Use our internal notification module.",
    "ansible.builtin.pause": "Interactive pauses are not allowed in CI.",
}


class BannedModulesRule(AnsibleLintRule):
    """Certain modules are not allowed in this project."""

    id = "custom-banned-modules"
    description = "Prohibits the use of specific Ansible modules."
    severity = "HIGH"
    tags = ["custom", "modules"]

    def matchtask(self, task, file=None):
        """Check if the task uses a banned module."""
        module = task.get("action", {}).get("__ansible_module_original__", "")

        # Also check the resolved FQCN
        fqcn = task.get("action", {}).get("__ansible_module__", "")

        for banned, reason in BANNED_MODULES.items():
            if module == banned or fqcn == banned:
                return f"Module '{banned}' is banned: {reason}"

        return False
```

## Example 3: Enforce Variable Naming Convention

Many teams adopt a naming convention for variables, like prefixing role variables with the role name.

```python
# custom_rules/variable_naming.py - Enforce variable naming conventions
"""Rule to enforce variable naming standards."""
import re
from ansiblelint.rules import AnsibleLintRule


class VariableNamingRule(AnsibleLintRule):
    """Variables must use snake_case and start with a letter."""

    id = "custom-var-naming"
    description = (
        "All variables must use snake_case naming convention "
        "and must start with a lowercase letter."
    )
    severity = "LOW"
    tags = ["custom", "naming"]

    # Pattern for valid variable names
    VALID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")

    # Variables to ignore (Ansible built-ins)
    IGNORE_VARS = {
        "ansible_become",
        "ansible_become_user",
        "ansible_connection",
        "ansible_host",
        "ansible_user",
        "ansible_python_interpreter",
        "item",
    }

    def matchtask(self, task, file=None):
        """Check set_fact and vars for naming violations."""
        module = task.get("action", {}).get("__ansible_module__", "")

        if module == "ansible.builtin.set_fact":
            action_data = task.get("action", {})
            for key in action_data:
                if key.startswith("__") or key in ("_raw_params", "cacheable"):
                    continue
                if key not in self.IGNORE_VARS and not self.VALID_PATTERN.match(key):
                    return (
                        f"Variable '{key}' does not follow snake_case convention"
                    )

        return False
```

## Example 4: Require become_user When become Is True

This rule ensures that whenever `become: true` is set, `become_user` is also explicitly specified.

```python
# custom_rules/explicit_become_user.py - Require become_user with become
"""Rule to require explicit become_user."""
from ansiblelint.rules import AnsibleLintRule


class ExplicitBecomeUserRule(AnsibleLintRule):
    """When using become, always specify become_user explicitly."""

    id = "custom-explicit-become-user"
    description = (
        "Tasks and plays using become: true must also specify "
        "become_user to make the intended privilege level clear."
    )
    severity = "MEDIUM"
    tags = ["custom", "security"]

    def matchtask(self, task, file=None):
        """Check tasks for become without become_user."""
        become = task.get("become", False)
        become_user = task.get("become_user")

        if become and not become_user:
            return "Task has 'become: true' but no 'become_user' specified"

        return False

    def matchplay(self, file, data):
        """Check plays for become without become_user."""
        results = []
        if isinstance(data, dict):
            become = data.get("become", False)
            become_user = data.get("become_user")

            if become and not become_user:
                results.append(
                    self.create_matcherror(
                        message="Play has 'become: true' but no 'become_user' specified",
                        filename=file,
                    )
                )
        return results
```

## Example 5: Check for Hardcoded Secrets

This rule scans for common patterns that suggest hardcoded passwords or API keys.

```python
# custom_rules/no_hardcoded_secrets.py - Detect hardcoded secrets
"""Rule to detect potential hardcoded secrets."""
import re
from ansiblelint.rules import AnsibleLintRule


class NoHardcodedSecretsRule(AnsibleLintRule):
    """Tasks should not contain hardcoded passwords or API keys."""

    id = "custom-no-secrets"
    description = "Detects potential hardcoded secrets in task definitions."
    severity = "HIGH"
    tags = ["custom", "security"]

    SECRET_PATTERNS = [
        re.compile(r"password\s*[:=]\s*['\"][^{'\"]+'", re.IGNORECASE),
        re.compile(r"api_key\s*[:=]\s*['\"][^{'\"]+'", re.IGNORECASE),
        re.compile(r"secret\s*[:=]\s*['\"][^{'\"]+'", re.IGNORECASE),
        re.compile(r"token\s*[:=]\s*['\"][A-Za-z0-9+/=]{20,}", re.IGNORECASE),
    ]

    def matchlines(self, file, text):
        """Scan raw file content for secret patterns."""
        results = []
        for line_num, line in enumerate(text.splitlines(), start=1):
            # Skip lines that reference vault or variables
            if "vault_" in line or "{{" in line or "lookup(" in line:
                continue

            for pattern in self.SECRET_PATTERNS:
                if pattern.search(line):
                    results.append(
                        self.create_matcherror(
                            message="Possible hardcoded secret detected",
                            filename=file,
                            linenumber=line_num,
                        )
                    )
                    break

        return results
```

## Testing Your Custom Rules

Create a test playbook with known violations to verify your rules work:

```yaml
# test_custom_rules.yml - Playbook with intentional violations
---
- name: Test custom rules
  hosts: localhost
  become: true
  # Missing become_user - should trigger custom-explicit-become-user
  tasks:
    # Missing tags - should trigger custom-tags-required
    - name: A task without tags
      ansible.builtin.debug:
        msg: "no tags here"

    # Banned module - should trigger custom-banned-modules
    - name: Using a banned module
      ansible.builtin.raw: echo "this is banned"
      tags:
        - test

    # Bad variable name - should trigger custom-var-naming
    - name: Set a variable with bad naming
      ansible.builtin.set_fact:
        MyBadVariable: "oops"
      tags:
        - test
```

Run the linter and check the output:

```bash
# Run ansible-lint with your custom rules
ansible-lint -c .ansible-lint test_custom_rules.yml

# You should see output like:
# custom-tags-required: Task is missing tags
# test_custom_rules.yml:7
#
# custom-banned-modules: Module 'ansible.builtin.raw' is banned
# test_custom_rules.yml:12
#
# custom-var-naming: Variable 'MyBadVariable' does not follow snake_case
# test_custom_rules.yml:18
```

## Sharing Custom Rules Across Projects

Package your custom rules as a Python package so multiple projects can use them:

```bash
# Directory structure for a shareable rules package
my-ansible-lint-rules/
  setup.py
  my_lint_rules/
    __init__.py
    require_tags.py
    banned_modules.py
    variable_naming.py
```

```python
# setup.py - Package your rules for pip installation
from setuptools import setup, find_packages

setup(
    name="my-ansible-lint-rules",
    version="1.0.0",
    packages=find_packages(),
    install_requires=["ansible-lint>=6.0.0"],
    entry_points={
        "ansible_lint.rules": [
            "my_rules = my_lint_rules",
        ],
    },
)
```

Install the package and ansible-lint will automatically discover the rules:

```bash
pip install ./my-ansible-lint-rules
```

Custom rules let you turn your team's tribal knowledge into automated checks. Start with the most common issues you see in code reviews and add rules gradually. Over time, you will build a comprehensive set of checks that makes your Ansible code consistently high quality.
