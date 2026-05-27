# Validation Summary: How to Set Up Ansible with a Custom Module Path

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.cfg
- Ansible custom modules
- Ansible module_utils
- Python
- YAML playbooks
- Ansible CLI tools

## Sources Consulted
- Ansible Core documentation: Adding modules and plugins locally, https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_locally.html
- Ansible Community documentation: Ansible Configuration Settings, https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Core documentation: Controlling how Ansible behaves: precedence rules, https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/general_precedence.html
- Ansible Core documentation: Search paths in Ansible, https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbook_pathing.html
- Ansible Core documentation: Developing modules, https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_modules_general.html
- Ansible Core documentation: Module format and documentation, https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_modules_documenting.html
- Ansible Community documentation: Roles, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html

## Issues Found
- The module search order listed ansible.cfg `library` paths before `ANSIBLE_LIBRARY`. Ansible configuration precedence gives environment variables higher precedence than ansible.cfg entries, so I changed the description and diagram to refer to the active module path configuration instead of treating both as separate ordered search steps.
- The post said `./library` in ansible.cfg is relative to the current working directory. Ansible's path documentation says config paths are normally relative to the config file, so I corrected that description.
- The project structure section implied a project-root `library/` directory is automatically searched just because playbooks are run from the project directory. Ansible automatically searches a `library/` directory adjacent to a playbook or role; the project-root directory is included when configured in ansible.cfg. I updated the wording to make that distinction.
- The role example did not mention the standalone-role limitation for embedded role plugins. I updated the text to say standalone roles can have their own `library/` directory.
- The default module path wording referred generically to a built-in module path. I changed it to the documented default module directories.
- The troubleshooting section said a missing `.py` extension is a common loading issue. Current Ansible documentation emphasizes matching module names and shows Python modules commonly using `.py`, but local modules are executable files and can also be non-Python. I replaced that item with a more accurate module-name mismatch warning and narrowed the executable-bit warning to non-Python modules.

## Review Notes
Ansible was not installed in the local workspace, so CLI behavior could not be checked with local `ansible`, `ansible-config`, or `ansible-doc` commands. The review used current official Ansible documentation instead.
