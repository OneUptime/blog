# Validation Summary: How to Choose Between Ansible and Terraform for Your Use Case

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Ansible
- Terraform
- AWS Terraform provider resources
- YAML playbooks
- HCL configuration
- UFW firewall management
- Cron scheduling

## Sources Consulted
- Terraform language overview: https://developer.hashicorp.com/terraform/language
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state
- Terraform resource configuration documentation: https://developer.hashicorp.com/terraform/language/resources
- Terraform references and implicit dependencies: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform AWS provider `aws_vpc` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform AWS provider `aws_subnet` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Ansible builtin collection index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible error handling in playbooks: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The comparison table described Ansible as only SSH-based. Ansible is agentless, but current built-in connection plugins also include WinRM and PSRP for Windows targets, so the table now says `SSH/WinRM-based`.
- The infrastructure workflow used `ansible.builtin.timezone`, but the timezone module is provided by the `community.general` collection in current Ansible documentation. Changed it to `community.general.timezone`.
- The SSH hardening handler restarted `sshd` while the surrounding example uses Debian/Ubuntu-oriented tooling such as UFW and package names. Debian and Ubuntu commonly use the `ssh` service name, so the handler now restarts `ssh`.
- The fallback error-handling example would stop at the fallback command if the fallback failed, preventing the later explicit `ansible.builtin.fail` task from running. Added `failed_when: false` to the fallback command so the final failure task reports the intended "both paths failed" condition.

## Review Notes
The remaining examples are illustrative and omit environment-specific prerequisites such as provider configuration for Terraform, inventory definitions for Ansible, required packages like `ufw` and `tzdata`, existing users such as `ansible`, and template files referenced by the playbooks. Those omissions are acceptable for short comparison examples, but complete production playbooks should define them explicitly.
