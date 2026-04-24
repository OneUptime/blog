# Validation Summary: How to Use Provisioners as a Last Resort in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform-style HCL
- AWS EC2
- AWS Systems Manager
- cloud-init
- Packer
- Configuration management tools (Ansible, Chef, Puppet)

## Sources Consulted
- OpenTofu provisioner syntax docs: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu `remote-exec` docs: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu `local-exec` docs: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- HashiCorp AWS provider `aws_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS provider `aws_ssm_association` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_association
- HashiCorp AWS provider `aws_ssm_document` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_document
- Amazon EC2 user data docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- AWS Systems Manager Run Command docs: https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command.html
- AWS Systems Manager document schema docs: https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-schemas-features.html
- AWS Systems Manager State Manager association docs: https://docs.aws.amazon.com/systems-manager/latest/userguide/state-manager-associations-creating.html
- cloud-init datasource docs: https://cloudinit.readthedocs.io/en/latest/reference/datasources.html

## Issues Found
- The `remote-exec` example omitted the required `connection` block. I added a valid SSH connection example so the snippet is syntactically correct for `remote-exec`.
- The EC2 `user_data` example incorrectly base64-encoded plain text while assigning it to `user_data`. I changed it to plain heredoc text because base64-encoded input belongs in `user_data_base64`, not `user_data`.
- The AWS Systems Manager section was labeled as Run Command, but the snippet only created an SSM document and never applied it to any instance. I corrected the section to State Manager and added an `aws_ssm_association` so the document is actually associated with a managed instance.
- A few claims about provisioner behavior were broader than the official docs support. I tightened them to match the documented behavior around plan modeling, idempotency, and semi-configured states after failure.

## Review Notes
- The AWS Systems Manager example assumes the target EC2 instance is already a Systems Manager managed instance with the required IAM permissions, SSM Agent availability, and network access.
- The conclusion’s recommendation to prefer `local-exec` over `remote-exec` is reasonable in practice because `remote-exec` requires a connection block and remote access plumbing, but provisioners remain a last-resort option in either case.
