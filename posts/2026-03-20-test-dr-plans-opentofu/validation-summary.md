# Validation Summary: How to Test Disaster Recovery Plans with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS VPC
- Amazon Route 53 health checks and DNS failover
- OpenTofu `terraform_data` and `local-exec` provisioners
- AWS Lambda
- Amazon EventBridge scheduled rules
- AWS Step Functions targets
- Bash validation scripts

## Sources Consulted
- OpenTofu workspaces documentation: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu `timestamp` function documentation: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu `timeadd` function documentation: https://opentofu.org/docs/language/functions/timeadd/
- OpenTofu `formatdate` function documentation: https://opentofu.org/docs/language/functions/formatdate/
- OpenTofu `terraform_data` resource documentation: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu `local-exec` provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- AWS provider `aws_vpc` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS provider `aws_route53_health_check` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Amazon Route 53 inverting health checks documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-invert.html
- Amazon Route 53 health checks and failover documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-simple-configs.html
- Amazon Route 53 failover record values documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Amazon EventBridge scheduled rule pattern documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- Amazon EventBridge IAM roles for targets documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-iam-roles.html

## Issues Found
1. **Route 53 failover simulation deleted the health check instead of making it unhealthy**: The original chaos example used `count = var.simulate_primary_failure ? 0 : 1`, which removes the health check. Route 53 treats records without health checks as healthy, and AWS recommends using health check inversion when you want to stop routing traffic to a resource. Updated the example to keep the health check and set `invert_healthcheck = var.simulate_primary_failure`.
2. **Validation script used bash syntax without selecting bash**: The `local-exec` command used bash-specific syntax such as `==` in tests and process-friendly shell logic, but OpenTofu only guarantees that the command is evaluated in a system shell unless an interpreter is specified. Added `interpreter = ["/bin/bash", "-c"]`.
3. **DNS validation compared a multi-record ALB response to one IP address**: ALB DNS names can resolve to multiple addresses and order is not stable. Replaced the direct string comparison with a sorted set overlap check between the application DNS answer and the DR ALB DNS answer.
4. **Provisioner-only resource used `null_resource`**: OpenTofu provides the built-in `terraform_data` resource for lifecycle-only resources and provisioners without requiring an external provider. Updated the example from `null_resource` with `triggers` to `terraform_data` with `triggers_replace`.
5. **Summary repeated the incorrect health-check deletion claim**: Updated the wording to describe inverting health checks or failing controlled infrastructure components.

## Review Notes
- The EventBridge scheduled rule cron expression is valid and runs at 02:00 UTC on January 1, April 1, July 1, and October 1. AWS now labels scheduled rules as a legacy EventBridge feature and recommends EventBridge Scheduler for new schedules, but the resource and cron syntax shown remain valid.
- The `python3.12` Lambda runtime is currently supported by AWS Lambda.
- The `timestamp()` use in the VPC tag is syntactically valid, but OpenTofu documents that using it directly in resource attributes can cause a diff on every run. For production-grade code, a stable value from the Time provider or an explicit input would be preferable.
