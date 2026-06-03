# Validation Summary: How to Set Up AWS Global Accelerator for Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Global Accelerator
- AWS CLI
- Amazon Route 53
- Elastic Load Balancing
- Amazon CloudWatch
- AWS networking and DNS

## Sources Consulted
- AWS CLI Command Reference: create-accelerator: https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/create-accelerator.html
- AWS CLI Command Reference: create-listener: https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/create-listener.html
- AWS CLI Command Reference: create-endpoint-group: https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/create-endpoint-group.html
- AWS CLI Command Reference: update-endpoint-group: https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/update-endpoint-group.html
- AWS Global Accelerator Developer Guide: How AWS Global Accelerator works: https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html
- AWS Global Accelerator Developer Guide: Endpoints for standard accelerators: https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoints.html
- AWS Global Accelerator Developer Guide: Ensure health check access for your accelerator: https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoint-groups-health-check-options.html
- AWS Global Accelerator Developer Guide: How failover works for unhealthy endpoints: https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoints-endpoint-weights.unhealthy-endpoints.html
- AWS Global Accelerator Developer Guide: CloudWatch monitoring: https://docs.aws.amazon.com/global-accelerator/latest/dg/cloudwatch-monitoring.html
- Amazon Route 53 Developer Guide: Routing traffic to an AWS Global Accelerator: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-global-accelerator.html
- AWS Global Accelerator pricing: https://aws.amazon.com/global-accelerator/pricing/

## Issues Found
- The accelerator creation command used `--ip-address-type DUAL_STACK`, but the surrounding text and sample output described two IPv4 static addresses. AWS documents that dual-stack accelerators have four static addresses: two IPv4 and two IPv6. Changed the command to `--ip-address-type IPV4` to match the article's two-address IPv4 flow.
- The ALB endpoint group examples included Global Accelerator health-check options and the health-check section implied those options controlled ALB endpoint health. AWS documents that Global Accelerator health-check options apply to EC2 instance and Elastic IP address endpoints, while ALB and NLB endpoint health checks are configured through Elastic Load Balancing target group settings. Removed the misleading health-check options from the ALB endpoint group examples and clarified the text.
- The failover description was too absolute. AWS documents that Global Accelerator fails over to healthy endpoints in other endpoint groups, but fails open to an endpoint in the closest group if it cannot find a healthy endpoint after trying the three closest endpoint groups. Updated the explanation to include that behavior.
- The "about 20 seconds" failover statement was tied to health-check settings shown with ALB endpoints. Updated it to apply specifically to EC2 instance and Elastic IP address endpoints.

## Review Notes
The remaining AWS CLI examples use current command names and options. The Route 53 Global Accelerator alias hosted zone ID, Global Accelerator CloudWatch namespace and metrics, supported standard endpoint types, traffic dial behavior, endpoint weighting, and pricing model were consistent with current AWS documentation as of 2026-06-03.
