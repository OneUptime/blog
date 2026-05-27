# Validation Summary: How to Create Symbolic Links with the Ansible file Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.file module
- ansible.builtin.find module
- ansible.builtin.stat module
- Linux symbolic links
- Nginx site configuration symlinks

## Sources Consulted
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.stat` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `file` module source code: https://github.com/ansible/ansible/blob/devel/lib/ansible/modules/file.py

## Issues Found
- The `force: true` section said Ansible replaces an existing regular file or directory and deletes whatever is at the destination. The official documentation describes `force` for replacing destination files, and the module source refuses to replace non-empty directories. Updated the explanation and example comments to avoid implying that arbitrary directories are removed.
- The ownership section said `owner` and `group` always change the symlink itself. The `file` module defaults to `follow: true`, so filesystem attributes can apply to the target unless `follow: false` is set. Updated the explanation and example to include `follow: false`.
- The cleanup example used `slice(5) | last`, which partitions the list into five slices rather than selecting all but the five newest releases. Replaced it with list slicing that sorts by modification time and removes all entries except the last five.

## Review Notes
The remaining examples use current fully qualified Ansible module names and valid fields. The `stat.lnk_target` assertion is correct for comparing the stored symlink target; `lnk_source` would be the normalized target path.
