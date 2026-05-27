# Validation Summary: How to Configure Ansible to Use Python 3

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible-core
- Python 3
- Ansible inventory variables
- ansible.cfg
- Ansible playbooks and modules
- community.general collection

## Sources Consulted
- Ansible Interpreter Discovery: https://docs.ansible.com/projects/ansible/latest/reference_appendices/interpreter_discovery.html
- Ansible Configuration Settings, INTERPRETER_PYTHON and INTERPRETER_PYTHON_FALLBACK: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Releases and Maintenance support matrix: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/release_and_maintenance.html
- ansible.builtin.raw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.builtin.assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- ansible.builtin.version test documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/version_test.html

## Issues Found
- The post listed an incorrect fixed `interpreter_python = auto` search order. Updated it to describe Ansible's configurable fallback list and the current documented default order.
- The per-host override example used Python 3.6 for a legacy host. Updated it to Python 3.9, which is within the documented support range for current ansible-core releases.
- The raw-module Python installation tasks were guarded with `when: false`, so the example would never install Python. Replaced those placeholders with shell checks for `apt-get`, `dnf`, and `yum`.
- The summary claimed all modern Ansible versions 2.16+ require Python 3.10+ on the controller and Python 3.7+ on remote hosts. Updated it to note that requirements vary by ansible-core release and gave the current ansible-core 2.21 support range.
- The common-use-case text referred to "this module" even though the article is about interpreter configuration. Updated those references to "this configuration."
- The infrastructure example used `ansible.builtin.timezone`, but the current timezone module is `community.general.timezone`. Updated the module name.
- The SSH restart handler hard-coded `sshd`, which is not the service name on common Debian/Ubuntu targets. Changed it to a configurable `ssh_service_name` defaulting to `ssh`.

## Review Notes
The examples use modules from the `community.general` collection (`community.general.timezone` and `community.general.ufw`), so users running only `ansible-core` will need that collection installed. The post's main Ansible interpreter configuration guidance is now aligned with current official documentation.
