# How to Handle Complex Arguments in Ansible Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Arguments, Module Development, Python

Description: Handle complex argument types like nested dictionaries and lists of dicts in custom Ansible modules.

---

Complex modules need nested structures, lists of objects, and conditional requirements.

## Nested Dictionaries with Suboptions

```python
module_args = dict(
    connection=dict(
        type='dict',
        required=True,
        options=dict(
            host=dict(type='str', required=True),
            port=dict(type='int', default=443),
            auth=dict(
                type='dict',
                options=dict(
                    username=dict(type='str', required=True),
                    password=dict(type='str', no_log=True, required=True),
                ),
            ),
        ),
    ),
)
```

## Lists of Dictionaries

```python
module_args = dict(
    rules=dict(
        type='list',
        elements='dict',
        default=[],
        options=dict(
            name=dict(type='str', required=True),
            port=dict(type='int', required=True),
            protocol=dict(type='str', default='tcp', choices=['tcp', 'udp']),
            action=dict(type='str', default='allow', choices=['allow', 'deny']),
        ),
    ),
)
```

Usage:

```yaml
- my_module:
    rules:
      - name: ssh
        port: 22
        action: allow
      - name: http
        port: 80
        action: allow
```

## Conditional Requirements

```python
module = AnsibleModule(
    argument_spec=module_args,
    required_if=[
        ('auth_type', 'password', ['username', 'password']),
        ('auth_type', 'token', ['api_token']),
        ('auth_type', 'certificate', ['cert_path', 'key_path']),
    ],
)
```

## Key Takeaways

Use suboptions for nested dicts. Use elements='dict' with options for lists of structured objects. Use required_if for conditional parameter requirements. This provides automatic validation and helpful error messages.
