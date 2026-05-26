# Validation Summary: How to Use Ansible for Immutable Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Packer
- HashiCorp Packer Amazon and Ansible plugins
- AWS AMIs and Auto Scaling Groups
- Terraform AWS provider
- cloud-init
- GitHub Actions

## Sources Consulted
- HashiCorp Packer Ansible provisioner documentation: https://developer.hashicorp.com/packer/plugins/provisioners/ansible/ansible
- HashiCorp Packer Amazon EBS builder documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/amazon/latest/components/builder/ebs
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- cloud-init instance-data and Jinja templating documentation: https://docs.cloud-init.io/en/latest/explanation/instancedata.html
- Terraform string template escaping documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform AWS provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- HashiCorp `setup-packer` GitHub Action documentation: https://github.com/hashicorp/setup-packer

## Issues Found
- The post implied there is no SSH anywhere in the immutable workflow, but Packer's remote Ansible provisioner connects to the build instance over SSH during image creation. Updated the wording and diagram label to clarify that SSH is avoided for production instance changes, not necessarily during image builds.
- The Ansible cleanup task used `ansible.builtin.file` with wildcard paths such as `/tmp/*`. The file module takes a path and does not perform shell glob expansion. Changed the example to remove and recreate `/tmp` and `/var/tmp` with sticky-bit permissions.
- The apt cleanup example used `autoclean` for image-size cleanup. Updated it to `clean`, which maps to `apt-get clean` and removes retrieved package files from the apt archives.
- The zero-free-space task used `ansible.builtin.command` with `|| true`, but shell operators are not interpreted by the command module. Changed it to `ansible.builtin.shell`.
- The application role used the `myapp` owner before showing creation of the `myapp` account. Added an `ansible.builtin.user` task before creating application-owned paths.
- The cloud-init example mixed Terraform template variables with runtime instance metadata placeholders that Terraform would try to interpolate incorrectly. Updated the snippet to use cloud-init Jinja instance-data for `INSTANCE_ID` and AWS local IPv4, while leaving Terraform to render only the deployment environment.
- The Auto Scaling Group used `version = "$Latest"` in the launch template block. Updated it to `aws_launch_template.web_server.latest_version` so Terraform can detect launch template version changes and trigger instance refresh behavior as documented.

## Review Notes
The examples are illustrative and still assume surrounding infrastructure exists, including IAM permissions, networking, security groups, an application repository variable, and a service template. The GitHub Actions example uses long-lived AWS access keys; in a production article, OIDC-based AWS authentication would be a stronger recommendation, but the shown environment variables are still technically valid.
