# How to Document Custom Ansible Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Documentation, Module Development, Python

Description: Write comprehensive documentation for custom Ansible modules using DOCUMENTATION, EXAMPLES, and RETURN docstrings.

---

Documentation makes the difference between a module only you can use and one your whole team can use. Ansible uses three special strings: DOCUMENTATION, EXAMPLES, and RETURN.

## DOCUMENTATION String

This YAML string describes the module and its options:

```python
DOCUMENTATION = r"""
---
module: my_module
short_description: Manage my resources
version_added: '1.0.0'
description:
    - Create, update, and delete resources.
options:
    name:
        description: Resource name.
        required: true
        type: str
    state:
        description: Desired state.
        default: present
        choices: ['present', 'absent']
        type: str
author:
    - Your Name (@github)
"""
```

## EXAMPLES String

```python
EXAMPLES = r"""
- name: Create resource
  my_module:
    name: test
    state: present

- name: Delete resource
  my_module:
    name: test
    state: absent
"""
```

## RETURN String

```python
RETURN = r"""
resource:
    description: Resource details.
    type: dict
    returned: when state is present
    contains:
        id:
            description: Unique ID.
            type: str
            sample: 'abc-123'
msg:
    description: Result message.
    type: str
    returned: always
"""
```

## Viewing Documentation

```bash
ansible-doc -t module my_module
```

## Validating

```bash
ansible-test sanity --test validate-modules
```

## Key Takeaways

Always write all three documentation strings. Include all options with descriptions, types, and defaults. Provide realistic examples. Document every return value. Validate with ansible-doc.
