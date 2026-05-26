# Validation Summary: How to Create an Ansible Inventory from AWS CloudFormation Outputs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible dynamic inventory scripts
- Ansible `amazon.aws.aws_ec2` inventory plugin
- Ansible `amazon.aws.cloudformation_info` module
- AWS CloudFormation stack outputs
- AWS CloudFormation EC2 resource tags
- AWS CLI CloudFormation commands
- Python and boto3

## Sources Consulted
- Ansible `amazon.aws.aws_ec2` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible `amazon.aws.cloudformation_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/cloudformation_info_module.html
- Ansible `ansible.builtin.add_host` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/add_host_module.html
- Ansible dynamic inventory development guide: https://ansible.readthedocs.io/projects/ansible-core/devel/dev_guide/developing_inventory.html
- Boto3 CloudFormation `describe_stacks` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudformation/client/describe_stacks.html
- AWS CloudFormation Outputs syntax documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html
- AWS CloudFormation `AWS::EC2::Instance` resource documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-instance.html
- AWS CloudFormation resource tagging documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-resource-tags.html
- AWS CLI `cloudformation wait stack-update-complete` documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/wait/stack-update-complete.html

## Issues Found
- The `aws_ec2` inventory plugin example used `inventory/aws_ec2_cfn.yml`, but the official plugin documentation requires inventory source files to end with `aws_ec2.yml` or `aws_ec2.yaml`. Changed the example filename and command to `inventory/cfn.aws_ec2.yml`.
- The CloudFormation template example output referenced `!Ref VPC` without defining a `VPC` parameter or resource. Added a `VPC` parameter of type `AWS::EC2::VPC::Id` so the output reference is valid.
- The `cloudformation_info` playbook example looped over `subelements('cloudformation')`, but the module returns a `cloudformation` dictionary keyed by stack name, with stack outputs under `stack_outputs`. Reworked the example to read `item.cloudformation[item.item.name].stack_outputs`, build host records from the configured output key, and pass those records to `add_host`.

## Review Notes
- The AWS EC2 plugin approach is valid for EC2 instances managed by CloudFormation, and CloudFormation stack tags such as `aws:cloudformation:stack-name` are appropriate for filtering.
- The custom dynamic inventory scripts use the expected `--list`, `--host`, and `_meta.hostvars` structure. In production, caching and stricter error handling would be useful, but the examples are technically valid for a tutorial.
- The AWS CLI update wrapper is syntactically valid for stacks that have actual changes to apply. In production, scripts often handle the "No updates are to be performed" case explicitly.
