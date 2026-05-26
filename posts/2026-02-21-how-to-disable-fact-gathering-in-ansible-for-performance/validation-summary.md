# Validation Summary: How to Disable Fact Gathering in Ansible for Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible fact gathering
- ansible.builtin.setup module
- ansible.cfg configuration
- Ansible callback plugins

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.setup module, including `gather_subset` values and behavior: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible Community Documentation: Playbook keywords, including `gather_facts`, `gather_subset`, and `gather_timeout`: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible Community Documentation: Configuration settings, including `DEFAULT_FORKS`, `DEFAULT_GATHERING`, and `CALLBACKS_ENABLED`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: Callback plugins: https://docs.ansible.com/ansible/latest/plugins/callback.html
- Ansible Community Documentation: ansible.posix.profile_tasks callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible Community Documentation: ansible.posix.timer callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/timer_callback.html

## Issues Found
- The benchmarking command used `-e "gather_facts_override=no"`, but that extra variable would not disable fact gathering unless the playbook explicitly used it in `gather_facts`. Changed the example to say to time the same playbook after setting `gather_facts: no` in the play.
- The `gather_subset: network` example comment said it gathered only network facts. Official Ansible documentation states that selecting a subset restricts additional gathered facts and includes the default minimum facts unless `!all,!min` is specified. Updated the comment accordingly.
- The subset list comment said `min` facts are always collected unless `all` is excluded. Official documentation says `!all` still collects the minimum subset, and `!all,!min` is required to avoid it. Updated the comment.
- The timing callback command used short callback names. Updated it to the documented fully qualified callback names `ansible.posix.timer` and `ansible.posix.profile_tasks`.
- The hardware subset performance claim used a fixed 30-50% improvement. This is environment-dependent and not guaranteed by Ansible documentation, so it was softened to a qualitative performance statement.

## Review Notes
The ansible.posix timing callbacks are not included in ansible-core; users may need the `ansible.posix` collection installed. The local environment did not have Ansible installed, so validation was performed against official Ansible documentation rather than local `ansible-doc` output.
