# Validation Summary: How to Use Ansible with CloudFormation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Amazon AWS Ansible collection
- AWS CloudFormation
- Amazon EC2
- Amazon VPC
- UFW
- Cron

## Sources Consulted
- Ansible `amazon.aws.cloudformation` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/cloudformation_module.html
- Ansible `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- AWS CloudFormation `AWS::EC2::Instance` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-instance.html
- AWS CloudFormation `AWS::EC2::SecurityGroup` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroup.html
- AWS CloudFormation `AWS::EC2::VPCGatewayAttachment` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcgatewayattachment.html
- Amazon VPC internet gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html

## Issues Found
- The introduction described CloudFormation support as a built-in Ansible module. Current Ansible documentation places `amazon.aws.cloudformation` in the `amazon.aws` collection, which may be installed with the full `ansible` package but is not part of `ansible-core`. Updated the wording to name the collection module accurately.
- The CloudFormation template output a private EC2 IP address while the Ansible play waited for SSH from `localhost`. The template also lacked an internet gateway, a route to the internet gateway, route table association, and an SSH ingress security group, so the wait task would not be reachable from the Ansible controller. Added the missing public subnet networking resources, attached a security group to the instance, and changed the output to `WebServer.PublicIp`.
- The EC2 instance now has an explicit dependency on the VPC gateway attachment when using a public IP in a VPC created by the same template, matching AWS CloudFormation guidance.
- The update playbook omitted the required `KeyName` template parameter. Added `use_previous_value: true` for `KeyName` so updates to an existing stack can reuse the previous key pair parameter value.

## Review Notes
- The placeholder AMI ID (`ami-0abcdef1234567890`) must be replaced with a valid AMI for the target AWS region before running the example.
- The security group example allows SSH from `0.0.0.0/0` for simplicity. In production, restrict this to a trusted CIDR block.
- `ansible-playbook` and `cfn-lint` were not installed in the local environment, so validation was performed against official documentation rather than by executing the playbooks or linting the CloudFormation template locally.
