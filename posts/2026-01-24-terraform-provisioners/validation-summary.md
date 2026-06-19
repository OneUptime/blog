# Validation Summary: How to Use Provisioners in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform provisioners
- Terraform `remote-exec`, `local-exec`, and `file` provisioners
- Terraform connection blocks for SSH and WinRM
- Terraform `terraform_data`
- AWS EC2 and AWS CLI Elastic Load Balancing commands
- cloud-init and EC2 user data
- Packer-built AMIs
- Ansible
- Kubernetes `kubectl`

## Sources Consulted
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Terraform resource block/provisioner reference: https://developer.hashicorp.com/terraform/language/block/resource
- Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform `pathexpand` function reference: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- Terraform `file` function reference: https://developer.hashicorp.com/terraform/language/functions/file
- AWS provider `aws_instance` resource reference: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS CLI `elbv2 deregister-targets` reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/deregister-targets.html
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- cloud-init user-data format documentation: https://docs.cloud-init.io/en/latest/explanation/format/index.html
- Packer Amazon EBS builder documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/amazon/latest/components/builder/ebs
- Ansible `ansible-playbook` documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html

## Issues Found
- SSH key examples used `file("~/.ssh/...")`. Terraform's `file` function reads the path literally, while `pathexpand` is the documented function for expanding `~`. Updated key reads to `file(pathexpand("~/.ssh/..."))`.
- The SSH `file` provisioner directory upload example copied `app/` to `/home/ubuntu/app` without ensuring the destination directory existed. Terraform requires the destination directory to already exist for SSH directory uploads. Added a preceding `remote-exec` step to create the directory.
- The destroy-time provisioner referenced `var.target_group_arn` directly inside the destroy provisioner command. Destroy-time provisioners should rely on the related resource's attributes via `self`. Added the target group ARN to the instance tags and referenced it through `self.tags.target_group_arn`.
- Standalone provisioner examples used `null_resource`. Current Terraform documentation recommends `terraform_data` for provisioners that are not associated with another managed resource. Replaced `null_resource` examples with `terraform_data` and changed `triggers` to `triggers_replace`.

## Review Notes
Terraform was not installed in the local environment, so syntax was reviewed manually against official documentation rather than by running `terraform validate`. The examples remain illustrative and assume supporting variables, providers, AWS credentials, SSH access, security group rules, and external tools such as Ansible, AWS CLI, and `kubectl` are configured.
