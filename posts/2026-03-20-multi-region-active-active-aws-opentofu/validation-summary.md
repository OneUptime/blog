# Validation Summary: How to Build a Multi-Region Active-Active Architecture with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Provider for Terraform
- AWS DynamoDB Global Tables (V2 / 2019.11.21)
- AWS Route53 (latency-based routing, health checks, alias records)
- AWS Global Accelerator (accelerator, listener, endpoint group)
- AWS ECS (referenced via module)
- AWS ALB (referenced via module outputs)

## Sources Consulted
- Terraform AWS provider registry docs for `aws_dynamodb_table` (replica blocks for Global Tables V2)
- Terraform AWS provider registry docs for `aws_route53_record` (latency_routing_policy, alias, set_identifier)
- Terraform AWS provider registry docs for `aws_route53_health_check` (HTTPS type, resource_path, failure_threshold, request_interval)
- Terraform AWS provider registry docs for `aws_globalaccelerator_accelerator`, `aws_globalaccelerator_listener`, `aws_globalaccelerator_endpoint_group`
- AWS DynamoDB Global Tables V2 documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html (confirms DynamoDB Streams are enabled by default for MREC V2 global tables)
- AWS Global Accelerator listener docs: https://docs.aws.amazon.com/global-accelerator/latest/dg/about-listeners.html (confirms TCP/UDP protocols supported, Global Accelerator is Layer 4)

## Issues Found
No technical issues found.

The code examples use correct Terraform AWS provider syntax:
- `aws_dynamodb_table` with `replica` blocks correctly configures Global Tables V2.
- `latency_routing_policy` block on `aws_route53_record` is correct, with required `set_identifier`.
- `aws_route53_health_check` with `type = "HTTPS"`, `resource_path = "/health"`, `failure_threshold = 3`, and `request_interval = 30` are all valid.
- Global Accelerator listener uses `protocol = "TCP"`, which is correct (Global Accelerator is L4 and only supports TCP/UDP).
- `accelerator_arn` and `listener_arn` reference resource `.id` attributes — for these resources the `id` is the ARN, so this works correctly.
- `endpoint_id` references the ALB ARN, which is the correct identifier for ALB endpoints in Global Accelerator.
- `client_ip_preservation_enabled` is supported for ALB endpoints.
- Provider aliasing pattern using `providers = { aws = aws.primary }` for modules is correct OpenTofu/Terraform syntax.

## Review Notes
- `stream_enabled = true` and `stream_view_type = "NEW_AND_OLD_IMAGES"` on the DynamoDB table are not strictly necessary for Global Tables V2 (MREC), since AWS enables streams automatically and they cannot be disabled on MREC replicas. Including them is not incorrect — it's explicit and matches what AWS will configure anyway.
- Using `.arn` instead of `.id` when referencing `aws_globalaccelerator_accelerator` and `aws_globalaccelerator_listener` would be slightly more idiomatic in newer provider versions, but `.id` works because both resources expose the ARN as their ID.
- Route53 is a global service, so technically the `provider = aws.primary` / `provider = aws.secondary` distinction on the Route53 records does not change which Route53 endpoint is used (Route53 has no regional endpoints). This is harmless but not necessary.
- The Global Accelerator example only shows the primary endpoint group; in a true active-active setup, a second `aws_globalaccelerator_endpoint_group` for the secondary region would also be needed. The post is illustrative rather than exhaustive — this is acceptable for a tutorial format.
- The "sub-100ms global latency" claim in the summary depends on user proximity to the deployed regions and is a typical marketing-style statement; not a technical inaccuracy.
