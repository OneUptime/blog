# Validation Summary: How to Use Ansible to Manage Git Hooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Git
- Git hooks
- Bash
- Python
- JSON webhooks
- Mermaid

## Sources Consulted
- Git githooks documentation: https://git-scm.com/docs/githooks
- Git rev-list documentation: https://git-scm.com/docs/git-rev-list
- Git diff documentation: https://git-scm.com/docs/git-diff
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible playbook loops documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Python json module documentation: https://docs.python.org/3/library/json.html

## Issues Found
- The hook location description said Git hooks live in `.git/hooks/` for each repository. This is accurate for non-bare repositories, but server-side hooks in bare repositories live under the bare repository's `hooks/` directory. Updated the wording to distinguish non-bare and bare repository hook paths.
- The pre-commit hook collected Python filenames through `grep` and iterated with `for f in $python_files`, which breaks on staged paths containing spaces. Replaced it with a `git diff --cached --name-only --diff-filter=ACM -- '*.py'` loop that reads paths line by line.
- The pre-receive hook used `git log "$oldrev..$newrev"` for all pushes. That fails or skips validation for newly created branches because Git passes an all-zero old object ID for new refs, and it also needs to handle branch deletion refs. Updated it to skip deleted refs and use `git rev-list "$newrev" --not --all` for new refs.
- The webhook hook used `git log "$oldrev..$newrev"` for commit counts and did not handle new or deleted refs. Updated it to skip deleted refs and use `git rev-list --count` with the correct revision range for new and existing refs.
- The webhook hook built JSON by interpolating shell variables directly into a heredoc. Commit messages and author names containing quotes, backslashes, or other special characters could produce invalid JSON. Replaced the heredoc with Python `json.dumps()` so payload values are escaped correctly.

## Review Notes
Ansible was not installed in the local environment, so full `ansible-playbook --syntax-check` validation could not be run. The YAML snippets were parsed successfully with PyYAML, and the embedded Bash hook scripts passed `bash -n`. The Ansible module names and parameters used in the snippets match current official Ansible documentation.
