# Validation Summary: How to Create Ansible Inventory from Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform local provider
- Terraform TLS provider
- Terraform provisioners and `local-exec`
- Ansible static inventory
- Ansible YAML inventory
- Ansible dynamic inventory scripts
- Python JSON and subprocess usage

## Sources Consulted
- HashiCorp Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Terraform `terraform output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform `terraform_data` resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform Registry `local_file` resource documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- Terraform Registry `local_sensitive_file` resource documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/sensitive_file
- Terraform Registry `tls_private_key` resource documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- Terraform Registry AWS `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry AWS `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible YAML inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- Ansible dynamic inventory development guide: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_inventory.html

## Issues Found
- The complete working example used `tls_private_key` without declaring the `hashicorp/tls` provider in `required_providers`. Added the `tls` provider declaration so the example is explicit and complete.
- The complete working example referenced `aws_security_group.web` and `aws_security_group.db` but did not define them. Added a default VPC lookup and minimal security group resources so the referenced resources exist.
- The complete working example referenced `aws_lb.main.dns_name` even though no load balancer resource was defined. Removed the undefined `load_balancer_dns` value from the generated Ansible variables.
- The best practices stated that generating SSH keys with Terraform ensures keys exist before inventory. Adjusted this to warn that `tls_private_key` stores private key material in Terraform state and state access must be protected.
- The best practices stated that `depends_on` ensures instances are ready before generating inventory. Adjusted this because `depends_on` controls Terraform dependency ordering, not service readiness such as SSH availability.
- The best practices stated that `local_sensitive_file` protects private keys. Adjusted this wording because sensitive local files avoid displaying content in Terraform output, but the private key still exists on disk and in Terraform state.

## Review Notes
- The `null_resource` example is still technically valid, but Terraform's built-in `terraform_data` resource is the modern option for attaching provisioners to lifecycle triggers when Terraform 1.4 or newer is available.
- The generated inventory examples assume the directories such as `inventory/`, `keys/`, and `ansible/group_vars/` already exist or are created separately.
- The database examples use private IP addresses, so the Ansible control node must have network access to those private addresses, such as through a VPN, bastion, or execution inside the VPC.
