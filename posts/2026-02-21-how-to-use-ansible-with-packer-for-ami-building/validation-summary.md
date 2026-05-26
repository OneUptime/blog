# Validation Summary: How to Use Ansible with Packer for AMI Building

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Packer HCL templates
- HashiCorp Packer Amazon EBS builder
- HashiCorp Packer Ansible provisioner
- Ansible playbooks and modules
- AWS AMIs and CloudWatch agent
- GitHub Actions CI/CD

## Sources Consulted
- HashiCorp Packer install documentation: https://developer.hashicorp.com/packer/install
- HashiCorp Packer build command reference: https://developer.hashicorp.com/packer/docs/commands/build
- HashiCorp Packer manifest post-processor documentation: https://developer.hashicorp.com/packer/docs/post-processors/manifest
- HashiCorp Packer Amazon EBS builder documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/amazon/latest/components/builder/ebs
- HashiCorp Packer Ansible provisioner documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/ansible/latest/components/provisioner/ansible
- Ansible installation documentation: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible release and maintenance documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- Ansible roles documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible apt module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- AWS CloudWatch agent package download documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/download-CloudWatch-Agent-on-EC2-Instance-commandline-first.html
- PyPI ansible package release page: https://pypi.org/project/ansible/

## Issues Found
- The Ubuntu/Debian Packer installation snippet omitted the architecture selector and used the older `lsb_release -cs` form. Updated it to match HashiCorp's current documented apt repository command.
- The CloudWatch agent download URL used an older S3 URL form. Updated it to AWS's documented Ubuntu x86-64 package URL.
- The GitHub Actions workflow ran `packer init`, `packer validate`, and `packer build` from the repository root while the template paths and manifest output were written for commands run from the `packer/` directory. Added `working-directory: packer` and adjusted the template path arguments.
- The workflow pinned `ansible==8.7.0`, but Ansible 8.x is unmaintained according to the current Ansible release table. Updated the example to `ansible==13.4.0`, the current PyPI release checked during review.
- The "Using Ansible Roles with Packer" text implied that Packer's `roles_path` directly references existing roles for playbook execution. Clarified that these Packer provisioner settings are for installing Galaxy roles or collections from a requirements file.

## Review Notes
- The main Packer HCL structure, `amazon-ebs` builder settings, `amazon-ami` data source usage, Ansible provisioner settings, manifest post-processor settings, and `packer build -debug` / `-on-error=ask` commands are consistent with the official documentation.
- The `base_ami` variable in the Packer example is unused because the template uses the `amazon-ami` data source. This is not a syntax error, but removing it would make the example cleaner in a future editorial pass.
