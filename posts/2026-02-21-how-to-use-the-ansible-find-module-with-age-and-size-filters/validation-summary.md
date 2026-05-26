# Validation Summary: How to Use the Ansible find Module with Age and Size Filters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.find module
- ansible.builtin.file module
- ansible.builtin.command module
- Jinja filters in Ansible playbooks
- Linux file timestamps and file sizes

## Sources Consulted
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.human_readable` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/human_readable_filter.html
- Ansible `find` module source implementation: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/modules/find.py

## Issues Found
- The post described `ctime` as creation time in a task name. On Linux and in Ansible's `age_stamp: ctime`, this is inode change time, so the wording was corrected to "changed" and "inode change time."
- The post said the `size` filter was based on size on disk. The Ansible implementation filters on `st_size`, so the wording was corrected to file size.
- The post described positive and negative `size` values as strictly larger/smaller in places. Ansible's comparisons are inclusive, so wording was updated to "equal to or larger than," "equal to or smaller than," and "at least" where appropriate.
- The backup rotation example defined `monthly_retention_days` but never used it. The unused variable was removed to avoid implying monthly cleanup logic that was not present.
- The temporary-directory cleanup example used `ansible.builtin.file` with `state: absent` after finding directories. Since `state: absent` recursively deletes directories, this could remove non-empty directories. The task now uses `rmdir` through `ansible.builtin.command`, so non-empty directories are skipped as described.
- The "Find the 10 largest files" example sorted matching files but did not limit the loop to 10. The loop now slices the sorted list to the first 10 entries.
- The post claimed `size: "0"` finds exactly zero-byte files. Ansible treats non-negative sizes inclusively, so `size: "0"` matches all files with size greater than or equal to zero. The example now registers log files and filters for `item.size == 0`.

## Review Notes
The examples remain general-purpose snippets and were reviewed against current Ansible documentation. Ansible was not installed in the local environment, so validation was performed by documentation and source review rather than `ansible-playbook --syntax-check`.
