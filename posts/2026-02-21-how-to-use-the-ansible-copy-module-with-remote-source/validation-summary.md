# Validation Summary: How to Use the Ansible copy Module with Remote Source

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.copy
- ansible.builtin.fetch
- ansible.builtin.get_url
- ansible.builtin.unarchive
- ansible.builtin.stat
- ansible.builtin.template
- ansible.builtin.lineinfile
- ansible.posix.synchronize

## Sources Consulted
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.fetch` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fetch_module.html
- Ansible `ansible.builtin.get_url` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.posix.synchronize` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html

## Issues Found
- The introduction said `remote_src` could be used when you need to "move or duplicate" a file. The `copy` module duplicates/copies files and does not remove the source, so this was changed to "duplicate".
- The limitations section said `copy` with `remote_src` does not support the `content` parameter. Official behavior is that `remote_src` applies to the `src` path, while `content` is an alternative to `src`, so the text was corrected to explain that distinction.
- The cross-host `fetch` + `copy` example relied on the default `fetch` destination tree while also using delegation. This can produce a different path depending on the play's `inventory_hostname`. The example now uses `flat: true`, a direct destination path, and `run_once: true` for the delegated source and destination tasks.
- The post referred to the `synchronize` module without its current collection-qualified name. This was updated to `ansible.posix.synchronize`.

## Review Notes
The remaining examples use current Ansible FQCN style and valid module parameters. Directory copy behavior, `validate`, `remote_src`, ownership, group, and mode usage align with the current Ansible module documentation. The Ansible copy documentation still includes a historical note that `remote_src` only works with `mode=preserve` as of Ansible 2.6, but current module behavior supports setting destination file attributes after remote copies.
