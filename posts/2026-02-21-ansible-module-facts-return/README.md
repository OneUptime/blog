# How to Use Ansible Module with Facts Return

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Facts, Module Development, Python

Description: Create custom Ansible modules that return facts using ansible_facts for automatic variable registration.

---

Modules can return facts that become available as host variables without using register.

## Returning Facts

```python
def run_module():
    module = AnsibleModule(argument_spec=dict())

    # Gather custom facts
    facts = {
        'my_app_version': get_app_version(),
        'my_app_port': get_app_port(),
        'my_app_status': get_app_status(),
    }

    module.exit_json(
        changed=False,
        ansible_facts=facts,
    )
```

Facts are accessible immediately:

```yaml
- name: Gather app facts
  my_facts_module:

- name: Use the facts (no register needed)
  ansible.builtin.debug:
    msg: "App version: {{ my_app_version }}, Port: {{ my_app_port }}"
```

## Namespacing Facts

Prefix facts to avoid conflicts:

```python
facts = {
    'myapp_version': '2.1.0',
    'myapp_config': {
        'port': 8080,
        'workers': 4,
    },
}
```

## Combining Facts with Changes

```python
module.exit_json(
    changed=True,
    msg='Configuration updated',
    ansible_facts={'myapp_config_version': new_version},
)
```

## Key Takeaways

Return facts in the ansible_facts key for automatic variable registration. Prefix facts to avoid name conflicts. Facts modules typically return changed=False since they only gather information.
