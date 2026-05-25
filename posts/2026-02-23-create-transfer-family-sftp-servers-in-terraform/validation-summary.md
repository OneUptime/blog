# Validation Summary: How to Create Transfer Family SFTP Servers in Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- AWS Transfer Family
- SFTP
- Amazon S3
- Amazon EFS
- AWS IAM
- Amazon VPC security groups and Elastic IP addresses
- Amazon Route 53
- AWS Transfer Family managed workflows

## Sources Consulted
- AWS Transfer Family documentation: https://docs.aws.amazon.com/transfer/latest/userguide/what-is-aws-transfer-family.html
- Terraform AWS provider `aws_transfer_server` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/transfer_server
- Terraform AWS provider `aws_transfer_tag` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/transfer_tag
- Terraform AWS provider `aws_transfer_user` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/transfer_user
- Terraform AWS provider `aws_transfer_workflow` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/transfer_workflow
- AWS Transfer Family custom hostname documentation: https://docs.aws.amazon.com/transfer/latest/userguide/requirements-dns.html
- AWS Transfer Family logical directory documentation: https://docs.aws.amazon.com/transfer/latest/userguide/logical-dir-mappings.html
- AWS Transfer Family storage configuration documentation: https://docs.aws.amazon.com/transfer/latest/userguide/configure-storage.html
- AWS Transfer Family IAM role and policy documentation: https://docs.aws.amazon.com/transfer/latest/userguide/requirements-roles.html
- AWS Transfer Family session policy documentation: https://docs.aws.amazon.com/transfer/latest/userguide/users-policies-session.html
- AWS Transfer Family security policy documentation: https://docs.aws.amazon.com/transfer/latest/userguide/security-policies.html
- AWS Transfer Family workflow step documentation: https://docs.aws.amazon.com/transfer/latest/userguide/nominal-steps-workflow.html
- Amazon EFS integration with AWS Transfer Family: https://docs.aws.amazon.com/efs/latest/ug/using-aws-transfer-integration.html
- Amazon EFS mount target documentation: https://docs.aws.amazon.com/efs/latest/ug/accessing-fs.html

## Issues Found
- The description claimed the guide covered custom authentication, but the examples use `SERVICE_MANAGED` identity providers. Changed the description to "service-managed authentication."
- The VPC endpoint example used a single Elastic IP while passing all private subnets. AWS requires address allocation IDs to match the number of subnets for internet-facing VPC endpoints. Updated the example to create one EIP per subnet.
- The S3 access policy was described as scoped to each user's directory but granted access to the whole bucket. Added per-user session policies on `aws_transfer_user` resources and adjusted the multi-user example so user prefixes match usernames.
- The EFS example used an EFS access point to imply POSIX setup. AWS Transfer Family does not use EFS access points to set Transfer Family user POSIX permissions. Removed the access point, added a `posix_profile` to the Transfer Family user, and noted that the EFS home directory must exist with matching UID/GID.
- The EFS example created a file system without mount targets or NFS security group access. Added EFS mount targets and a security group allowing NFS from the Transfer Family endpoint security group.
- The custom hostname example used the reserved-looking tag key `aws:transfer:customHostname` and described it as a host key. AWS documents `transfer:customHostname` and `transfer:route53HostedZoneId` for non-console-created servers. Corrected the tag keys and comment.
- The logging best practice said a logging role always sends structured logs. AWS now recommends structured logging, while a logging role is specifically required for workflow logging. Updated the wording.

## Review Notes
- Terraform is not installed in this environment, so `terraform validate` could not be run. The examples were checked against official AWS and Terraform provider documentation by inspection.
- Several snippets still assume surrounding resources such as VPCs, subnets, Route 53 zone data sources, processing buckets, and workflow execution roles exist elsewhere in the reader's Terraform configuration.
