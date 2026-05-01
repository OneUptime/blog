# Validation Summary: How to Set Up DNS Failover with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu / HCL
- AWS Route 53
- Route 53 health checks
- Route 53 failover routing
- Route 53 latency routing
- AWS Elastic Load Balancing (ALB/NLB)
- Amazon CloudWatch alarms

## Sources Consulted
- AWS Route 53 Developer Guide: Active-active and active-passive failover https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html
- AWS Route 53 Developer Guide: How health checks work in simple configurations https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-simple-configs.html
- AWS Route 53 Developer Guide: Values specific for failover alias records https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover-alias.html
- AWS Route 53 Developer Guide: How Route 53 chooses records when health checking is configured https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html
- AWS Route 53 Developer Guide: How Route 53 determines whether a health check is healthy https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html
- AWS Route 53 Developer Guide: Choosing between alias and non-alias records https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- Elastic Load Balancing User Guide: How Elastic Load Balancing works https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
- HashiCorp AWS Provider docs: `aws_route53_record` https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown
- HashiCorp AWS Provider docs: `aws_route53_health_check` https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_health_check.html.markdown
- AWS Route 53 Developer Guide: Monitoring your resources with Route 53 health checks and CloudWatch https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-cloudwatch.html

## Issues Found
- The introduction said Route 53 "automatically update[s] DNS" to the secondary target. Updated this to reflect actual behavior: Route 53 answers queries with the primary or secondary record based on health, and clients observe the change as cached answers expire.
- The latency-routing explanation said users are sent to the "closest region." Updated this to "lowest-latency region" because Route 53 latency routing is based on measured latency, not geographic proximity.
- The failover alarm text claimed the alarm meant DNS failover was active. Updated the comment and alarm description to describe what the metric actually measures: the primary health check becoming unhealthy.
- The best-practices note said `failure_threshold = 3` and `request_interval = 30` create a fixed 90-second failover window. Updated this to describe the documented health-check behavior more accurately.
- The TTL guidance implied you explicitly set a 60-second TTL on the alias failover records. Updated this to reflect AWS behavior: alias records to AWS resources inherit the target TTL, and ELB-backed aliases use a 60-second TTL.
- The secondary-record comment said no health check was needed. Updated this to say an explicit health check is optional, which matches Route 53 failover behavior.

## Review Notes
- The `aws_route53_record`, `aws_route53_health_check`, and `aws_cloudwatch_metric_alarm` snippets use current, valid AWS provider arguments.
- The post combines `health_check_id` with `evaluate_target_health` on alias records. That is supported, but AWS also documents that alias targets such as ELB load balancers can often rely on `evaluate_target_health` alone.
- Route 53 HTTPS health checks do not validate SSL/TLS certificates, so they check endpoint reachability and HTTP response behavior rather than certificate validity.
