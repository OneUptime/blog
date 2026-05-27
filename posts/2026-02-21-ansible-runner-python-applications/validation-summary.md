# Validation Summary: How to Use Ansible Runner in Python Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Runner
- Ansible
- Python
- Flask
- YAML
- JSON

## Sources Consulted
- Ansible Runner Python interface documentation: https://docs.ansible.com/projects/runner/en/stable/python_interface/
- Ansible Runner package API documentation: https://docs.ansible.com/projects/runner/en/stable/ansible_runner/
- Ansible Runner input directory hierarchy documentation: https://docs.ansible.com/projects/runner/en/stable/intro/
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.builtin.hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- ansible.builtin.lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html

## Issues Found
- The `private_data_dir` layout wording implied the directory hierarchy was the only way Runner accepts inputs. Updated it to clarify that Runner can read inputs from that layout when using `private_data_dir`, and added the documented `env/envvars` and `env/cmdline` entries.
- The event handler example did not return `True`. Ansible Runner documents that an `event_handler` should return `True` to keep the event, so the example now returns `True`.
- The asynchronous execution loop only watched for `runner.status == 'running'`, which can miss other active startup states. Updated it to monitor the returned thread and join it before reading final status.
- The Python `passwords` example used `become_pass` and `conn_pass` keys, but Ansible Runner expects prompt regex patterns mapped to response values. Replaced the keys with documented prompt regexes.
- The `env/passwords` example used looser prompt patterns than the documented examples. Updated the JSON to the documented SSH and become password prompt regexes.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. Updated the task to use `community.general.timezone`.

## Review Notes
The `community.general` examples require the `community.general` collection, which is included with the broader `ansible` package in many environments but not with `ansible-core` alone. The article is otherwise technically accurate after the corrections above.
