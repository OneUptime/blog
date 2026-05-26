# Validation Summary: How to Use Ansible with Git Subversion (svn) Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.subversion
- Subversion (SVN)
- git svn
- YAML playbooks

## Sources Consulted
- Ansible `ansible.builtin.subversion` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/subversion_module.html
- Git `git svn` documentation: https://git-scm.com/docs/git-svn.html
- Version Control with Subversion repository organization guidance: https://svnbook.red-bean.com/
- Ansible playbook retry behavior documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html

## Issues Found
- The SVN-to-Git migration playbook wrote `{{ work_dir }}/authors.txt` without first creating `{{ work_dir }}`. Added a `file` task to create the migration working directory before the `copy` task.
- The `git svn clone` example did not set a predictable prefix for imported SVN refs. Added `--prefix=svn/`, matching the official `git svn` documentation examples for standard-layout repositories.
- The tag conversion command stripped only `tags/` from remote refs, which could create tag names such as `svn/v1.0.0` instead of `v1.0.0`. Updated it to iterate over `refs/remotes/svn/tags` and strip the full `svn/tags/` prefix.
- The migration example used `git push --all` without first creating local Git branches from imported SVN branch refs. Added a branch conversion task so imported SVN branches are included when pushing all local branches.
- The migration shell snippets could fail on a repeated run if branches, tags, or the `origin` remote already existed. Added existence checks before creating those Git objects.

## Review Notes
- The Ansible `subversion` module examples use current parameters documented by Ansible: `repo`, `dest`, `revision`, `force`, `export`, `username`, and `password`.
- The `ansible.builtin.subversion` module documentation notes that the module does not handle SVN externals; the post does not discuss externals.
- The deployment health-check retry example depends on current Ansible behavior where `retries` without `until` retries a task until success up to the retry limit.
