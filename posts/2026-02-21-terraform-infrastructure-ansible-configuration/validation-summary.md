# Validation Summary: How to Use Terraform for Infrastructure and Ansible for Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HashiCorp Configuration Language (HCL)
- AWS EC2 / Terraform AWS provider
- Terraform CLI
- Ansible playbooks
- Ansible collections and modules
- UFW
- OpenSSH on Ubuntu

## Sources Consulted
- Terraform AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform CLI `plan` command: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform saved plan workflow tutorial: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/resources/provisioners/syntax
- Ansible playbooks documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_intro.html
- Ansible inventory documentation: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible `amazon.aws.ec2_instance` module: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- Ansible `community.general.timezone` module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.service` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ubuntu OpenSSH server documentation: https://documentation.ubuntu.com/server/how-to/security/openssh-server/

## Issues Found
- The handoff script ran `python3 scripts/generate_inventory.py` after changing into the `terraform` directory, which would look for `terraform/scripts/generate_inventory.py`. Changed it to `python3 ../scripts/generate_inventory.py` to match the shown `scripts/deploy.sh` project layout.
- The post used `ansible.builtin.timezone`, but the current documented fully qualified module name is `community.general.timezone`. Updated the playbook example accordingly.
- The playbook used `community.general.ufw` without ensuring the `ufw` package is present, even though the module lists `ufw` as a host requirement. Added `ufw` to the installed package list.
- The Ubuntu-oriented example restarted service `sshd`, while Ubuntu documents the OpenSSH service as `ssh.service`. Updated the Ansible service name to `ssh`.
- The Common Use Cases section referred to "this module" even though the post is about Terraform/Ansible separation rather than a module. Updated those references to "this separation."

## Review Notes
The main separation-of-concerns guidance is technically sound. Terraform provisioners and AWS `user_data` are valid mechanisms, but the post correctly treats provisioners as an anti-pattern for ongoing configuration and keeps `user_data` limited to minimal bootstrap work. The examples remain illustrative and assume Debian/Ubuntu-style hosts because they use `apt-get`, `/etc/hosts` with `127.0.1.1`, UFW, and Ubuntu's `ssh` service name.
