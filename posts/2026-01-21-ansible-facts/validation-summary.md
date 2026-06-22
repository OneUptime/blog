# Validation Summary: How to Use Ansible Facts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible facts and fact gathering
- ansible.builtin.setup
- ansible.builtin.set_fact
- Ansible local facts in facts.d
- Ansible fact caching
- Jinja2 templates in Ansible
- community.general.slack

## Sources Consulted
- Ansible facts and magic variables: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- ansible.builtin.gather_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/gather_facts_module.html
- ansible.builtin.set_fact module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible playbook keywords documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- ansible.builtin.package_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_facts_module.html
- community.general.slack module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_module.html

## Issues Found
- The introduction said setup facts include installed packages. The standard setup facts include package manager details, while installed package data is returned by ansible.builtin.package_facts. Changed the wording to "package manager details."
- The static JSON custom fact example included a `//` filename comment inside a `json` code block, making the example invalid JSON. Moved the filename context into prose before the code block and left the JSON block syntactically valid.
- The Slack notification example used `slack:` as a short module name. Current official documentation identifies the module as part of the community.general collection and recommends `community.general.slack`, so the task was updated to use the fully qualified collection name.

## Review Notes
The examples rely on Ansible's default fact injection behavior, where many facts are also available as top-level `ansible_` variables. The official documentation notes these facts are also available under `ansible_facts`, and top-level injection can be disabled with the `INJECT_FACTS_AS_VARS` setting.
