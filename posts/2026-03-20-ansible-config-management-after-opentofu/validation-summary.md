# Validation Summary: How to Use Ansible for Configuration Management After OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Ansible
- AWS EC2
- GitHub Actions
- HCL
- YAML
- Bash

## Sources Consulted
- OpenTofu `output` command docs: https://opentofu.org/docs/cli/commands/output/
- OpenTofu `templatefile` function docs: https://opentofu.org/docs/language/functions/templatefile/
- OpenTofu output values docs: https://opentofu.org/docs/v1.9/language/values/outputs/
- Ansible `wait_for_connection` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible connection details: https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html
- Ansible host list inventory plugin docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_list_inventory.html
- Ansible patterns docs: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible CLI docs: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- AWS EC2 AMI docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html
- AWS provider `aws_instance` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_ami` data source docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- GitHub Actions workflow syntax docs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The EC2 example used a hard-coded AMI ID. I replaced it with an `aws_ami` data source lookup because AMIs are region-specific and the original ID was not a portable current example.
- The Phase 3 readiness check used `ansible ... -m ping --timeout=30` while claiming it would wait for SSH. I changed it to `ansible.builtin.wait_for_connection`, which is the documented polling module for waiting until a host is reachable.
- The CI example passed `-i "${WEB_IP},"` to `ansible-playbook` while the playbook targets `hosts: web`. I changed the workflow example to generate an inventory with a `web` group and run the same wait step before the playbook.
- The inventory-generation comment called the file “dynamic inventory”, which is inaccurate in Ansible terminology for a generated static inventory file. I corrected the wording.
- The summary said OpenTofu resource IDs are fed into Ansible inventory. I changed that to connection details and other values, because inventory targets hosts and related connection variables rather than arbitrary resource IDs.

## Review Notes
- The GitHub Actions snippet is still a partial workflow excerpt. It assumes `tofu`, `ansible`, and `jq` are installed earlier in the job and that AWS credentials and the SSH private key are already available to the runner.
- The AMI lookup now avoids a region-specific hard-coded ID, but it is still intentionally pinned to the Ubuntu 22.04 image naming pattern. If the post is updated later to target a newer Ubuntu release, only that filter value should need to change.
