# Validation Summary: How to Fix 'ELB S3 Permissions' Issues in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Elastic Load Balancing
- Application Load Balancer
- Classic Load Balancer
- Amazon S3
- IAM bucket policies
- AWS CLI

## Sources Consulted
- AWS Elastic Load Balancing documentation: Enable access logs for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
- AWS Elastic Load Balancing documentation: Enable access logs for your Classic Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/classic/enable-access-logs.html
- AWS Elastic Load Balancing documentation: Access logs for your Classic Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/classic/access-log-collection.html
- AWS CLI Command Reference: elbv2 describe-load-balancers: https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-load-balancers.html
- Terraform AWS Provider documentation source: aws_lb resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb.html.markdown
- Terraform AWS Provider documentation source: aws_s3_bucket_lifecycle_configuration resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- Terraform AWS Provider documentation source: aws_s3_bucket_server_side_encryption_configuration resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown

## Issues Found
- The post used the legacy region-specific ELB account IDs as the primary ALB bucket policy principal. AWS now recommends the `logdelivery.elasticloadbalancing.amazonaws.com` service principal for Application Load Balancer and Classic Load Balancer access logs; the regional account ID policy is legacy-only for older Regions. Updated the policy examples and surrounding explanation.
- The ALB bucket policy resources used broad `bucket/*` ARNs. AWS documents that the S3 resource path should include the configured prefix, `AWSLogs`, and the load balancer account ID. Updated the examples to use `prefix/AWSLogs/${account_id}/*`.
- The post included `delivery.logs.amazonaws.com` and ACL-check statements, which are not the documented ALB access-log delivery policy. Removed those from the ALB examples and used the Elastic Load Balancing log delivery service principal.
- The conclusion and requirements claimed that region-specific ELB service account permissions should always be used. Updated the wording to refer to the ELB log delivery service principal and account-scoped S3 resource path.

## Review Notes
Terraform was not installed in the review environment, so `terraform validate` could not be run. Static review against the Terraform AWS Provider documentation found the `aws_lb.access_logs`, S3 encryption, versioning, public access block, and lifecycle resource shapes to be consistent with the documented arguments. The lifecycle example omits an explicit `filter {}`; this remains supported, but the provider documentation recommends specifying `filter {}` for future compatibility.
