# Validation Summary: How to Configure DNS Failover with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Route 53
- Route 53 health checks
- Route 53 failover routing policies
- Route 53 alias records
- Amazon CloudWatch alarms
- Application Load Balancer metrics
- S3 static website endpoints
- DNS lookup tools (`dig`, `nslookup`, `watch`)

## Sources Consulted
- Terraform AWS Provider `aws_route53_record` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS Provider `aws_route53_health_check` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform AWS Provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS Provider `aws_s3_bucket_website_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_website_configuration
- AWS Route 53 failover routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-failover.html
- AWS Route 53 failover alias record values documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover-alias.html
- AWS Route 53 health check behavior documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html
- AWS Application Load Balancer CloudWatch metrics documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Local command help for `dig` and `watch`.

## Issues Found
- The post described failover delay as "DNS propagation delay." Route 53 failover is affected primarily by resolver caching and TTL behavior after Route 53 changes the answer it returns, so the wording was changed to "delay while DNS resolver caches refresh."
- The CloudWatch alarm example used `metric_name = "5XXError"` for the `AWS/ApplicationELB` namespace. That is not an Application Load Balancer metric name. It was changed to `HTTPCode_Target_5XX_Count`, and a `LoadBalancer = aws_lb.primary.arn_suffix` dimension was added to match AWS's documented ALB metric dimensions.

## Review Notes
- The Terraform examples use AWS provider `~> 5.0`, which remains valid for the snippets reviewed, though newer provider major versions may exist in future.
- The alias record examples correctly omit `ttl`, because Terraform requires `ttl` only for non-alias records and alias records conflict with `ttl` and `records`.
- The S3 website alias example uses `aws_s3_bucket_website_configuration.failover.website_domain`, which is the non-deprecated website endpoint domain attribute for Route 53 alias records.
