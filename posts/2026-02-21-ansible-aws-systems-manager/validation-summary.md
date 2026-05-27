# Validation Summary: How to Use Ansible with AWS Systems Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- community.aws Ansible collection
- AWS Systems Manager Session Manager
- AWS Systems Manager Parameter Store
- AWS Systems Manager Run Command
- AWS CLI

## Sources Consulted
- Ansible amazon.aws.aws_ssm connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ssm_connection.html
- Ansible amazon.aws.ssm_parameter lookup plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ssm_parameter_lookup.html
- Ansible community.aws.ssm_parameter module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/ssm_parameter_module.html
- AWS CLI ssm send-command command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html
- AWS Systems Manager Run Command walkthrough: https://docs.aws.amazon.com/systems-manager/latest/userguide/walkthrough-cli.html
- AWS Systems Manager command document plugin reference: https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-command-ssm-plugin-reference.html

## Issues Found
- The SSM connection inventory example used the short connection plugin name `aws_ssm`. Current Ansible documentation says the fully qualified plugin name is `amazon.aws.aws_ssm`, so the snippet was updated to use that form.
- The Run Command example used `community.aws.ssm_document` with `targets` and `parameters` as if it sent an SSM command. Current Ansible collection docs do not provide that module as a Run Command sender, and AWS documents Run Command execution through `ssm send-command`. The snippet was changed to an `ansible.builtin.command` task that delegates to localhost and calls `aws ssm send-command` with `AWS-RunShellScript`, tag targets, parameters, and region.

## Review Notes
- The Parameter Store lookup and parameter creation examples match the current `amazon.aws.ssm_parameter` lookup and `community.aws.ssm_parameter` module documentation.
- The `amazon.aws.aws_ssm` connection plugin requires SSM Agent on the instance, the Session Manager plugin on the controller, and an S3 bucket for Ansible file transfer; the post's bucket variable is consistent with this requirement.
- Local `ansible-doc` and `aws` CLI validation could not be run because those commands are not installed in the workspace. YAML code blocks were parsed successfully with Python's YAML library.
