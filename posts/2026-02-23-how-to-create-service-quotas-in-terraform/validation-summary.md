# Validation Summary: How to Create Service Quotas in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+)
- HashiCorp AWS Provider (~> 5.0)
- AWS Service Quotas
- AWS CLI (`service-quotas`)
- AWS CloudWatch (alarms, metric math, `AWS/Usage` namespace)
- AWS Organizations (quota templates)
- Multiple AWS services referenced for common quotas: EC2, VPC, EBS, Lambda, RDS, ECS, ELB

## Sources Consulted
- Terraform AWS Provider docs — `aws_servicequotas_service_quota` (resource + data source): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/servicequotas_service_quota
- Terraform AWS Provider docs — `aws_servicequotas_service` data source
- Terraform AWS Provider docs — `aws_servicequotas_template` and `aws_servicequotas_template_association`
- HashiCorp source repo: `website/docs/r/servicequotas_service_quota.html.markdown`
- AWS Service Quotas user guide (quota codes for EC2, VPC, EBS, Lambda, RDS, ECS, ELB)
- AWS CloudWatch docs on visualising/alerting on service quotas: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Quotas-Visualize-Alarms.html
- AWS CLI Service Quotas command reference

## Issues Found
1. **Non-existent `request_status` attribute referenced on `aws_servicequotas_service_quota`.** The resource's exported attributes are `adjustable`, `arn`, `default_value`, `id`, `quota_name`, `service_name`, and `usage_metric` — there is no `request_status`. Fixed by replacing `status = v.request_status` in the `quota_requests` output with `adjustable = v.adjustable`, and rewording the Tips bullet to point readers at the `aws_servicequotas_request_history` data source (or the AWS console) for request lifecycle status.
2. **Fictional `ServiceQuota` CloudWatch metric in the alarm example.** `AWS/Usage` exposes `ResourceCount` (and `CallCount`/`ThrottleCount`); there is no `ServiceQuota` metric. The canonical AWS pattern is the metric-math function `SERVICE_QUOTA(m)`. Fixed by removing the second `metric_query` block and changing the percentage expression to `(usage / SERVICE_QUOTA(usage)) * 100`.

## Review Notes
- All AWS quota codes referenced (L-1216C47A, L-0263D0A3, L-F678F1CE, L-34B43A08, L-D18FCD1D, L-B99A9384, L-7B6409FD, L-9095EBAF, L-53DA6B97) and their paired service codes verified correct.
- The empty `aws_servicequotas_template_association` block is valid — the resource only takes optional `region` and `skip_destroy` arguments.
- The `aws_servicequotas_service` data source correctly uses `service_name` (not `service_code`) as its lookup argument.
- The EC2 On-Demand quota (L-1216C47A) is measured in vCPUs, not instance counts — the post correctly notes this in the data-source output description, though readers should be aware when picking a `value`.
- `aws_servicequotas_service_quota` requests that exceed the maximum auto-approve threshold may fail apply with `RESOURCE_FAILURE_OCCURRED`; this isn't covered but is a common gotcha.
