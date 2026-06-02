# Validation Summary: How to Configure Route 53 Failover Routing Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53 failover routing
- Route 53 health checks
- AWS CLI
- Elastic Load Balancing alias records
- Amazon S3 static website hosting
- Terraform AWS provider
- CloudWatch monitoring

## Sources Consulted
- AWS Route 53 Developer Guide: Failover routing - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-failover.html
- AWS Route 53 Developer Guide: Active-active and active-passive failover - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html
- AWS Route 53 Developer Guide: Values specific for failover alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover-alias.html
- AWS Route 53 Developer Guide: How Route 53 chooses records when health checking is configured - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html
- AWS Route 53 API Reference: AliasTarget - https://docs.aws.amazon.com/Route53/latest/APIReference/API_AliasTarget.html
- AWS Route 53 API Reference: ResourceRecordSet - https://docs.aws.amazon.com/Route53/latest/APIReference/API_ResourceRecordSet.html
- AWS CLI Command Reference: route53 create-health-check - https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- AWS CLI Command Reference: route53 update-health-check - https://docs.aws.amazon.com/cli/latest/reference/route53/update-health-check.html
- AWS Route 53 Developer Guide: Routing traffic to an S3 bucket - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/RoutingToS3Bucket.html
- Terraform Registry: aws_route53_record - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform Registry: aws_route53_health_check - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check

## Issues Found
- The post said the primary failover record must have a health check. Updated it to explain that Route 53 needs a health signal, which can come from a health check or from `EvaluateTargetHealth` for supported alias targets such as load balancers.
- The setup section used an ALB alias record with both `HealthCheckId` and `EvaluateTargetHealth` but did not explain the combined behavior. Added the AWS-documented caveat that both must evaluate healthy when both are configured.
- The ALB example hostnames were not realistic ALB DNS names, and Route 53 alias examples omitted the `dualstack.` prefix used for Application Load Balancer alias records. Updated the example hostnames.
- The failure timing language was too exact. Revised it to describe the failure threshold as consecutive failed checks and to account for DNS propagation and resolver caching.
- The S3 static website example used a bucket name that did not match the DNS record name. Updated the bucket name because Route 53 aliases to S3 website endpoints require the bucket name to match the domain or subdomain record.
- The S3 example did not mention that S3 website endpoints do not support HTTPS. Added the CloudFront caveat for HTTPS custom domains.
- The TTL guidance implied that all failover records have configurable TTL. Updated it to distinguish non-alias records from alias records, where Route 53 uses the alias target's TTL.

## Review Notes
The AWS CLI and Terraform snippets use current fields and command shapes. The placeholder hosted zone IDs and health check IDs still need to be replaced with real values in an actual deployment.
