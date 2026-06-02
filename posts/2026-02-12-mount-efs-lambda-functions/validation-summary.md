# Validation Summary: How to Mount EFS on Lambda Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon Elastic File System (EFS)
- Amazon VPC
- AWS IAM
- AWS CLI
- Terraform AWS Provider
- Python
- PyTorch

## Sources Consulted
- AWS Lambda Developer Guide: Configuring Amazon EFS file system access - https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem-efs.html
- AWS Lambda Developer Guide: Giving Lambda functions access to resources in an Amazon VPC - https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda Developer Guide: Configure ephemeral storage for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/configuration-ephemeral-storage.html
- AWS CLI Command Reference: lambda create-function - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- AWS CLI Command Reference: efs create-access-point - https://docs.aws.amazon.com/cli/latest/reference/efs/create-access-point.html
- AWS CLI Command Reference: ec2 authorize-security-group-egress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-egress.html
- AWS Managed Policy Reference: AWSLambdaVPCAccessExecutionRole - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaVPCAccessExecutionRole.html
- Amazon EFS User Guide: Amazon EFS quotas - https://docs.aws.amazon.com/efs/latest/ug/limits.html
- Terraform AWS Provider: aws_lambda_function - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS announcement: Lambda support for Amazon EFS generally available - https://aws.amazon.com/about-aws/whats-new/2020/06/aws-lambda-support-for-amazon-elastic-file-system-now-generally-/

## Issues Found
- The introduction implied that each Lambda invocation starts fresh and that files in `/tmp` are gone when an invocation ends. Updated this to explain that execution environments and `/tmp` contents can be reused on warm invocations, but `/tmp` is not durable storage.
- Several placeholder AWS resource IDs were not valid-looking IDs, including the VPC ID, subnet IDs, security group ID, and EFS access point ID in the IAM example. Updated them to plausible current AWS ID formats so the examples are structurally correct.
- The ML model example used `/mnt/models/...` while the Lambda configuration mounted EFS at `/mnt/data`. Updated the example to `/mnt/data/models/...` so it matches the configured mount path.
- The custom VPC permissions example omitted `ec2:DescribeSubnets`, `ec2:AssignPrivateIpAddresses`, and `ec2:UnassignPrivateIpAddresses`, which AWS lists for custom Lambda VPC execution-role policies. Added the missing actions.
- The cold-start section said EFS mounting usually adds 1-3 seconds. Updated it to AWS's documented guidance that Lambda mounts EFS in a few hundred milliseconds, while total cold start duration depends on runtime, package size, and initialization code.

## Review Notes
- The AWS CLI was not installed locally, so CLI syntax was verified against official AWS CLI documentation rather than local `aws --help` output.
- Terraform was not installed locally, so the Terraform snippet was reviewed against the Terraform AWS Provider documentation rather than formatted or validated with `terraform validate`.
- The PyTorch inference line uses `m.predict(text)` as illustrative pseudocode; this only works for models that expose a `predict` method, and the post already notes that actual inference code depends on the model.
