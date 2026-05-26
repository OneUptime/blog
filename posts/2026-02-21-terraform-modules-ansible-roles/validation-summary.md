# Validation Summary: How to Use Terraform Modules with Ansible Roles

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform modules
- Terraform input variables and output values
- AWS EC2 resources via the Terraform AWS provider
- Ansible roles and playbooks
- Ansible built-in modules
- Ansible community.general collection modules
- Cron-based automation

## Sources Consulted
- Terraform module usage documentation: https://developer.hashicorp.com/terraform/language/modules/configuration
- Terraform output values documentation: https://developer.hashicorp.com/terraform/language/values/outputs
- Terraform AWS provider aws_instance resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible include_tasks module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible package module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible fail module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fail_module.html
- community.general timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The "Common Use Cases" introduction referred to "this module", but the post is about aligning Terraform modules with Ansible roles rather than a single module. Changed it to "this approach".
- The timezone example used `ansible.builtin.timezone`, but current Ansible documentation exposes timezone management through `community.general.timezone`. Updated the module name.
- The SSH hardening regexes only matched uncommented directives. Updated them to match both commented and uncommented `PermitRootLogin` and `PasswordAuthentication` lines.
- The SSH restart handler used service name `sshd`, which is not the default service name on Ubuntu/Debian systems implied by the post's `apt` and Ubuntu examples. Updated it to `ssh`.
- The compliance scan example wrote `/opt/scripts/compliance_scan.sh` without ensuring `/opt/scripts` exists. Added an `ansible.builtin.file` task to create the directory first.

## Review Notes
The Terraform snippets are illustrative and omit surrounding provider, AMI data source, networking, and security group details. That is acceptable for the post's focus, but readers would need those pieces for a complete runnable Terraform configuration. The Ansible examples assume the `community.general` collection is available for `timezone` and `ufw`.
