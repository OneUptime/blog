# Validation Summary: How to Parse Ansible Output in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and callback plugins
- `ansible.posix.json` stdout callback
- Python `subprocess`, `json`, and `re`
- Ansible built-in modules: `setup`, `debug`, `package`, `hostname`, `lineinfile`, `service`, `template`, `uri`, `command`, `fail`, `copy`, `cron`
- Community Ansible modules: `community.general.timezone`, `community.general.ufw`
- YAML playbook syntax

## Sources Consulted
- Ansible `ansible.posix.json` callback documentation: https://docs.ansible.com/projects/ansible/devel/collections/ansible/posix/json_callback.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible playbook output / recap example: https://docs.ansible.com/projects/ansible-core/devel/getting_started/get_started_playbook.html
- Ansible inventory documentation for `-i`: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Python `subprocess` documentation: https://docs.python.org/3/library/subprocess.html
- Python `json` documentation: https://docs.python.org/3/library/json.html
- Python `re` documentation: https://docs.python.org/3/library/re.html

## Issues Found
- The post used the generic JSON callback name. Current Ansible documentation identifies the stdout callback as `ansible.posix.json`, notes that it is in the `ansible.posix` collection, and says to specify `ansible.posix.json` in playbooks. Updated the description, explanation, environment variable value, and summary accordingly.
- The example included `ANSIBLE_LOAD_CALLBACK_PLUGINS` for `ansible-playbook` JSON output. Official callback documentation describes that setting for ad hoc `ansible` command callbacks; setting the stdout callback is sufficient for `ansible-playbook`. Removed the unnecessary environment variable from the Python example.
- The infrastructure example used `ansible.builtin.timezone`, but current documentation provides the timezone module as `community.general.timezone`. Updated the module FQCN.

## Review Notes
- `ansible-playbook` was not installed in the local environment, so CLI behavior was checked against official Ansible documentation rather than local `--help` output.
- The Python examples were parsed successfully with `python3`.
- The YAML examples were parsed successfully with PyYAML.
- The text-output regex examples intentionally cover the common recap/task fields shown in Ansible output, but regex parsing remains less robust than using the JSON callback.
