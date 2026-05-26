# Validation Summary: How to Use the Ansible git Module with Force Pull

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.git module
- Git
- YAML playbooks
- Deployment workflows

## Sources Consulted
- Ansible ansible.builtin.git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible ansible.builtin.git module source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/modules/git.py
- Git git-clean documentation: https://git-scm.com/docs/git-clean
- Git git-stash documentation: https://git-scm.com/docs/git-stash

## Issues Found
- The post claimed `force: true` cleans untracked files. The official Ansible documentation describes `force` as discarding modified files, and the current module source detects local modifications while ignoring `??` untracked status lines, then uses reset/checkout/fetch force behavior rather than a general `git clean`. Updated the post to say `force: true` discards tracked local changes and local commits, while untracked files are usually left alone.
- The `.gitignore` section described the behavior as if Ansible force pull cleaned untracked files but respected `.gitignore`. Updated the section to explain that the module does not run a general `git clean`, so untracked files, including ignored files, are normally preserved by `force: true`.
- The stash example used `git stash save`, which Git documents as deprecated in favor of `git stash push`, and it did not include untracked files even though the preceding status command detects them. Updated the command to `git stash push --include-untracked -m ...`.
- The pre-flight check treated any existing `/opt/myapp` directory as a repository. Updated it to check for `/opt/myapp/.git` before running Git commands against the path.
- The preserve-files example backed up files by basename only, which could collide for files with the same basename in different directories. Updated the copy logic to preserve relative paths under the backup directory.

## Review Notes
The Ansible `git` module's exact internal commands can vary by target version and repository state, but the corrected post now matches the documented and current source-level behavior for `force`. If a deployment needs a fully pristine tree that removes untracked files, that should be handled explicitly with Git cleanup commands outside the module and reviewed separately because `git clean` can remove data.
