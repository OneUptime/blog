# How to Handle Module Return Values in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Return Values, Module Development, Python

Description: Define and document return values from custom Ansible modules for consistent output that playbooks can register and use.

---

Return values communicate results back to the playbook. Well-defined return values let users register output and use it in subsequent tasks.

## Basic Return Values

```python
def run_module():
    module = AnsibleModule(argument_spec=module_args)

    # Do work...
    resource = create_resource(module.params['name'])

    module.exit_json(
        changed=True,
        msg='Resource created',
        resource=dict(
            id=resource['id'],
            name=resource['name'],
            status='active',
        ),
    )
```

## Using Return Values in Playbooks

```yaml
- name: Create resource
  my_module:
    name: test
    state: present
  register: result

- name: Use the ID
  ansible.builtin.debug:
    msg: "ID: {{ result.resource.id }}"

- name: Conditional on status
  ansible.builtin.debug:
    msg: "Active!"
  when: result.resource.status == 'active'
```

## Standard Return Keys

Always include these:

```python
module.exit_json(
    changed=True,           # Required: were changes made?
    msg='Success message',  # Recommended: human message
    diff=dict(              # For diff mode
        before={},
        after={},
    ),
    warnings=[],            # Non-fatal warnings
)
```

## Returning Facts

Return facts that become host variables:

```python
module.exit_json(
    changed=False,
    ansible_facts=dict(
        my_app_version='2.1.0',
        my_app_port=8080,
    ),
)
```

## RETURN Documentation

Document every return value:

```python
RETURN = r"""
resource:
    description: Resource details
    type: dict
    returned: when state is present
    contains:
        id:
            description: Unique ID
            type: str
            sample: 'abc-123'
        name:
            description: Resource name
            type: str
msg:
    description: Result message
    type: str
    returned: always
"""
```

## Key Takeaways

Always return changed status. Include structured data that playbooks can reference. Document every return value in the RETURN string. Use ansible_facts for values that should become host variables automatically.
