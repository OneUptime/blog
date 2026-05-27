# Validation Summary: How to Use Ansible with Packer for Image Building

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Packer HCL templates
- HashiCorp Packer Amazon EBS builder
- HashiCorp Packer Ansible provisioner
- Ansible playbooks and modules
- GitHub Actions workflows
- AWS EC2 AMI and Instance Metadata Service
- Docker image pre-pulling with Ansible

## Sources Consulted
- HashiCorp Packer Ansible provisioner documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/ansible/latest/components/provisioner/ansible
- HashiCorp Packer Amazon EBS builder documentation: https://developer.hashicorp.com/packer/plugins/builders/amazon/ebs
- HashiCorp Packer HCL template documentation: https://developer.hashicorp.com/packer/docs/templates/hcl_templates
- HashiCorp Packer init command documentation: https://developer.hashicorp.com/packer/docs/commands/init
- HashiCorp Packer validate command documentation: https://developer.hashicorp.com/packer/docs/commands/validate
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible built-in apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible built-in service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible built-in template module documentation: https://docs.ansible.com/ansible/8/collections/ansible/builtin/template_module.html
- Ansible built-in copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible built-in hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible built-in uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible community.docker.docker_image module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_image_module.html
- AWS EC2 Instance Metadata Service documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The Packer Ansible example used Packer's `roles_path` setting as if it configured Ansible role lookup during `ansible-playbook` execution. Packer documents that setting for `ansible-galaxy`; Ansible role lookup should use `roles_path` configuration or the `ANSIBLE_ROLES_PATH` environment variable. Changed the provisioner to set `ANSIBLE_ROLES_PATH=../ansible/roles` in `ansible_env_vars`.
- The GitHub Actions workflow validated and built a template with `required_plugins` but did not run `packer init` first. Packer documents `packer init` as the command that installs plugins declared in the `required_plugins` block. Added a `packer init packer/base-image.pkr.hcl` step before validation.
- The GitHub Actions path filter watched Ansible roles and Packer files, but not Ansible playbooks. Added `ansible/playbooks/**` so playbook-only changes trigger image builds.
- The first-boot hostname example read EC2 instance metadata without an IMDSv2 token. AWS documents that IMDSv2 requires a `PUT` token request and then a token header on metadata `GET` requests. Replaced the direct lookup with `ansible.builtin.uri` tasks that fetch an IMDSv2 token, read `local-hostname`, and pass that value to `ansible.builtin.hostname`.

## Review Notes
- The `community.docker.docker_image` module is still documented, but the current community.docker docs recommend the newer purpose-specific modules such as `community.docker.docker_image_pull`. The existing example remains technically valid.
- The example AMI ID is a placeholder. A real build must supply a valid Ubuntu AMI ID or use a `source_ami_filter`.
