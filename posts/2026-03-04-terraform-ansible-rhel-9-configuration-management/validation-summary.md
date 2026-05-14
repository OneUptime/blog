# Validation Summary: How to Use Terraform with Ansible for RHEL Configuration Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Terraform
- Terraform AWS provider
- Terraform Local provider
- Terraform Null provider
- Amazon EC2
- AWS security groups
- Ansible
- Ansible collections
- firewalld
- DNF

## Sources Consulted
- HashiCorp Terraform installation documentation: https://developer.hashicorp.com/terraform/install
- Terraform AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform Local provider `local_file` documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- Terraform Null provider `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- Terraform provisioner `local-exec` documentation: https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible `ansible.builtin.systemd` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- AWS VPC default security group documentation: https://docs.aws.amazon.com/vpc/latest/userguide/default-security-group.html
- AWS EC2 security groups documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
- Red Hat documentation for identifying official RHEL AMIs on AWS: https://access.redhat.com/solutions/99333

## Issues Found
- The install section used `dnf config-manager` without first installing the DNF plugin package that provides it on RHEL systems. I added `sudo dnf install -y dnf-plugins-core` before adding the HashiCorp repository.
- The post installed only `ansible-core`, but the playbook uses `community.general.timezone` and `ansible.posix.firewalld`, which are not included in `ansible-core`. I added an `ansible-galaxy collection install community.general ansible.posix` command.
- The Terraform configuration used `local_file` and `null_resource` without declaring the Local and Null providers in `required_providers`. I added explicit `hashicorp/local` and `hashicorp/null` provider declarations.
- The EC2 instances did not define a security group. AWS attaches the VPC default security group when none is specified, and its default inbound rules do not allow SSH from the internet, so the Ansible inventory would usually be unreachable. I added a dedicated security group with SSH, HTTP, and outbound IPv4 rules and attached it to the instances.

## Review Notes
The RHEL AMI owner ID, Terraform `templatefile` usage, Local provider inventory file generation, Ansible inventory syntax, DNF package tasks, systemd tasks, firewalld task parameters, and `local-exec` provisioner syntax are consistent with the reviewed documentation. The example still uses `null_resource`, which works, but HashiCorp's current Null provider documentation recommends `terraform_data` for Terraform 1.4 and later.
