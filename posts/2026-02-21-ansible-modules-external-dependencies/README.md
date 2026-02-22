# How to Create Ansible Modules with External Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Dependencies, Module Development, Python

Description: Handle external Python library dependencies in custom Ansible modules with proper import checking.

---

Custom modules often need external Python libraries. Handle missing dependencies gracefully with helpful error messages.

## Import Pattern

```python
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    import boto3
    from botocore.exceptions import ClientError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False

def run_module():
    module = AnsibleModule(argument_spec=module_args)

    if not HAS_REQUESTS:
        module.fail_json(
            msg='The requests library is required. '
                'Install it with: pip install requests'
        )

    if not HAS_BOTO3:
        module.fail_json(
            msg='boto3 and botocore are required. '
                'Install with: pip install boto3'
        )

    # Safe to use the libraries now
    response = requests.get(url)
```

## Documenting Requirements

```python
DOCUMENTATION = r"""
module: my_module
requirements:
    - requests >= 2.25.0
    - boto3 >= 1.20.0
notes:
    - Install dependencies with pip install requests boto3
"""
```

## Using missing_required_lib

```python
from ansible.module_utils.basic import AnsibleModule, missing_required_lib

try:
    import requests
    HAS_REQUESTS = True
    REQUESTS_IMPORT_ERROR = None
except ImportError:
    HAS_REQUESTS = False
    REQUESTS_IMPORT_ERROR = traceback.format_exc()

def run_module():
    module = AnsibleModule(argument_spec=module_args)
    if not HAS_REQUESTS:
        module.fail_json(
            msg=missing_required_lib('requests'),
            exception=REQUESTS_IMPORT_ERROR,
        )
```

## Key Takeaways

Always check for imports at module load time. Use try/except to catch ImportError. Provide clear installation instructions in the error message. Document requirements in the DOCUMENTATION string.
