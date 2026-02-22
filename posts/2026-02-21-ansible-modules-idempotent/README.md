# How to Make Ansible Modules Idempotent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Idempotency, Module Development, Python

Description: Build idempotent custom Ansible modules that only make changes when the current state differs from the desired state.

---

Idempotency means running the same operation multiple times produces the same result. An idempotent module checks current state first and only acts when it differs from desired state.

## The Pattern

Every idempotent module follows three steps:

1. Get current state
2. Compare with desired state
3. Act only on differences

```python
#!/usr/bin/python
from ansible.module_utils.basic import AnsibleModule
import json, os

def run_module():
    module_args = dict(
        name=dict(type='str', required=True),
        config=dict(type='dict', required=True),
        state=dict(type='str', default='present', choices=['present', 'absent']),
    )
    module = AnsibleModule(argument_spec=module_args, supports_check_mode=True)

    name = module.params['name']
    desired = module.params['config']
    state = module.params['state']
    config_file = f'/etc/myapp/{name}.json'

    # Step 1: Get current state
    current = None
    if os.path.exists(config_file):
        with open(config_file) as f:
            current = json.load(f)

    # Step 2: Compare
    if state == 'present':
        if current == desired:
            module.exit_json(changed=False, msg='Already configured')
        # Step 3: Act only on difference
        if not module.check_mode:
            os.makedirs(os.path.dirname(config_file), exist_ok=True)
            with open(config_file, 'w') as f:
                json.dump(desired, f, indent=2)
        module.exit_json(changed=True, diff=dict(before=current, after=desired))

    elif state == 'absent':
        if current is None:
            module.exit_json(changed=False, msg='Already absent')
        if not module.check_mode:
            os.remove(config_file)
        module.exit_json(changed=True)

def main():
    run_module()

if __name__ == '__main__':
    main()
```

## Comparing States

For complex resources, write a comparison function:

```python
def needs_update(current, desired):
    for key, value in desired.items():
        if current.get(key) != value:
            return True
    return False
```

## Testing Idempotency

Run your module twice. The second run should always report changed=False:

```yaml
- name: First run (should change)
  my_module:
    name: test
    config: {timeout: 30}
  register: first

- name: Second run (should NOT change)
  my_module:
    name: test
    config: {timeout: 30}
  register: second

- ansible.builtin.assert:
    that:
      - first.changed
      - not second.changed
```

## Common Idempotency Mistakes

Avoid these patterns that break idempotency:

```python
# BAD: Always writes file regardless of current content
with open(path, 'w') as f:
    f.write(content)
module.exit_json(changed=True)  # Always reports changed!

# GOOD: Check first, then write only if different
current = open(path).read() if os.path.exists(path) else ''
if current != content:
    with open(path, 'w') as f:
        f.write(content)
    module.exit_json(changed=True)
else:
    module.exit_json(changed=False)
```

## Key Takeaways

Idempotency requires three steps: read current state, compare with desired state, and only act on differences. Always check before changing. Return changed=False when no action is needed. Test by running twice and verifying the second run reports no changes.
