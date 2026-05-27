# Validation Summary: How to Use Ansible with Pulumi for Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi
- Pulumi AWS provider
- Pulumi Automation API
- Ansible
- AWS EC2 and VPC
- YAML inventory
- Python

## Sources Consulted
- Pulumi CLI documentation for `pulumi stack output --json`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_output/
- Pulumi CLI documentation for `pulumi up --yes`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_up
- Pulumi Automation API documentation: https://www.pulumi.com/docs/iac/concepts/automation-api/
- Pulumi Python SDK Automation API reference: https://www.pulumi.com/docs/reference/pkg/python/pulumi/
- Pulumi AWS `aws.ec2.Instance` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/instance/
- Pulumi AWS `aws.ec2.get_ami` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/getami/
- Pulumi AWS `aws.ec2.SecurityGroup` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/securitygroup/
- Ansible YAML inventory documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- Ansible `ansible.builtin.setup` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible `community.general.timezone` documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.uri` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.cron` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ubuntu OpenSSH server documentation: https://documentation.ubuntu.com/server/how-to/security/openssh-server/

## Issues Found
- The Pulumi EC2 example used a placeholder AMI ID (`ami-0abcdef1234567890`) that would not launch. Replaced it with a Pulumi `aws.ec2.get_ami` lookup for the latest Ubuntu 22.04 LTS AMI owned by Canonical in the configured region.
- The inventory generation script did not check whether `pulumi stack output --json` succeeded before parsing stdout. Added `check=True` to fail clearly if the Pulumi CLI command fails.
- The inventory generation examples wrote to `inventories/pulumi-generated.yml` without ensuring the `inventories` directory exists. Added `os.makedirs("inventories", exist_ok=True)` in both scripts.
- The Automation API inventory generation omitted the SSH connection variables shown in the standalone inventory script. Added `ansible_user` and `ansible_ssh_private_key_file` to keep the generated inventory usable with the provisioned Ubuntu instances.
- The Ansible timezone task used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. Updated the task to use `community.general.timezone`.
- The Ubuntu-oriented playbook restarted service `sshd`, while Ubuntu documents the OpenSSH service as `ssh.service`. Updated the service name to `ssh`.
- The Common Use Cases text referred to "this module" even though the post is about using Pulumi and Ansible together, not an Ansible module. Reworded those references to avoid a misleading technical label.

## Review Notes
The snippets are still examples and assume existing AWS credentials, a Pulumi stack/project, an EC2 key pair named `deploy-key`, PyYAML installed for the inventory scripts, and network reachability to the instances' private IP addresses. Local Pulumi and Ansible CLIs were not installed in the workspace, so command validation was performed against official documentation instead of local `--help` output.
