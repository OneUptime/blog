# Validation Summary: How to Configure AWS Global Accelerator with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Global Accelerator
- Global Accelerator standard accelerators, listeners, endpoint groups, and custom routing accelerators
- Amazon S3 flow logs
- Route 53 alias records

## Sources Consulted
- AWS Provider documentation: `aws_globalaccelerator_accelerator` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_accelerator
- AWS Provider documentation: `aws_globalaccelerator_listener` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_listener
- AWS Provider documentation: `aws_globalaccelerator_endpoint_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_endpoint_group
- AWS Provider documentation: `aws_globalaccelerator_custom_routing_endpoint_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_custom_routing_endpoint_group
- AWS Global Accelerator documentation: How AWS Global Accelerator works - https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html
- AWS Global Accelerator documentation: Components - https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-components.html
- AWS Global Accelerator documentation: Preserve client IP addresses - https://docs.aws.amazon.com/global-accelerator/latest/dg/preserve-client-ip-address.html
- AWS Global Accelerator documentation: Guidelines and restrictions for client IP address preservation - https://docs.aws.amazon.com/global-accelerator/latest/dg/preserve-client-ip-address.how-to-enable-preservation.html
- AWS Global Accelerator API Reference: EndpointConfiguration - https://docs.aws.amazon.com/global-accelerator/latest/api/API_EndpointConfiguration.html
- AWS Global Accelerator documentation: Configuring and using flow logs - https://docs.aws.amazon.com/global-accelerator/latest/dg/monitoring-global-accelerator.flow-logs.html
- AWS Global Accelerator documentation: Custom routing endpoints - https://docs.aws.amazon.com/global-accelerator/latest/dg/about-custom-routing-endpoints.html

## Issues Found
- The post tagged AWS Global Accelerator as a CDN. Global Accelerator is an edge networking service for routing traffic over the AWS global network, not a content delivery network. Removed the `CDN` tag.
- Several `aws_globalaccelerator_endpoint_group` examples included a `tags` argument. The Terraform AWS Provider documentation for this resource does not support `tags`, so those snippets would fail validation. Removed the unsupported `tags` lines from endpoint group examples.
- The EC2 endpoint example set `client_ip_preservation_enabled = false`. AWS documentation states that EC2 instance endpoints always have client IP address preservation enabled and it cannot be disabled. Changed both EC2 endpoint configurations to `client_ip_preservation_enabled = true`.

## Review Notes
The examples use AWS provider `~> 5.0`; the Global Accelerator resources and arguments reviewed here are still supported in current provider documentation. Future updates could consider moving examples to the current provider major version and adding S3 bucket policy guidance for flow logs when the bucket is not owned by the same account/user configuring the accelerator.
