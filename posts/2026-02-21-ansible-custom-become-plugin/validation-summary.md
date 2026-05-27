# Validation Summary: How to Create a Custom Ansible Become Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible become plugins
- Ansible privilege escalation
- Python
- YAML playbooks
- Ansible configuration
- sudo-style privilege escalation workflows

## Sources Consulted
- Ansible become plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/become.html
- Ansible configuration settings for `become_plugins` and `ANSIBLE_BECOME_PLUGINS`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible sudo become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- Ansible plugin development documentation: https://docs.ansible.com/projects/ansible-core/2.16/dev_guide/developing_plugins.html
- Ansible `BecomeBase` source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/become/__init__.py
- Ansible `sudo` become plugin source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/become/sudo.py

## Issues Found
- The original custom plugin set `success = ('privrun: authenticated',)` as if become plugins used a success-pattern tuple. Current Ansible uses an internal `BECOME-SUCCESS-...` marker created by `BecomeBase.build_become_command()` and included with `_build_success_command()`. I removed the custom `success` tuple and wrapped commands with `self._build_success_command(cmd, shell)`.
- The post stated that a complex prompt could be handled by assigning a regex to `prompt`. `BecomeBase.check_password_prompt()` treats `prompt` as literal prefix text, not a regex. I changed the explanation and example to override `check_password_prompt()` for regex matching.
- The CyberArk example claimed to fetch credentials but only wrapped a sudo command, with unused vault imports and options. I changed it to a vault-backed sudo pattern and clarified that the vault workflow should supply `ansible_become_password` before command execution.
- The sudo wrapper example used `sudo -n` while also describing password handling. Since `-n` makes sudo non-interactive and prevents password prompting, I removed `-n` from that example.
- The command-generation test passed `shell=None`, which would not exercise `_build_success_command()` correctly. I added a small dummy shell object and an assertion for the `BECOME-SUCCESS` marker.
- The examples used `ansible.module_utils.six.moves.shlex_quote`. It still imports in the local Ansible installation, but the current Ansible source uses Python's standard `shlex` module. I updated examples to `import shlex` and `shlex.quote()`.

## Review Notes
- Verified Python code blocks with `ast.parse`; all Python snippets are syntactically valid after the fixes.
- The post intentionally uses a hypothetical `privrun` command, so the exact `privrun` flags cannot be verified against official documentation.
