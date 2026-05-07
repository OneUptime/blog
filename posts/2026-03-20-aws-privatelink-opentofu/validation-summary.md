# Validation Summary: How to Set Up AWS PrivateLink with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS PrivateLink
- Amazon VPC
- Network Load Balancer (NLB)
- OpenTofu / Terraform HCL
- AWS Provider for Terraform/OpenTofu

## Sources Consulted
- AWS PrivateLink endpoint service documentation: https://docs.aws.amazon.com/vpc/latest/privatelink/create-endpoint-service.html
- AWS PrivateLink private DNS documentation: https://docs.aws.amazon.com/vpc/latest/privatelink/manage-dns-names.html
- AWS PrivateLink high-availability guidance: https://docs.aws.amazon.com/whitepapers/latest/aws-privatelink/creating-highly-available-endpoint-services.html
- AWS provider `aws_vpc_endpoint_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint_service
- AWS provider `aws_vpc_endpoint` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- AWS provider `aws_vpc_endpoint_connection_accepter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint_connection_accepter
- AWS provider `aws_vpc_endpoint_service_allowed_principal` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint_service_allowed_principal
- AWS provider `aws_lb_target_group_attachment` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment

## Issues Found
- The provider-side example created a target group but did not register any targets, which would leave the NLB unable to forward traffic to the private service. Added `aws_lb_target_group_attachment` with `var.service_target_ips` so the example actually exposes reachable backends.
- The consumer example enabled `private_dns_enabled = true` unconditionally for a custom endpoint service. Updated it to `false` and clarified that private DNS should only be enabled after the provider configures and verifies a private DNS name for the endpoint service.
- The consumer output referenced `dns_entry` using dot access. Updated it to `dns_entry[0]["dns_name"]` to match the provider documentation for the list-of-maps output.
- The cross-account section used a data source pattern based on `aws_vpc_endpoint_connections`, which is not documented in the current AWS provider. Replaced it with a valid `aws_vpc_endpoint_connection_accepter` example that accepts a known consumer endpoint ID.
- The post showed both `allowed_principals` and `aws_vpc_endpoint_service_allowed_principal` without warning about the documented conflict when the same principal is managed in both places. Clarified that the standalone resource is an alternative and updated the best-practice note.
- The best-practice guidance around DNS testing assumed private DNS was always in use. Updated it to cover endpoint-specific DNS names as well as provider-configured private DNS names.

## Review Notes
- The post remains accurate as a PrivateLink interface-endpoint guide after the fixes above.
- Cross-zone load balancing guidance is correct, but AWS notes that regional data transfer charges can apply when it is enabled.
- The post does not cover optional provider-side private DNS verification resources. That omission is acceptable now that the consumer example no longer implies private DNS works automatically for custom endpoint services.
