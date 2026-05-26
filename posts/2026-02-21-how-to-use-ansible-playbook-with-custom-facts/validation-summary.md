# Validation Summary: How to Use Ansible Playbook with Custom Facts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible custom facts and `facts.d`
- Ansible `setup`, `group_by`, `find`, `file`, `template`, `copy`, `include_tasks`, `lineinfile`, and `unarchive` modules
- INI and JSON fact files
- Bash and Python dynamic fact scripts

## Sources Consulted
- Ansible documentation: Discovering variables, facts, magic variables, and `facts.d`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible documentation: `ansible.builtin.setup` module: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/setup_module.html
- Ansible documentation: `ansible.builtin.group_by` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_by_module.html
- Ansible documentation: `ansible.builtin.find` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible documentation: `ansible.builtin.include_tasks` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible documentation: `ansible.builtin.lineinfile` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible documentation: `ansible.builtin.unarchive` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible documentation: Version tests: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible setup module examples for `--tree`: https://docs.ansible.com/ansible/2.9/modules/setup_module.html

## Issues Found
- The JSON static fact example used top-level `app_name`, `app_version`, and `environment` keys, but the later playbook examples access those values under `ansible_local.application.general`. I changed the JSON example to nest those values under a `general` object, matching the INI example and subsequent fact references.
- The debugging section piped normal ad hoc Ansible output directly into `python3 -m json.tool`. Standard ad hoc output includes Ansible host/status text and is not guaranteed to be raw JSON. I changed the example to use `ansible ... --tree /tmp/ansible-facts` and then pretty-print the saved host JSON file.

## Review Notes
The core explanation is accurate for Linux/Unix-style managed hosts: custom fact files must end in `.fact`, non-executable static facts may be JSON or INI, executable dynamic facts should return JSON, and local facts are exposed under `ansible_local`. Ansible's current docs recommend fully qualified collection names such as `ansible.builtin.setup`, but the short module names used in the post remain supported in normal Ansible installations.
