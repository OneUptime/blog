# Validation Summary: How to Set Up Ansible Inventory with AWS SSM Parameters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible dynamic inventory
- Ansible amazon.aws collection
- AWS Systems Manager Parameter Store
- AWS Systems Manager Session Manager
- AWS CLI
- Python boto3
- IAM policies

## Sources Consulted
- Ansible amazon.aws.aws_ssm connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ssm_connection.html
- Ansible amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible amazon.aws.ssm_parameter lookup plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ssm_parameter_lookup.html
- Ansible community.aws.ssm_parameter module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/ssm_parameter_module.html
- AWS CLI put-parameter command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/put-parameter.html
- AWS CLI get-parameters-by-path command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameters-by-path.html
- AWS Session Manager plugin installation documentation for Debian/Ubuntu: https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-debian-and-ubuntu.html
- AWS Session Manager sample IAM policies: https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html

## Issues Found
- The post installed and configured the `community.aws` collection for the SSM connection plugin. Current Ansible documentation places the connection plugin in `amazon.aws` and treats `community.aws.aws_ssm` as a redirect, so the install command and connection FQCNs were changed to `amazon.aws` / `amazon.aws.aws_ssm`.
- The playbook example used `amazon.aws.ssm_parameter` as a module to read a parameter. Current documentation provides `amazon.aws.ssm_parameter` as a lookup plugin, while the similarly named `community.aws.ssm_parameter` module manages Parameter Store entries. The example was changed to use `lookup('amazon.aws.ssm_parameter', ...)`.
- The lookup paragraph still referred to the old `aws_ssm` lookup name. It was updated to refer to the current `ssm_parameter` lookup name.
- The Session Manager IAM snippet used `AWS-StartSSHSession`, which is for SSH over Session Manager, not the normal shell session used by the Ansible SSM connection. It was changed to `SSM-SessionManagerRunShell`.
- The Session Manager IAM snippet omitted permissions required by the Ansible connection plugin and AWS Session Manager examples, including `ssmmessages:OpenDataChannel` and S3 bucket permissions for Ansible module file transfer. These permissions were added.

## Review Notes
The dynamic inventory script is syntactically valid and follows Ansible's executable inventory script shape for `--list` and `--host`. In production, teams may want stronger error handling for malformed JSON values and missing `--host` arguments, but those are robustness improvements rather than correctness fixes for the tutorial.
