# Validation Summary: How to Create AWS Global Accelerator with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Global Accelerator
- Amazon Route 53
- Application Load Balancer
- AWS provider for OpenTofu/Terraform
- Bash
- `curl`

## Sources Consulted
- AWS Global Accelerator Developer Guide, "How AWS Global Accelerator works": https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html
- AWS Global Accelerator FAQs: https://aws.amazon.com/global-accelerator/faqs/
- AWS Global Accelerator Developer Guide, "Endpoint groups for standard accelerators": https://docs.aws.amazon.com/en_us/global-accelerator/latest/dg/about-endpoint-groups.html
- AWS Global Accelerator Developer Guide, "Ensure health check access for your accelerator": https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoint-groups-health-check-options.html
- AWS Global Accelerator Developer Guide, "Preserve client IP addresses in AWS Global Accelerator": https://docs.aws.amazon.com/global-accelerator/latest/dg/preserve-client-ip-address.html
- AWS Global Accelerator Developer Guide, "Guidelines and restrictions for client IP address preservation in Global Accelerator": https://docs.aws.amazon.com/global-accelerator/latest/dg/preserve-client-ip-address.how-to-enable-preservation.html
- AWS Global Accelerator Developer Guide, "How failover works for unhealthy endpoints": https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoints-endpoint-weights.unhealthy-endpoints.html
- OpenTofu docs, "Initializing Working Directories": https://opentofu.org/docs/cli/init/
- OpenTofu docs, "Command: plan": https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs, "Command: apply": https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider `aws_globalaccelerator_accelerator` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/globalaccelerator_accelerator.html.markdown
- AWS provider `aws_globalaccelerator_listener` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/globalaccelerator_listener.html.markdown
- AWS provider `aws_globalaccelerator_endpoint_group` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/globalaccelerator_endpoint_group.html.markdown
- AWS provider `aws_route53_record` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown

## Issues Found
- The introduction said Global Accelerator routes traffic to the "nearest AWS Region" and reduces latency by up to 60%. AWS documents that traffic enters the AWS network at the closest edge location and is then routed to the optimal healthy endpoint; AWS markets up to 60% performance improvement, while the FAQ breaks out first-byte latency improvement separately. I corrected the wording accordingly.
- The listener and endpoint-group examples passed `.id` into arguments documented as ARNs. While the provider currently exposes `id` as the ARN for these resources, I changed the examples to use `.arn` to match the documented schema and avoid ambiguity.
- The ALB endpoint-group examples configured Global Accelerator health-check options such as `health_check_path` and `health_check_protocol`. AWS documents that these settings do not control health checks for Application Load Balancer or Network Load Balancer endpoints; health checks for ALB endpoints must be configured on the load balancer target groups. I removed the misleading settings and added an inline note.
- The dual-stack comment implied that changing `ip_address_type` to `DUAL_STACK` was sufficient by itself. I clarified that dual-stack also requires IPv6-capable endpoints and matching DNS records, and I narrowed the output description to the IPv4 addresses used by the `A` record example.
- The deployment test used `curl -v ... | grep x-amzn-trace-id` and claimed it would show which Region handled traffic. That header is not a reliable generic response-side signal for this purpose, so the command would not validate the claim as written. I replaced it with a simple `curl -I` request that accurately tests the endpoint through Global Accelerator.
- The conclusion's `traffic_dial_percentage = 0` guidance was a bit too loose. AWS documents that failover behavior can still consider zero-dial endpoint groups when healthy failover targets are needed, so I clarified the wording to describe zero-dial regions as idle for normal traffic while still available for failover.

## Review Notes
- The Route 53 example that points `A` records directly at the accelerator's static IPv4 addresses is technically valid. AWS also documents Route 53 alias records for Global Accelerator, which may be preferable in some environments, but the direct-IP example does work for the IPv4 configuration shown.
- I validated the examples against current documentation and provider schemas only; I did not run a live AWS deployment during the review.
