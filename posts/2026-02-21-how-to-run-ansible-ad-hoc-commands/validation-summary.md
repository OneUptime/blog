# Validation Summary: How to Run Ansible Ad Hoc Commands

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- Ansible inventory and host patterns
- Ansible built-in modules: ping, command, shell, copy, apt, service, file, user, fetch
- Ansible CLI options, privilege escalation, check mode, diff mode, forks, and callback output

## Sources Consulted
- Ansible ad hoc command guide: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- Ansible CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible inventory guide: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible host patterns guide: https://docs.ansible.com/projects/ansible-core/devel/inventory_guide/intro_patterns.html
- ansible.builtin.ping module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- ansible.builtin.command module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.shell module: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible callback plugins: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- ansible.builtin.minimal callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/minimal_callback.html
- ansible.builtin.oneline callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/oneline_callback.html
- ansible.builtin.default callback result formatting: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html

## Issues Found
- The shell example used double quotes around `echo $HOSTNAME`, which would let the local shell expand `$HOSTNAME` before Ansible sends the command. Changed it to single quotes so the variable is expanded on the remote host.
- The `command` versus `shell` explanation said the `command` module does not support environment variable expansion. Current Ansible documentation says environment variables are expanded by Python/Ansible, not by a shell. Updated the explanation.
- The host pattern section showed `web[1:5].example.com` as a numeric host range pattern. Numeric host ranges are inventory syntax, while pattern slicing uses group positions. Replaced it with `webservers[0:4]`.
- The output formatting examples used `ANSIBLE_STDOUT_CALLBACK=oneline`, `minimal`, `json`, and `yaml` directly. Current Ansible documentation identifies `-o` as the one-line option, `minimal` as the default ad hoc callback, `--tree` as a built-in way to write per-host JSON output, and `ANSIBLE_CALLBACK_RESULT_FORMAT=yaml` as the current result-format setting. Updated those examples.

## Review Notes
Ansible was not installed in the local environment, so command behavior was verified against official Ansible documentation rather than local `ansible --help` output.
