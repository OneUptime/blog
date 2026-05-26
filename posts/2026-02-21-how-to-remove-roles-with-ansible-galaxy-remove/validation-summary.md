# Validation Summary: How to Remove Roles with ansible-galaxy remove

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy CLI
- Ansible roles
- Ansible collections
- Bash scripting
- Python scripting
- YAML requirements files
- GitHub Actions

## Sources Consulted
- Ansible Core ansible-galaxy CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-galaxy.html
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Core configuration documentation for DEFAULT_ROLES_PATH: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html#default-roles-path
- Local ansible-core 2.21.0 CLI help output for `ansible-galaxy role remove`, `ansible-galaxy remove`, `ansible-galaxy collection list`, and invalid `ansible-galaxy collection remove`

## Issues Found
- The post used the compatibility form `ansible-galaxy remove` throughout. Current official Ansible documentation lists the command as `ansible-galaxy role remove`, so I updated the title, explanatory text, examples, and summary to use the documented form.
- The post described the default role removal path as only `~/.ansible/roles/`. Official documentation defines the default roles path as the first writable entry from `DEFAULT_ROLES_PATH`, commonly including `~/.ansible/roles`, `/usr/share/ansible/roles`, and `/etc/ansible/roles`. I updated the wording to avoid overstating the default.
- The post said role removal "only checks the default path." I adjusted this to say it uses the configured roles path unless `-p` is supplied, which better matches the documented roles path behavior.

## Review Notes
- `ansible-galaxy remove` still works as a compatibility alias in ansible-core 2.21.0, but `ansible-galaxy role remove` is the clearer and documented syntax.
- The claim that there is no built-in `ansible-galaxy collection remove` command was verified against ansible-core 2.21.0 and official CLI documentation.
- The helper scripts are syntactically valid, but the role-scanning script is heuristic and can produce false positives or false negatives for complex playbooks.
