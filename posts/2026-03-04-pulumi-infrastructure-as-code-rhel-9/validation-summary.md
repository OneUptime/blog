# Validation Summary: How to Use Pulumi for Infrastructure as Code on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pulumi CLI
- Pulumi Python SDK
- Pulumi AWS provider
- Python 3.11 and pip
- AWS EC2, VPC, subnets, route tables, internet gateways, and security groups
- Terraform comparison

## Sources Consulted
- Pulumi installation documentation: https://www.pulumi.com/docs/install
- Pulumi `pulumi new` CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_new/
- Pulumi stack concepts documentation: https://www.pulumi.com/docs/iac/concepts/stacks/
- Pulumi `pulumi stack init` CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_init/
- Pulumi Python language documentation: https://www.pulumi.com/docs/iac/languages-sdks/python/
- Pulumi AWS `aws.ec2.get_ami` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/getami/
- Pulumi AWS `aws.ec2.Instance` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/instance/
- Red Hat RHEL 9 Python documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat Customer Portal guidance for official RHEL AMIs on EC2: https://access.redhat.com/solutions/99333

## Issues Found
No technical issues found.

## Review Notes
The Pulumi AWS Python SDK symbols used in the example, including `GetAmiFilterArgs`, `RouteTableRouteArgs`, `SecurityGroupIngressArgs`, and `vpc_security_group_ids`, were checked against the current package API. The sample security group allows SSH from `0.0.0.0/0`; this is technically valid but should be restricted in production environments. The EC2 instances do not set an SSH key pair, so the SSH ingress rule permits network access but does not by itself configure login credentials.
