# Validation Summary: How to Set Up Active-Passive Failover with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / HCL
- AWS Route 53 health checks
- AWS Route 53 failover routing
- Amazon CloudWatch alarms
- Amazon SNS
- AWS Application Load Balancer alias records

## Sources Consulted
- Amazon Route 53 API Reference: HealthCheckConfig - https://docs.aws.amazon.com/Route53/latest/APIReference/API_HealthCheckConfig.html
- Amazon Route 53 Developer Guide: Active-active and active-passive failover - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html
- Amazon Route 53 Developer Guide: How Amazon Route 53 chooses records when health checking is configured - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html
- Amazon Route 53 Developer Guide: Values specific for failover records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover.html
- Amazon Route 53 Developer Guide: How Amazon Route 53 determines whether a health check is healthy - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html
- Amazon Route 53 Developer Guide: Monitoring your resources with Amazon Route 53 health checks and Amazon CloudWatch - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-cloudwatch.html
- Terraform Registry: `aws_route53_health_check` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform Registry: `aws_route53_record` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record

## Issues Found
- The Step 1 `aws_route53_health_check` mixed endpoint-monitoring arguments (`type = "HTTPS"`, `fqdn`, `port`, and `resource_path`) with CloudWatch-alarm arguments (`cloudwatch_alarm_name`, `cloudwatch_alarm_region`, and `insufficient_data_health_status`). Route 53 health checks are type-specific, and those CloudWatch fields belong to `CLOUDWATCH_METRIC` health checks. I removed the invalid fields so the example is a valid HTTPS endpoint health check.
- Step 3 described the CloudWatch alarm as a failover event notification. The alarm actually monitors the Route 53 `HealthCheckStatus` metric for the primary health check, not a distinct DNS failover event. I updated the heading, comment, and alarm description to match what the code really does.
- The summary claimed failover typically happens within 60-90 seconds and that the passive readiness alarm ensures the standby is ready. AWS documentation does not guarantee that timing, and the separate readiness alarm does not participate in Route 53 routing. I corrected the wording to reflect health-check evaluation plus DNS caching, and to state that the readiness alarm is observational only.

## Review Notes
- The example uses the ALB DNS name as the health-check FQDN. For HTTP and HTTPS health checks, Route 53 sends the `FullyQualifiedDomainName` value in the `Host` header, so this assumes the ALB will serve the health endpoint correctly for that host name.
- `request_interval = 10` is valid, but AWS documents it as the fast interval and charges extra for it.
