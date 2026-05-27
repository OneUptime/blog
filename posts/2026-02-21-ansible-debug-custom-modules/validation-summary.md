# Validation Summary: How to Debug Custom Ansible Modules

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- Ansible custom modules
- Python
- Ansible task debugger

## Sources Consulted
- Ansible Community Documentation: Debugging modules - https://docs.ansible.com/projects/ansible/latest/dev_guide/debugging.html
- Ansible Core Documentation: Developing modules - https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_modules_general.html
- Ansible Community Documentation: Debugging tasks - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_debugger.html
- Ansible Community Documentation: Ansible module architecture - https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_program_flow_modules.html
- Ansible Community Documentation: Module utilities reference - https://docs.ansible.com/projects/ansible/latest/reference_appendices/module_utils.html

## Issues Found
- The introduction said modules run on remote hosts via SSH. Ansible modules usually run on managed hosts through Ansible's connection layer, which may be SSH but is not limited to SSH. Updated the wording.
- The `ANSIBLE_KEEP_REMOTE_FILES` command used `-v`. Official debugging guidance uses `-vvv` so Ansible prints the temporary module file path. Updated the command to use `-vvv`.
- The debugger example used `strategy: debug`. Current Ansible documentation recommends the `debugger` keyword for new playbooks, while the debug strategy is a backward-compatible legacy method that may be removed in a future release. Updated the example to `debugger: on_failed` and adjusted the related wording.

## Review Notes
- Direct execution with an `ANSIBLE_MODULE_ARGS` JSON file is consistent with Ansible's module development documentation.
- `ANSIBLE_KEEP_REMOTE_FILES` and inspecting `~/.ansible/tmp/` are consistent with Ansible's module debugging documentation.
- `AnsibleModule.log()` and `AnsibleModule.warn()` are valid module utility methods. Avoid logging sensitive parameters in real modules unless they are properly masked.
- The q library is referenced by Ansible's debugging documentation as a useful module debugging tool.
