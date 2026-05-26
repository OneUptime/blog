# Validation Summary: How to Use Ansible Ad Hoc Commands to Gather Facts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- ansible.builtin.setup module
- Ansible facts and custom facts
- Ansible fact caching
- Shell scripting and Python JSON processing

## Sources Consulted
- Ansible ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible introduction to ad hoc commands: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- Ansible CLI documentation for ansible options: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible facts and local facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible stdout callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/callback_index_stdout.html
- Ansible cache plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/cache.html

## Issues Found
- The `gather_subset=min` example was not the current documented way to collect the default minimum facts. Changed it to `gather_subset=!all`, matching the official setup module examples.
- The subset examples described `network`, `hardware`, and `virtual` as gathering only those facts. Clarified that these gather the named subset plus the default minimum facts.
- The exclusion example used `gather_subset=all,!hardware`. Changed it to the documented exclusion style, `gather_subset=!hardware`.
- The custom facts example copied to `/etc/ansible/facts.d/app.fact` without first ensuring that `/etc/ansible/facts.d` exists. Added a `file` module command to create the directory before copying the fact file.
- The JSON callback example used `ANSIBLE_STDOUT_CALLBACK=json` for an ad hoc command. Updated it to use `ANSIBLE_LOAD_CALLBACK_PLUGINS=1` and the current `ansible.posix.json` stdout callback name for ad hoc command output.

## Review Notes
The local environment did not have the `ansible` executable installed, so command behavior was verified against official Ansible documentation rather than local CLI output. The examples assume POSIX/Linux managed hosts; Ansible's setup module has documented differences for Windows, including limitations around `filter`.
