# Validation Summary: How to Conditionally Create Resources with the enabled Meta-Argument in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform
- HCL
- AWS CloudWatch
- AWS EC2

## Sources Consulted
- OpenTofu `enabled` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/
- OpenTofu `count` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu module syntax docs: https://opentofu.org/docs/language/modules/syntax/
- Terraform meta-arguments overview: https://developer.hashicorp.com/terraform/language/meta-arguments
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/modules/syntax
- Amazon CloudWatch `PutMetricAlarm` API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- Amazon CloudWatch dashboard body structure docs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Amazon CloudWatch concepts docs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html
- CloudWatch agent configuration docs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- Metrics collected by the CloudWatch agent: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html

## Issues Found
- The introduction incorrectly said OpenTofu does not have a built-in `enabled` meta-argument. I corrected it to reflect the documented `lifecycle.enabled` support introduced in OpenTofu v1.11.
- The post implied the same pattern applied to Terraform. I clarified that this `enabled` meta-argument is OpenTofu-specific and that Terraform's current documented conditional-creation primitives are still `count` and `for_each`.
- The resource examples used `count = var.enabled ? 1 : 0` for single-instance resources even though current OpenTofu documents `lifecycle { enabled = ... }` as the cleaner built-in approach. I updated the examples and the output references accordingly.
- The alarm examples had no dimensions, which would aggregate `AWS/EC2` metrics across instances rather than target the service's instance. I added an `instance_id` input and `dimensions` blocks so the alarms are scoped to a specific instance.
- The memory alarm used `MemoryUtilization` in the `CWAgent` namespace, but the CloudWatch agent documentation uses metrics such as `mem_used_percent` for memory percentage. I corrected the metric name.
- The scaling section combined `enabled` and `count` on the same block, which OpenTofu explicitly disallows. I rewrote that section to gate the module call with `lifecycle.enabled` and use `count` inside the module for replica scaling.
- The dashboard example used a placeholder `jsonencode({ /* ... */ })`, but CloudWatch dashboard bodies must include a `widgets` array. I replaced it with a minimal valid `widgets = []` example.

## Review Notes
- The `enabled` meta-argument is version-specific to OpenTofu v1.11 and later. Readers targeting older OpenTofu releases, or Terraform, still need the older `count`/`for_each` style patterns.
- The `CWAgent` memory alarm assumes the CloudWatch agent publishes a memory metric with an `InstanceId` dimension. If a deployment uses a different metric dimension set, the alarm dimensions must match that published metric identity.
