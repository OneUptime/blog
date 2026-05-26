# Validation Summary: How to Use Ansible gather_facts Module with Custom Modules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible fact gathering
- ansible.builtin.setup
- Local facts in facts.d
- Custom Ansible facts modules
- Ansible playbook YAML
- community.general modules

## Sources Consulted
- Ansible setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible facts and local facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible module development documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_modules_general.html
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The custom facts module did not declare check mode support. Ansible's module development guidance says facts modules must support check mode, so `supports_check_mode=True` was added to the `AnsibleModule` initialization.
- The "Gather only specific facts" example used `!all` without `!min`, which still gathers the default minimum fact subset. Added `!min` so the example matches its description.
- The `setup` module `filter` example used the older scalar form. Ansible still accepts a string, but current documentation defines `filter` as a list, so the example was updated to list syntax.
- The infrastructure example used `ansible.builtin.timezone`, but current documentation places the timezone module in `community.general`. Updated the task to use `community.general.timezone`.
- The conclusion described all custom facts as available through `ansible_facts`; local facts are commonly accessed through `ansible_local`, so the wording was adjusted to mention both fact namespaces.

## Review Notes
The remaining examples are broadly correct, but the `community.general.ufw` and `community.general.timezone` tasks require the `community.general` collection and relevant target-host packages such as `ufw` or timezone data where applicable.
