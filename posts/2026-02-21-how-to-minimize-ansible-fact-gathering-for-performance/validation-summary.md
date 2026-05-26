# Validation Summary: How to Minimize Ansible Fact Gathering for Performance

## Status
validated

## Post Type
Tutorial / performance optimization guide

## Technologies Covered
- Ansible playbooks
- Ansible fact gathering
- ansible.builtin.setup module
- Ansible callback plugins
- Ansible fact caching
- YAML and ansible.cfg configuration

## Sources Consulted
- Ansible ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible ansible.posix.profile_tasks callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible Playbook Keywords reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible Configuration Settings reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Cache plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/cache.html

## Issues Found
- The `profile_tasks` callback example used the short callback name. Current documentation identifies the callback as `ansible.posix.profile_tasks` and notes that it is in the `ansible.posix` collection, so the command was updated to use the FQCN.
- The post described `gather_subset: network` as gathering only network facts. Ansible documentation states that subset gathering includes the default minimum facts unless `!all` is used, so the example comment was corrected.
- The subset table listed `minimum` as an alias for `min`. Current `ansible.builtin.setup` documentation lists `min`, not `minimum`, so the alias was removed.
- The delegated `setup` example read facts from `hostvars` for the delegated host but did not set `delegate_facts: true`. The example was updated so facts are explicitly assigned to the delegated host.
- The final strategy was titled and introduced as a custom fact module, but the code uses normal `command` tasks and `set_fact`, not a custom module. The heading and introductory sentence were corrected to describe lightweight fact gathering tasks.

## Review Notes
The benchmark numbers and timing estimates are environment-dependent examples rather than guaranteed Ansible behavior. They are acceptable as illustrative measurements, but future edits could make that caveat explicit.
