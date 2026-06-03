# Validation Summary: How to Create Global Accelerator with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Global Accelerator
- Terraform AWS provider
- Amazon Route 53
- Amazon S3 lifecycle configuration
- AWS Global Accelerator flow logs

## Sources Consulted
- AWS Global Accelerator Developer Guide: How AWS Global Accelerator works: https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html
- AWS Global Accelerator Developer Guide: Global Accelerator components: https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-components.html
- AWS Global Accelerator API Reference: EndpointConfiguration: https://docs.aws.amazon.com/global-accelerator/latest/api/API_EndpointConfiguration.html
- AWS Global Accelerator Developer Guide: Preserve client IP addresses: https://docs.aws.amazon.com/global-accelerator/latest/dg/preserve-client-ip-address.html
- AWS Global Accelerator Developer Guide: Flow logs: https://docs.aws.amazon.com/global-accelerator/latest/dg/monitoring-global-accelerator.flow-logs.html
- Amazon Route 53 Developer Guide: Routing traffic to an AWS Global Accelerator: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-global-accelerator.html
- Terraform AWS Provider documentation: aws_globalaccelerator_accelerator: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_accelerator
- Terraform AWS Provider documentation: aws_globalaccelerator_listener: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_listener
- Terraform AWS Provider documentation: aws_globalaccelerator_endpoint_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_endpoint_group
- Terraform AWS Provider documentation: aws_route53_record: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record

## Issues Found
- The Client IP Preservation section incorrectly stated that client IP preservation works with ALB and NLB endpoints but not with EC2 or Elastic IP endpoints. AWS documentation states that standard accelerators can preserve client IP addresses for Application Load Balancers, EC2 instances, and Network Load Balancers with security groups. It is not supported for Elastic IP endpoints, Network Load Balancers without security groups, or Network Load Balancers with TLS listeners. Updated the paragraph to reflect the current support matrix and caveats.

## Review Notes
The Terraform snippets use current resource names and argument names for Global Accelerator accelerators, listeners, endpoint groups, Route 53 alias records, and S3 lifecycle configuration. The examples are illustrative and still require surrounding provider configuration, valid endpoint resources, IAM permissions for flow log publishing, and appropriate regional ALB/EC2/EIP resources to apply successfully.
