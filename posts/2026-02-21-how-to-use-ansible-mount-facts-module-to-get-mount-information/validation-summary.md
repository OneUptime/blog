# Validation Summary: How to Use Ansible mount_facts Module to Get Mount Information

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.mount_facts
- ansible.builtin.setup facts
- YAML playbooks
- Jinja2 templating
- Linux and POSIX filesystem mount metadata

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.mount_facts module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/mount_facts_module.html
- Ansible Core Documentation: ansible.builtin.setup module - https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/setup_module.html
- Ansible Core Documentation: ansible.builtin.gather_facts module - https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/gather_facts_module.html
- Ansible source for mount_facts return values - https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/modules/mount_facts.py

## Issues Found
- The post was framed as a guide to `ansible.builtin.mount_facts`, but the examples used the standard `ansible_facts['mounts']` list from normal fact gathering. Updated the post to use `ansible.builtin.mount_facts` directly and read from the documented `ansible_facts['mount_points']` dictionary.
- The post did not mention that `ansible.builtin.mount_facts` is available starting in ansible-core 2.18. Added the version caveat in the introduction.
- The examples implied that `mount_facts` and standard setup facts have the same data shape. Updated the data-structure explanation and sample entry to include the module's `ansible_context` field.
- Several examples filtered or looped over `ansible_facts['mounts']`. Updated those examples to loop over `ansible_facts['mount_points'].values() | list`.
- The mount option audit used substring checks against the raw options string. Updated those checks to split the comma-separated options first, matching exact mount options.
- The deployment validation `assert` indexed the first matching mount in a separate condition. Guarded that expression so a missing mount reports the intended assertion failure instead of risking a list-indexing error.

## Review Notes
The revised examples use `sources: dynamic` so the module reports currently mounted filesystems rather than combining dynamic mount data with static files such as `/etc/fstab`. Ansible was not installed in the local environment, so validation was performed against official documentation and upstream source rather than by executing the playbooks.
