# How to Use Check Mode in Custom Ansible Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Check Mode, Module Development, Dry Run

Description: Implement check mode support in custom Ansible modules to enable dry-run execution that reports changes without making them.

---

Check mode (--check) lets users preview what changes a playbook would make. Custom modules must explicitly support it.

## Enabling Check Mode

```python
module = AnsibleModule(
    argument_spec=module_args,
    supports_check_mode=True,  # Required!
)
```

If you do not set supports_check_mode=True, Ansible will skip your module during check mode runs.

## Implementation Pattern

```python
def run_module():
    module = AnsibleModule(
        argument_spec=dict(
            name=dict(type='str', required=True),
            value=dict(type='str', required=True),
        ),
        supports_check_mode=True,
    )

    current = get_current_value(module.params['name'])
    desired = module.params['value']

    if current == desired:
        module.exit_json(changed=False)
        return

    # Would make changes
    if module.check_mode:
        # Report what would change but do NOT act
        module.exit_json(
            changed=True,
            msg='Would update value',
            diff=dict(before=current, after=desired),
        )
        return

    # Actually make the change
    set_value(module.params['name'], desired)
    module.exit_json(
        changed=True,
        msg='Value updated',
        diff=dict(before=current, after=desired),
    )
```

## Rules for Check Mode

1. Reading state is always safe in check mode
2. Never write, create, or delete anything in check mode
3. Return accurate changed=True/False even in check mode
4. Include diff information for visibility

## Running in Check Mode

```bash
ansible-playbook site.yml --check --diff
```

## Full Example

```python
#!/usr/bin/python
from ansible.module_utils.basic import AnsibleModule
import os, json

def run_module():
    module = AnsibleModule(
        argument_spec=dict(
            path=dict(type='path', required=True),
            content=dict(type='str', required=True),
        ),
        supports_check_mode=True,
    )

    path = module.params['path']
    new_content = module.params['content']

    # Read current (safe in check mode)
    old_content = ''
    if os.path.exists(path):
        with open(path) as f:
            old_content = f.read()

    if old_content == new_content:
        module.exit_json(changed=False)
        return

    if module.check_mode:
        module.exit_json(changed=True, diff=dict(before=old_content, after=new_content))
        return

    with open(path, 'w') as f:
        f.write(new_content)
    module.exit_json(changed=True, diff=dict(before=old_content, after=new_content))

def main():
    run_module()

if __name__ == '__main__':
    main()
```

## Key Takeaways

Always set supports_check_mode=True. Check module.check_mode before making any changes. Return accurate changed status even in check mode. Include diff information so users see what would change. Never skip check mode support in production modules.
