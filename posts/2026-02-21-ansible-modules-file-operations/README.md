# How to Create Ansible Modules for File Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Operations, Module Development, Python

Description: Create custom Ansible modules for specialized file operations with proper permission handling and atomic writes.

---

While Ansible has built-in file modules, sometimes you need custom file handling for specific formats or operations.

## Atomic File Writes

Never write directly to the target file. Use a temporary file and move it:

```python
#!/usr/bin/python
from ansible.module_utils.basic import AnsibleModule
import os, tempfile

def run_module():
    module = AnsibleModule(
        argument_spec=dict(
            path=dict(type='path', required=True),
            content=dict(type='str', required=True),
            backup=dict(type='bool', default=False),
        ),
        add_file_common_args=True,
        supports_check_mode=True,
    )

    path = module.params['path']
    content = module.params['content']

    # Check current state
    current = ''
    if os.path.exists(path):
        with open(path) as f:
            current = f.read()

    diff = dict(before=current, after=content)
    file_args = module.load_file_common_arguments(module.params)

    if current == content:
        changed = module.set_fs_attributes_if_different(file_args, False)
        module.exit_json(changed=changed)
        return

    if module.check_mode:
        module.exit_json(changed=True, diff=diff)
        return

    # Atomic write: write to temp, then move
    dir_name = os.path.dirname(path) or '.'
    fd, tmp_path = tempfile.mkstemp(dir=dir_name)
    backup_file = None
    try:
        with os.fdopen(fd, 'w') as tmp_file:
            tmp_file.write(content)
        if module.params.get('backup') and os.path.exists(path):
            backup_file = module.backup_local(path)
        module.atomic_move(tmp_path, path, unsafe_writes=module.params['unsafe_writes'])
    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        module.fail_json(msg=str(e))

    changed = module.set_fs_attributes_if_different(file_args, True)
    result = dict(changed=changed, diff=diff)
    if backup_file:
        result['backup_file'] = backup_file
    module.exit_json(**result)

def main():
    run_module()

if __name__ == '__main__':
    main()
```

## Creating Backups

```python
# Use module's built-in backup

if module.params.get('backup') and os.path.exists(path):
    backup_file = module.backup_local(path)
```

## Setting File Attributes

Use module's file attribute helpers:

```python
# After creating/modifying the file
file_args = module.load_file_common_arguments(module.params)
changed = module.set_fs_attributes_if_different(file_args, changed)
```

## Key Takeaways

Use atomic writes (temp file + move) to prevent corruption. Use module.backup_local for backups. Use module's file attribute helpers for permissions. Always check current state before writing.
