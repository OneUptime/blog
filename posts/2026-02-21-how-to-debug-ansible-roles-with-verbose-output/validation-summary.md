# Validation Summary: How to Debug Ansible Roles with Verbose Output

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible CLI verbosity, check mode, diff mode, tags, and inventory inspection
- Ansible built-in modules: debug, assert, command, template, include_tasks
- Ansible callback plugins and configuration
- Jinja2 expressions in Ansible

## Sources Consulted
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible ansible-inventory CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible debug module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debug_module.html
- Ansible assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible variable precedence documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible stdout callback index: https://docs.ansible.com/projects/ansible/latest/collections/callback_index_stdout.html
- Ansible default callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- ansible.posix debug callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/debug_callback.html
- ansible.posix timer callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/timer_callback.html
- ansible.posix profile_tasks callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html

## Issues Found
- The post stated that Ansible supports exactly four verbosity levels. Current ansible-playbook documentation says multiple `-v` flags increase verbosity and built-in plugins evaluate up to `-vvvvvv`; revised the wording to describe the listed levels as commonly used rather than exhaustive.
- The `-vv` and `-vvvv` descriptions overstated guaranteed visibility into all task input parameters, raw data, module arguments, and module code. Revised the text to avoid promising output that depends on the module, callback, and Ansible version.
- The check-mode/diff-mode section claimed full visibility into rendered template output. Updated it to say diff mode shows before-and-after differences for files and templates when the module supports diff mode.
- The ad hoc Jinja2 command escaped the expression in a way that would print a literal expression instead of evaluating it. Changed it to `msg={{ 4 * 2 }}`.
- The inventory-variable debug example used `ansible_default_ipv4.address`, which is a gathered fact and is not generally available in a plain ad hoc debug command. Changed it to a generic inventory variable example.
- The role variable precedence example referenced `role_defaults` and `role_vars`, which are not automatic Ansible variables. Replaced it with an effective-value debug task and an `ansible-inventory --host ... --yaml` command for inspecting inventory variables.
- The callback examples used outdated or ambiguous callback names such as `yaml`, `debug`, `timer`, and `profile_tasks`. Updated them to current configuration and FQCN forms: `ANSIBLE_CALLBACK_RESULT_FORMAT=yaml`, `ansible.posix.debug`, `ansible.posix.timer`, and `ansible.posix.profile_tasks`.
- The final workflow repeated the overstated claims about `-vv` showing resolved parameters and `-vvv` showing raw module input. Updated those steps to recommend targeted debug tasks and higher verbosity for additional execution details.

## Review Notes
The post is now technically valid for current Ansible documentation. The ansible.posix callback examples assume the `ansible.posix` collection is installed; this is common with the full `ansible` package but not included in `ansible-core` alone.
