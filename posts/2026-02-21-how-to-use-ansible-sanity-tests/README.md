# How to Use Ansible Sanity Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, Sanity Tests, Collections, Quality

Description: Learn how to run Ansible sanity tests to validate code quality, documentation, and compliance with Ansible standards for collections and modules.

---

Ansible sanity tests are a built-in quality gate that checks your Ansible code for common problems. They validate everything from Python syntax and import errors to documentation formatting and GPL license headers. If you are building Ansible collections or custom modules, sanity tests are the first line of defense against shipping broken code.

I started using sanity tests after I shipped a custom module that worked perfectly on Python 3.9 but crashed on Python 3.6 because I used an f-string. Sanity tests would have caught that in seconds.

## What Are Sanity Tests?

Sanity tests are automated checks that come bundled with `ansible-test`, the testing framework included with Ansible. Unlike unit tests that validate logic, or integration tests that validate behavior, sanity tests validate code quality and standards compliance.

They check things like:

- Python syntax validity across multiple Python versions
- Import errors and missing dependencies
- PEP 8 style compliance
- Documentation formatting
- YAML syntax in plugin metadata
- Forbidden patterns and deprecated features
- License headers

## Setting Up Your Environment

First, make sure you have `ansible-test` available. It ships with `ansible-core`:

```bash
# Install ansible-core which includes ansible-test
pip install ansible-core

# Verify ansible-test is available
ansible-test --version
```

Your collection needs to follow the standard directory structure:

```
ansible_collections/
  myorg/
    mycollection/
      galaxy.yml
      plugins/
        modules/
          my_module.py
        module_utils/
          helper.py
      roles/
      tests/
        sanity/
          ignore-2.16.txt
```

## Running Sanity Tests

Navigate to your collection root and run all sanity tests:

```bash
# Run all sanity tests against the collection
cd ansible_collections/myorg/mycollection
ansible-test sanity --docker
```

The `--docker` flag runs tests in a container so you do not pollute your local environment. You can also target specific Python versions:

```bash
# Run sanity tests for specific Python versions
ansible-test sanity --docker --python 3.10
ansible-test sanity --docker --python 3.11
ansible-test sanity --docker --python 3.12
```

Run a specific test by name:

```bash
# Run only the pylint sanity test
ansible-test sanity --test pylint --docker

# Run only the import test
ansible-test sanity --test import --docker

# Run only the validate-modules test
ansible-test sanity --test validate-modules --docker
```

## Common Sanity Test Categories

### Import Tests

These verify that your modules can be imported without errors on all supported Python versions:

```bash
# Run import tests to catch missing dependencies
ansible-test sanity --test import --docker
```

If your module has an optional dependency, handle the import gracefully:

```python
# plugins/modules/my_module.py
# Handle optional dependency import for sanity test compliance
try:
    import boto3
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False

from ansible.module_utils.basic import AnsibleModule

def main():
    module = AnsibleModule(
        argument_spec=dict(
            bucket=dict(type='str', required=True),
        ),
    )

    if not HAS_BOTO3:
        module.fail_json(msg="boto3 is required for this module. Install it with: pip install boto3")

    # Module logic here
    module.exit_json(changed=False)

if __name__ == '__main__':
    main()
```

### Validate-Modules Tests

This test checks that your module documentation, examples, and return values are properly formatted:

```python
# plugins/modules/my_module.py
# Module with proper documentation for validate-modules compliance

DOCUMENTATION = r'''
---
module: my_module
short_description: Manage my custom resource
version_added: "1.0.0"
description:
    - Create, update, or delete a custom resource.
    - Supports check mode for dry-run operations.
options:
    name:
        description:
            - Name of the resource to manage.
        required: true
        type: str
    state:
        description:
            - Desired state of the resource.
        choices: ['present', 'absent']
        default: present
        type: str
author:
    - Your Name (@yourgithub)
'''

EXAMPLES = r'''
- name: Create a resource
  myorg.mycollection.my_module:
    name: test-resource
    state: present

- name: Remove a resource
  myorg.mycollection.my_module:
    name: test-resource
    state: absent
'''

RETURN = r'''
resource_id:
    description: The ID of the managed resource.
    returned: success
    type: str
    sample: "res-123abc"
'''
```

### PEP 8 Tests

These enforce Python style guidelines:

```bash
# Run PEP 8 style tests
ansible-test sanity --test pep8 --docker
```

Common PEP 8 fixes you will need:

```python
# BAD: line too long, missing whitespace
# result=some_function(arg1,arg2,really_long_argument_name,another_long_one)

# GOOD: properly formatted with line breaks
result = some_function(
    arg1,
    arg2,
    really_long_argument_name,
    another_long_one,
)
```

### YAML Lint Tests

These check YAML files in your collection for syntax issues:

```bash
# Run yamllint tests on all YAML files
ansible-test sanity --test yamllint --docker
```

### Compile Tests

These verify your Python code compiles on all supported Python versions:

```bash
# Run compile tests across Python versions
ansible-test sanity --test compile --docker
```

## Using Ignore Files

Sometimes you need to suppress specific test failures. Ansible supports ignore files for each version:

```
# tests/sanity/ignore-2.16.txt
# Format: path test-name [optional message]
# Ignore a specific pylint warning for a specific file
plugins/modules/legacy_module.py pylint:no-member  # third-party library issue
plugins/module_utils/compat.py import  # optional dependency
```

Create ignore files only when necessary. Each entry should have a comment explaining why it is needed.

## Running Sanity Tests in CI

Here is a GitHub Actions workflow that runs sanity tests:

```yaml
# .github/workflows/sanity.yml
# Run Ansible sanity tests on every push and PR
name: Ansible Sanity Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  sanity:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12']
    steps:
      - uses: actions/checkout@v4
        with:
          path: ansible_collections/myorg/mycollection

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install ansible-core
        run: pip install ansible-core

      - name: Run sanity tests
        working-directory: ansible_collections/myorg/mycollection
        run: |
          ansible-test sanity --docker \
            --python ${{ matrix.python-version }} \
            --color \
            -v
```

## Listing Available Sanity Tests

See all available sanity tests for your version of Ansible:

```bash
# List all available sanity tests
ansible-test sanity --list-tests
```

Common tests you will see include: `compile-test`, `import`, `pep8`, `pylint`, `validate-modules`, `yamllint`, `no-wildcard-import`, `no-basestring`, `no-dict-iteritems`, and `metaclass-boilerplate`.

## Practical Tips

Run sanity tests early and often during development. They execute in seconds and catch issues that would be painful to debug later. I run them as a pre-commit hook:

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Run sanity tests before every commit
cd ansible_collections/myorg/mycollection

echo "Running Ansible sanity tests..."
if ! ansible-test sanity --test compile --test import --test pep8 2>/dev/null; then
    echo "Sanity tests failed. Fix issues before committing."
    exit 1
fi

echo "Sanity tests passed."
```

## Conclusion

Ansible sanity tests are the minimum quality bar for any collection or module. They catch syntax errors, import problems, documentation issues, and style violations across multiple Python versions. Run them locally during development, in CI on every pull request, and as a pre-commit hook. The feedback loop is fast enough that there is no excuse to skip them.
