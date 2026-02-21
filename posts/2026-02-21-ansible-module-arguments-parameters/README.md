# How to Define Module Arguments and Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Module Arguments, Module Development, Python

Description: Define and validate module arguments in custom Ansible modules with type checking, defaults, choices, and validation rules.

---

Arguments define what users pass to your module. Proper argument definition provides validation, type checking, default values, and helpful error messages.

## Argument Types

Ansible supports many argument types:

```python
module_args = dict(
    # String (required)
    name=dict(type='str', required=True),
    # String with choices
    state=dict(type='str', default='present', choices=['present', 'absent']),
    # Boolean
    enabled=dict(type='bool', default=True),
    # Integer
    port=dict(type='int', default=8080),
    # Float
    threshold=dict(type='float', default=0.95),
    # List of strings
    tags=dict(type='list', elements='str', default=[]),
    # Dictionary
    config=dict(type='dict', default={}),
    # Path (validated)
    path=dict(type='path'),
    # Password (sensitive)
    password=dict(type='str', no_log=True),
)
```

## Complex Validation

```python
module = AnsibleModule(
    argument_spec=module_args,
    # If state=present, name and config are required
    required_if=[
        ('state', 'present', ['name', 'config']),
    ],
    # Cannot specify both force and safe_mode
    mutually_exclusive=[
        ('force', 'safe_mode'),
    ],
    # username and password must be provided together
    required_together=[
        ('username', 'password'),
    ],
    # At least one must be provided
    required_one_of=[
        ('name', 'id'),
    ],
    supports_check_mode=True,
)
```

## Nested Arguments (Suboptions)

For structured configuration:

```python
module_args = dict(
    connection=dict(
        type='dict',
        required=True,
        options=dict(
            host=dict(type='str', required=True),
            port=dict(type='int', default=443),
            username=dict(type='str', required=True),
            password=dict(type='str', no_log=True, required=True),
        ),
    ),
)
```

Usage:

```yaml
- name: Use nested args
  my_module:
    connection:
      host: api.example.com
      port: 443
      username: admin
      password: secret
```

## Aliases

Allow alternative parameter names:

```python
module_args = dict(
    name=dict(type='str', required=True, aliases=['hostname', 'server']),
)
```

## Default Values

Defaults can be static values or computed:

```python
module_args = dict(
    workers=dict(type='int', default=4),
    log_dir=dict(type='path', default='/var/log/myapp'),
    enabled=dict(type='bool', default=True),
)
```

## Key Takeaways

Use specific types for automatic validation. Use choices to restrict values. Use no_log for sensitive parameters. Use required_if, mutually_exclusive, and required_together for complex rules. Define suboptions for nested dictionary arguments. Provide sensible defaults where possible.
