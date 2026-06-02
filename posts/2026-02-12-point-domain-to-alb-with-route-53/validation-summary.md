# Validation Summary: How to Point a Domain to an ALB with Route 53

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Route 53
- Application Load Balancer
- Elastic Load Balancing v2 AWS CLI
- AWS Certificate Manager
- Route 53 health checks
- DNS A and AAAA alias records
- HTTPS listeners and HTTP redirects

## Sources Consulted
- AWS Route 53 Developer Guide: Routing traffic to an ELB load balancer - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-elb-load-balancer.html
- AWS CLI Command Reference: `route53 change-resource-record-sets` - https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- AWS CLI Command Reference: `route53 create-health-check` - https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- AWS CLI Command Reference: `elbv2 create-listener` - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- Elastic Load Balancing User Guide: Create an HTTPS listener for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html
- Elastic Load Balancing User Guide: Update the IP address types for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-ip-address-type.html
- Elastic Load Balancing User Guide: Target groups for your Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- Amazon Route 53 Developer Guide: Values specific for failover alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover-alias.html
- Amazon Route 53 Developer Guide: Active-active and active-passive failover - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html
- Amazon Route 53 Developer Guide: How Amazon Route 53 averts failover problems - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-problems.html
- AWS CLI Command Reference: `acm request-certificate` - https://docs.aws.amazon.com/cli/latest/reference/acm/request-certificate.html

## Issues Found
- The ACM certificate request text did not state that certificates used by an ALB listener must be in the same AWS region as the ALB. Updated the wording before the request-certificate command to make the region requirement explicit.
- The `dualstack.` explanation implied that the DNS name alone enables IPv6 support. Updated it to explain that the ALB must also be configured for a dualstack IP address type and that the network path must allow IPv6 traffic.
- The `EvaluateTargetHealth` explanation implied Route 53 always stops routing to an unhealthy ALB. Updated it to clarify that Route 53 evaluates ALB target group health and can route to a healthy alternative when the routing policy provides one.
- The failover section implied failover is unconditional whenever the primary is unhealthy. Updated it to note that the secondary must be healthy and that Route 53 can fail open when all matching records are unhealthy.
- The security group troubleshooting note only mentioned IPv4 ingress. Updated it to include `::/0` when serving IPv6 traffic.

## Review Notes
- AWS CLI was not installed in the local environment, so command syntax was verified against the official AWS CLI command reference rather than local `--help` output.
- The example ALB and certificate ARNs use placeholder account IDs that are intentionally illustrative.
