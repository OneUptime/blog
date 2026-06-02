# Validation Summary: How to Set Up IAM Policies for EC2 Instance Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- Amazon EC2
- EC2 IAM resource ARNs and condition keys
- Attribute-based access control (ABAC)
- Terraform AWS provider configuration

## Sources Consulted
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon EC2: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- Amazon EC2 User Guide: Example policies to control access to the Amazon EC2 API: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ExamplePolicies_EC2.html
- Amazon EC2 User Guide: Grant permission to tag Amazon EC2 resources during creation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/supported-iam-actions-tagging.html
- Amazon EC2 User Guide: Example policies to control access to the Amazon EC2 console: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-policies-ec2-console.html
- IAM User Guide: Controlling access to AWS resources using tags: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_tags.html

## Issues Found
- The AMI and snapshot ARN examples included an account ID. AWS documents EC2 image and snapshot ARNs with an empty account field, so I changed them to `arn:aws:ec2:us-east-1::image/...` and `arn:aws:ec2:us-east-1::snapshot/...`.
- The `RunInstances` examples omitted key pair resources. AWS documents key pairs as a resource evaluated by `RunInstances` when a key pair is specified, so I added `arn:aws:ec2:us-east-1:123456789012:key-pair/*` and adjusted the explanatory text to say launch resources are request-dependent.
- The required-tags example claimed `Name` was required, but the policy only required `Environment` and `Team`; `ForAllValues:StringEquals` on `aws:TagKeys` restricts allowed keys but does not require every listed key. I added a `StringLike` condition for `aws:RequestTag/Name`.
- The security group example used unsupported condition keys for rule protocol, port, and CIDR (`ec2:IpProtocol`, `ec2:FromPort`, and `ec2:Cidr`). AWS's EC2 IAM condition keys for `AuthorizeSecurityGroupIngress` do not expose those request fields. I removed the invalid deny statement and corrected the surrounding explanation.
- The AMI restriction example used `ec2:ImageTag/Approved`, which is not a documented EC2 IAM condition key. I changed it to `ec2:ResourceTag/Approved`.
- The Terraform example referenced `data.aws_caller_identity.current.account_id` without declaring the data source. I added `data "aws_caller_identity" "current" {}`.

## Review Notes
- JSON policy snippets were parsed successfully with Node.js after the fixes.
- Terraform was not installed in the workspace, so the HCL snippet was reviewed manually but not validated with `terraform fmt` or `terraform validate`.
