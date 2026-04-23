# Validation Summary: How to Configure Route 53 Health Checks with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Route 53 health checks
- AWS Route 53 DNS failover
- AWS CloudWatch metrics and alarms
- AWS CLI
- HCL

## Sources Consulted
- HashiCorp AWS Provider documentation: aws_route53_health_check: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Amazon Route 53 API Reference: HealthCheckConfig: https://docs.aws.amazon.com/Route53/latest/APIReference/API_HealthCheckConfig.html
- Amazon Route 53 Developer Guide: How Amazon Route 53 determines whether a health check is healthy: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html
- Amazon Route 53 Developer Guide: Monitoring Route 53 health checks with CloudWatch: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-cloudwatch.html
- Amazon Route 53 Developer Guide: Values specific for failover alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover-alias.html
- Amazon Route 53 Developer Guide: How Route 53 chooses records when health checking is configured: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html
- AWS CLI Command Reference: route53 get-health-check-status: https://docs.aws.amazon.com/cli/latest/reference/route53/get-health-check-status.html
- OpenTofu CLI documentation: init, plan, and apply workflow: https://opentofu.org/docs/cli/init/

## Issues Found
- The introduction said Route 53 automatically updates DNS records during health-check failover. Route 53 does not edit records; it chooses which records to return in DNS responses based on health. Updated the wording to say Route 53 stops returning the failing record in DNS responses or fails over to a backup endpoint.
- The endpoint health check used `api.example.com`, which matched the failover record name used later in the post. AWS warns that health checks associated with failover records should not use the failover record name as the health-check FQDN because results can be unpredictable. Changed the example to `primary-api.example.com` and added a short comment that it should resolve directly to the primary endpoint.
- The conclusion described `failure_threshold = 3` and `request_interval = 30` as universally best and implied a fixed 90-second failover time. Updated it to describe those values as a common starting point and clarified that DNS TTL and resolver caching also affect observed failover timing.

## Review Notes
The HCL resource names and arguments are current for the AWS provider, including `aws_route53_health_check`, `child_healthchecks`, `insufficient_data_health_status`, `failover_routing_policy`, and Route 53 health-check metrics in `AWS/Route53`. The AWS CLI `get-health-check-status --health-check-id` command is valid, but AWS notes it is intended for development diagnostics and cannot be used to retrieve calculated health-check status.
