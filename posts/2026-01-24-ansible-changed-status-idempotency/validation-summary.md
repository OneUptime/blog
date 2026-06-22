# Validation Summary: How to Fix 'Changed Status' Idempotency Issues

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: command, shell, file, copy, template, apt, service, user, git, unarchive, uri, stat, assert
- ansible.mysql collection modules
- Jinja2 templating and whitespace control
- Molecule idempotence testing
- Linux package, service, swap, timezone, and password-management examples

## Sources Consulted
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible unarchive module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible git module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible password lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_lookup.html
- Ansible filters documentation for password_hash idempotency: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible Lint no-changed-when rule: https://docs.ansible.com/projects/lint/rules/no-changed-when/
- Ansible community.mysql redirect/deprecation documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_info_module.html and https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_db_module.html
- Molecule configuration and workflow documentation: https://docs.ansible.com/projects/molecule/configuration/ and https://docs.ansible.com/projects/molecule/workflow/

## Issues Found
- The template section said to use `lstrip_blocks` and `trim_blocks` in `ansible.cfg`. The current Ansible template documentation supports these as template module options and documents `#jinja2` headers for overriding Jinja settings, so the wording was corrected.
- The copy example implied that missing permissions might keep reporting changed due to umask. Official file option behavior is that umask affects newly created files when mode is omitted, while existing file mode is preserved. The wording was corrected to describe initial permission variance instead of repeated change reporting.
- The apt example said `state: latest` always checks for updates. The module documentation says `latest` ensures the latest available version is installed, so the wording was corrected to say it may upgrade when a newer version is available.
- The MySQL examples used unqualified `mysql_info` and `mysql_db` names. Current Ansible documentation redirects `community.mysql` to `ansible.mysql` and marks the old redirect as deprecated, so the examples were updated to `ansible.mysql.mysql_info` and `ansible.mysql.mysql_db`.
- The unarchive example stated that `unarchive` extracts every time and used a separate marker file. Official documentation provides a `creates` parameter for skipping extraction when an extracted path exists, so the example was corrected to use `creates`.
- The "stored password" example still used `password_hash('sha512')` without a stable salt or rounds, which official Ansible filter documentation identifies as non-idempotent because it uses a random salt and can vary between crypt/passlib defaults. The example now uses a stable per-host salt and explicit rounds.

## Review Notes
The post is technically relevant and the remaining examples are consistent with current Ansible guidance. Future improvements could use fully qualified collection names for all Ansible modules, but the short names for built-in modules remain valid in typical playbooks.
