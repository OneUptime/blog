# How to Use Diff Mode in Custom Ansible Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Diff Mode, Module Development, Python

Description: Implement diff mode in custom modules to show before and after states when configuration changes are made.

---

Diff mode shows what changed between previous and new state. When users run ansible-playbook --diff, modules that include diff data display the exact differences.

## Adding Diff Data

Include a diff key in your exit_json call:

```python
module.exit_json(
    changed=True,
    diff=dict(
        before='old content here\n',
        after='new content here\n',
    ),
)
```

## File-Based Diff

For modules managing files:

```python
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

    old_content = ''
    if os.path.exists(path):
        with open(path) as f:
            old_content = f.read()

    if old_content == new_content:
        module.exit_json(changed=False)
        return

    if not module.check_mode:
        with open(path, 'w') as f:
            f.write(new_content)

    module.exit_json(
        changed=True,
        diff=dict(
            before_header=path,
            after_header=path,
            before=old_content,
            after=new_content,
        ),
    )
```

Output with --diff:

```diff
--- before: /etc/myapp/config.yml
+++ after: /etc/myapp/config.yml
@@ -1,3 +1,3 @@
-log_level: info
+log_level: debug
 max_connections: 100
```

## Structured Data Diff

For dictionaries, format as sorted JSON:

```python
import json

def format_for_diff(data):
    return json.dumps(data, indent=2, sort_keys=True) + '\n'

module.exit_json(
    changed=True,
    diff=dict(
        before=format_for_diff(current_config),
        after=format_for_diff(desired_config),
    ),
)
```

## Multiple Diffs

Return a list for multiple changes:

```python
module.exit_json(
    changed=True,
    diff=[
        dict(before='old1\n', after='new1\n', before_header='file1', after_header='file1'),
        dict(before='old2\n', after='new2\n', before_header='file2', after_header='file2'),
    ],
)
```

## Key Takeaways

Include diff data in exit_json when changes are made. Use before and after keys with string content. Use before_header and after_header for labels. Format structured data as sorted JSON for readable diffs. Combine with check mode for complete preview capability.
