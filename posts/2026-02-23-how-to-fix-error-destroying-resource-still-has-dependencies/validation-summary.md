# Validation Summary: How to Fix Error Destroying Resource Still Has Dependencies

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HCL configuration, lifecycle meta-arguments, state management)
- AWS Provider for Terraform (aws_security_group, aws_vpc, aws_instance, aws_internet_gateway, aws_nat_gateway, aws_s3_bucket, aws_iam_role, aws_iam_role_policy_attachment, aws_iam_role_policy, aws_rds_cluster, aws_rds_cluster_instance)
- AWS CLI (ec2, s3, s3api, iam subcommands)
- AWS services: EC2, VPC, S3, IAM, RDS

## Sources Consulted
- Terraform AWS Provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform lifecycle meta-arguments: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform CLI reference (destroy, graph, state rm, -target): https://developer.hashicorp.com/terraform/cli/commands
- AWS CLI EC2 reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/
- AWS CLI describe-nat-gateways (uses `--filter` singular): https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-nat-gateways.html
- AWS CLI revoke-security-group-ingress (legacy flat-form parameters): https://docs.aws.amazon.com/cli/latest/reference/ec2/revoke-security-group-ingress.html
- AWS CLI S3/S3API reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/
- AWS CLI IAM reference: https://docs.aws.amazon.com/cli/latest/reference/iam/
- AWS Managed Policy AmazonEC2ReadOnlyAccess: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEC2ReadOnlyAccess.html
- AWS S3 DeleteBucket BucketNotEmpty error: https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucket.html
- AWS EC2 DependencyViolation error documentation
- AWS RDS InvalidDBClusterStateFault: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/CommonErrors.html

## Issues Found
No technical issues found.

Specific points verified:
- The use of `--filter` (singular) in `aws ec2 describe-nat-gateways` is correct — this is one of the few EC2 describe commands that intentionally uses the singular form, unlike sibling commands.
- The legacy flat-form parameters (`--protocol`, `--port`, `--source-group`) on `aws ec2 revoke-security-group-ingress` are still supported, though `--ip-permissions` is the newer recommended form.
- All Terraform resource type names (`aws_rds_cluster`, `aws_rds_cluster_instance`, `aws_iam_role_policy_attachment`, etc.) match the current AWS provider schema.
- `force_destroy`, `prevent_destroy`, `create_before_destroy`, and `depends_on` syntax and placement are correct.
- The `AmazonEC2ReadOnlyAccess` managed policy ARN is a real, active AWS-managed policy.
- The error messages shown match the actual format produced by the AWS provider and AWS service APIs.

## Review Notes
- The shell loops that parse `--output text` from `aws s3api list-object-versions` rely on whitespace splitting; they work for typical S3 keys but could break on keys containing spaces. Acceptable for the documented use case.
- The RDS cluster example is intentionally partial (`# ...`); in a real config, `engine`, `master_username`, and `master_password` (or a Secrets Manager reference) would also be required, but the snippet is correctly scoped to illustrate destroy ordering.
- The post recommends `terraform state rm` followed by manual cleanup as a last resort — worth noting that this can leave orphaned resources and incur cost; the author appropriately frames it as a fallback.
- None of the AWS provider arguments shown are currently deprecated.
