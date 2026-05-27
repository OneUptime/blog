# Validation Summary: How to Use the Ansible git Module with Submodules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.git module
- Git
- Git submodules
- SSH authentication for Git
- WordPress deployment

## Sources Consulted
- Ansible official documentation: ansible.builtin.git module, including `recursive`, `key_file`, `accept_hostkey`, and `accept_newhostkey`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Git official documentation: git-clone `--recurse-submodules` behavior: https://git-scm.com/docs/git-clone
- Git official documentation: git-submodule `init`, `update`, `status`, and `sync`: https://git-scm.com/docs/git-submodule
- Local Git CLI help output for `git clone -h`, confirming `--recursive` is accepted as an alias of `--recurse-submodules`.

## Issues Found
- The post said submodules are not initialized or updated by default when deploying with Ansible. Current Ansible documentation says `ansible.builtin.git` has `recursive: true` as the default. Updated the introduction, the "without recursive" example, and the summary to clarify that users must set `recursive: false` to skip submodules.
- The "Clone without submodules" example omitted `recursive` while describing disabled submodule checkout. Added `recursive: false` and removed the incorrect default wording from the play name and comments.
- The private submodule example used `accept_hostkey: true`, which maps to `StrictHostKeyChecking=no`. Updated it to `accept_newhostkey: true`, matching current Ansible guidance for OpenSSH 7.5+ and the example's existing `StrictHostKeyChecking accept-new` SSH config.
- The submodule status parser did not handle Git's `U` prefix for merge-conflicted submodules. Updated the parser to strip `U` from the commit field and report `merge_conflict`.
- The summary said to always sync submodules after updating the parent repository. Git documentation describes `git submodule sync` as specifically useful when submodule URLs change, so the summary now limits that advice to URL changes.

## Review Notes
The remaining examples are technically valid, but the shell-based submodule tasks could be made more idempotent in a future revision by using more precise `changed_when` logic or explicit status checks.
