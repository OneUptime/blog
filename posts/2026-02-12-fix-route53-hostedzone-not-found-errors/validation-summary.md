# Validation Summary: How to Fix Route 53 'HostedZone not found' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon Route 53
- AWS CLI
- AWS CloudFormation
- Terraform AWS provider
- AWS IAM
- AWS CloudTrail
- DNS delegation

## Sources Consulted
- AWS CLI Command Reference: route53 get-hosted-zone: https://docs.aws.amazon.com/cli/latest/reference/route53/get-hosted-zone.html
- AWS CLI Command Reference: route53 list-hosted-zones: https://docs.aws.amazon.com/cli/latest/reference/route53/list-hosted-zones.html
- AWS CLI Command Reference: route53 associate-vpc-with-hosted-zone: https://docs.aws.amazon.com/cli/latest/reference/route53/associate-vpc-with-hosted-zone.html
- AWS CLI Command Reference: cloudtrail lookup-events: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- Amazon Route 53 API Reference: GetHostedZone: https://docs.aws.amazon.com/Route53/latest/APIReference/API_GetHostedZone.html
- Amazon Route 53 Developer Guide: Associating a VPC and private hosted zone from different AWS accounts: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-associate-vpcs-different-accounts.html
- Amazon Route 53 Developer Guide: Public hosted zone considerations: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-public-considerations.html
- AWS CloudFormation Template Reference: AWS::Route53::RecordSet: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-route53-recordset.html
- AWS CloudFormation User Guide: AWS-specific parameter types: https://docs.amazonaws.cn/en_us/AWSCloudFormation/latest/UserGuide/cloudformation-supplied-parameter-types.html
- AWS Service Authorization Reference: Amazon Route 53 actions and resources: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonroute53.html
- Terraform Registry: aws_route53_zone data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone

## Issues Found
- The post said `aws route53 get-hosted-zone --id /hostedzone/Z1234567890ABC` also works. The AWS CLI reference documents the hosted zone ID argument as a maximum of 32 characters and shows the bare ID format, so I removed the prefixed command example and clarified that the `/hostedzone/` prefix should be stripped for commands and templates.
- The post described private hosted zones as "visible" only to associated VPCs and listed private-zone VPC association as a direct cause of an API "HostedZone not found" error. Route 53 private hosted zone association controls DNS resolution through Route 53 Resolver, while hosted zone API lookup is account and permission scoped. I revised those statements to separate API lookup failures from private-zone DNS resolution failures.
- The IAM example included `route53:ListHostedZones` in a resource-scoped statement. The Route 53 service authorization reference lists no resource type for `ListHostedZones`, so I removed it from the hosted-zone ARN statement and left it in the `Resource: "*"` statement.

## Review Notes
The rest of the AWS CLI commands, CloudFormation snippets, Terraform data source usage, cross-account VPC association sequence, CloudTrail lookup command, public-zone delegation guidance, and duplicate hosted zone explanation were consistent with official documentation. The local OneUptime link target exists in the repository.
