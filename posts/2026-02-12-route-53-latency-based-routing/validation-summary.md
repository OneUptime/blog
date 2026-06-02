# Validation Summary: How to Configure Route 53 Latency-Based Routing Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53 latency-based routing
- Route 53 alias records and health checks
- AWS CLI Route 53 commands
- Terraform AWS provider Route 53 resources
- DNS routing policies and EDNS Client Subnet

## Sources Consulted
- AWS Route 53 Developer Guide: Latency-based routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-latency.html
- AWS Route 53 Developer Guide: Values specific for latency alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-latency-alias.html
- AWS CLI Command Reference: route53 change-resource-record-sets: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- AWS CLI Command Reference: route53 create-health-check: https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- AWS CLI Command Reference: route53 test-dns-answer: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/route53/test-dns-answer.html
- AWS General Reference: Elastic Load Balancing endpoints and Route 53 hosted zone IDs: https://docs.aws.amazon.com/general/latest/gr/elb.html
- Terraform Registry: aws_route53_record: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform Registry: aws_route53_health_check: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check

## Issues Found
- The health-check section said Route 53 would continue routing to a down region "without health checks" and said to always add health checks. This was too broad because the examples use ALB alias records with `EvaluateTargetHealth`, which is also a valid Route 53 health signal for Elastic Load Balancing aliases. Updated the wording to distinguish explicit Route 53 health checks from alias target health evaluation.
- The conclusion referred only to automatic failover with health checks. Updated it to mention health checks or `EvaluateTargetHealth`, matching the examples and Route 53 documentation.

## Review Notes
- The AWS CLI `change-resource-record-sets`, `create-health-check`, and `test-dns-answer` command shapes are valid according to current AWS CLI documentation.
- The Terraform `aws_route53_record` latency routing policy, alias block, and `aws_route53_health_check` fields are valid according to current Terraform AWS provider documentation.
- The ALB alias hosted zone IDs shown for `us-east-1`, `eu-west-1`, and `ap-southeast-1` match the AWS General Reference.
- The OneUptime links referenced in the post returned HTTP 200 on 2026-06-02.
