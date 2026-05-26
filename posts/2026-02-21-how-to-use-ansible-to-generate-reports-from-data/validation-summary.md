# Validation Summary: How to Use Ansible to Generate Reports from Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible facts and gathered facts
- Jinja2 templating and filters
- YAML
- HTML and CSV report generation
- `ansible.builtin.copy`
- `ansible.builtin.set_fact`
- `ansible.builtin.service_facts`
- `ansible.builtin.shell`
- `community.general.mail`

## Sources Consulted
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible filters documentation, including `default`, `to_json`, and related templating behavior: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible `ansible.builtin.selectattr` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/selectattr_filter.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible playbook error handling documentation for `failed_when` and `changed_when`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible `community.general.mail` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/mail_module.html

## Issues Found
- The basic report used `ansible_date_time.iso8601` in a localhost play with `gather_facts: false`. Since `ansible_date_time` is created by fact gathering and can also become stale in long-running playbooks, changed the generated timestamp to use `lookup('pipe', 'date -u +%Y-%m-%dT%H:%M:%SZ')` directly.
- The HTML report labeled a field as root disk size but read the first entry in `ansible_facts.mounts`, which is not guaranteed to be the `/` mount. Changed the expression to select the mount whose `mount` attribute is `/` before reading `size_total`.
- The compliance checks used broad `grep -c` patterns that could pass on commented lines or partial matches. Changed them to `grep -Eq` with anchored expressions for active `PASS_MAX_DAYS` and `PermitRootLogin no` settings.

## Review Notes
The examples are technically valid tutorial snippets after the fixes. `ansible-playbook` is not installed in this workspace, so full Ansible execution was not possible; the YAML code blocks were parsed successfully with PyYAML.
