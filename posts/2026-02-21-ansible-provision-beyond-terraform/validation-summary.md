# Validation Summary: How to Use Ansible to Provision Resources Terraform Cannot Manage

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules
- Ansible community collections
- Terraform providers and provisioners
- YAML
- Linux system configuration
- UFW firewall management
- Cron scheduling

## Sources Consulted
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.netcommon.cli_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/cli_config_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible playbook loop and retry documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Terraform resource documentation: https://developer.hashicorp.com/terraform/language/resources
- Terraform provider documentation: https://developer.hashicorp.com/terraform/language/providers
- Terraform provisioner documentation: https://developer.hashicorp.com/terraform/language/resources/provisioners/syntax

## Issues Found
- The infrastructure workflow used `ansible.builtin.timezone`, but current Ansible documentation places the timezone module in the `community.general` collection. Changed it to `community.general.timezone`.
- The text and comments referred to "this module" even though the post discusses Ansible broadly, not a specific module. Changed those references to "Ansible" to avoid a misleading technical framing.

## Review Notes
The examples are broadly accurate for modern Ansible usage. Some snippets use short module names such as `uri`, `pause`, `command`, and `lineinfile`; these remain valid, though Ansible documentation generally recommends fully qualified collection names for clarity. Terraform also has provisioners for last-resort post-apply operations, but the post's core point remains accurate: Terraform resource management is provider-based, while Ansible is better suited for imperative configuration and orchestration workflows.
