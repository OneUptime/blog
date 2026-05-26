# Validation Summary: How to Use Terraform for Multi-Cloud with Ansible Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform AzureRM provider
- Terraform CLI outputs
- Ansible playbooks
- Ansible inventory
- Ansible built-in modules
- Ansible community.general collection
- AWS EC2
- Azure Linux virtual machines

## Sources Consulted
- Terraform CLI commands and output documentation: https://developer.hashicorp.com/terraform/cli/commands and https://developer.hashicorp.com/terraform/tutorials/cli/console
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AzureRM provider `azurerm_linux_virtual_machine` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Ansible built-in collection index and module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.lineinfile` and `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html and https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible inventory guide: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html

## Issues Found
- The Azure `azurerm_linux_virtual_machine` example omitted required arguments including `resource_group_name`, `location`, `admin_username`, `network_interface_ids`, `os_disk`, and image configuration. Added those fields using the current AzureRM resource schema.
- The inventory generation script referenced `terraform output -json web_ips`, but the Terraform examples did not define `web_ips`. Added matching AWS and Azure output blocks.
- The Ansible example described the `apt` task as working on any cloud while using a Debian/Ubuntu-specific package module. Updated the comment to scope it to Ubuntu/Debian hosts, used the documented `ansible.builtin.apt` FQCN, replaced the placeholder `monitoring-agent` package with `curl`, and added `update_cache: true`.
- The timezone task used `ansible.builtin.timezone`, but current Ansible documentation lists timezone management under `community.general.timezone`. Updated the FQCN.
- The SSH restart handler used service name `sshd`, which is not the default service name on Ubuntu/Debian systems targeted by the examples. Changed it to `ssh`.
- The scheduled cron job used `user: ansible`, which may fail unless that local user already exists. Changed it to `root` for a portable privileged cron example.

## Review Notes
The Terraform snippets still assume supporting network resources, security group rules, credentials, and provider authentication are defined elsewhere. The Azure VM output returns the VM public IP attribute, which requires the VM's network interface to be associated with a public IP address if SSH is expected from outside the private network.
