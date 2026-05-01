# Validation Summary: How to Configure ELB Access Logging with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- AWS Elastic Load Balancing
- Application Load Balancer (ALB)
- Network Load Balancer (NLB)
- Amazon S3
- Amazon Athena
- Amazon CloudWatch

## Sources Consulted
- AWS: Enable access logs for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
- AWS: Access logs for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
- AWS: Enable access logs for your Network Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/enable-access-logs.html
- AWS: Access logs for your Network Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-access-logs.html
- AWS: Create the table for ALB access logs - https://docs.aws.amazon.com/athena/latest/ug/create-alb-access-logs-table.html
- AWS: CloudWatch metrics for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Terraform Registry: `aws_lb` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform Registry: `aws_athena_named_query` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_named_query

## Issues Found
- The introduction treated ELB access logs generically as HTTP request logs. That is accurate for ALB, but not for NLB. I corrected the wording to distinguish ALB request logs from NLB TLS connection logs.
- The bucket name referenced `data.aws_caller_identity.current.account_id`, but the `aws_caller_identity` data source was missing. I added the required data source.
- The ALB bucket policy used the legacy `aws_elb_service_account` principal and wrote to `${bucket}/alb/*`, which does not match the current AWS-recommended ALB policy format. I replaced it with the current `logdelivery.elasticloadbalancing.amazonaws.com` service principal and the required `alb/AWSLogs/<account-id>/*` resource path.
- The post reused the same bucket for NLB logs but did not include the required NLB log-delivery permissions. I added the `delivery.logs.amazonaws.com` `s3:GetBucketAcl` and `s3:PutObject` statements with the documented `aws:SourceAccount`, `aws:SourceArn`, and `s3:x-amz-acl` conditions.
- The load balancer resources enabled access logging without an explicit dependency on the bucket policy. Because AWS validates bucket permissions when access logging is enabled, this can race in OpenTofu/Terraform. I added `depends_on = [aws_s3_bucket_policy.alb_logs]` to both load balancer resources.
- The NLB section omitted the documented limitation that access logs are emitted only for TLS listeners. I added that note.
- The Athena section claimed to create a table, but `aws_athena_named_query` only stores a query definition and does not execute it. I renamed the section/comment to reflect that it creates a named query.
- The ALB Athena DDL used an outdated schema and regex that omitted newer ALB log fields and lacked the documented trailing pattern that tolerates future fields. I replaced it with the current AWS example schema and regex.
- The conclusion still referred to the regional ELB service account for ALB logging, which AWS now documents as legacy behavior. I updated the conclusion to reflect the current ALB and NLB log-delivery permissions.

## Review Notes
- NLB now also supports enhanced logging through CloudWatch Logs, but the post's S3-based access logging approach remains technically valid for the legacy access log path documented by AWS.
- AWS documents that the access-log bucket must be in the same Region as the load balancer. For ALB, if default bucket encryption is configured, the supported option is SSE-S3.
