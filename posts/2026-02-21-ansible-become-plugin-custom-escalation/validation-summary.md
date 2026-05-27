# Validation Summary: How to Create a Become Plugin for Custom Privilege Escalation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible become plugins
- Ansible privilege escalation
- Python
- sudo
- Custom PAM wrappers
- Credential vault integrations
- YAML playbooks and inventory variables

## Sources Consulted
- Ansible become plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/become.html
- Ansible plugin development documentation: https://docs.ansible.com/projects/ansible-core/2.16/dev_guide/developing_plugins.html
- ansible.builtin.sudo become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- Ansible BecomeBase source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/become/__init__.py
- Ansible sudo become plugin source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/become/sudo.py
- ansible.builtin.yum module documentation: https://docs.ansible.com/projects/ansible/2.10/collections/ansible/builtin/yum_module.html
- ansible.builtin.reboot module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html

## Issues Found
- The example become plugins built the escalation command without calling `_build_success_command()`. Ansible's `BecomeBase` generates a `BECOME-SUCCESS-*` marker and built-in become plugins wrap the target command with that marker so the connection layer can detect successful privilege escalation. Updated both `pamsudo` and `jit_sudo` examples to wrap `cmd` with `self._build_success_command(cmd, shell)`.
- The `jit_sudo` example used `sudo -H -S -n` while also expecting Ansible to provide a password. The `-n` flag makes sudo non-interactive and can prevent password prompting. Updated the command to use `sudo -H -S -p <prompt>` and set an explicit Ansible-tracked prompt.
- The JIT plugin description claimed credentials were checked back in when done, but the code did not implement any check-in flow. Reworded the description to say the checked-out credential is cached by the plugin instance.
- The usage example referenced `yum_result.changed` without registering `yum_result`. Added `register: yum_result` to the package update task.
- The summary described `success` patterns as part of the custom plugin interface. Current `BecomeBase` manages a generated success marker, so the summary now tells readers to use `_build_success_command()` and set `prompt`/`fail` patterns.

## Review Notes
- The `pamsudo` command-line interface is hypothetical, so its custom flags can only be validated for internal consistency with the post's stated wrapper contract.
- The JIT vault API path and payload are illustrative because no specific vault product API is named. The example now avoids claiming a check-in lifecycle that is not implemented.
- Python code blocks were parsed with `ast.parse` after edits and are syntactically valid.
