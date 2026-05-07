# Validation Summary: How to Create AWS Direct Connect Gateways with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- AWS Direct Connect
- AWS Transit Gateway
- AWS Virtual Private Gateway
- Amazon CloudWatch
- HCL / AWS provider resources

## Sources Consulted
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider `aws_dx_gateway` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dx_gateway.html.markdown
- AWS provider `aws_dx_transit_virtual_interface` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dx_transit_virtual_interface.html.markdown
- AWS provider `aws_dx_private_virtual_interface` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dx_private_virtual_interface.html.markdown
- AWS provider `aws_dx_hosted_private_virtual_interface` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dx_hosted_private_virtual_interface.html.markdown
- AWS provider `aws_dx_public_virtual_interface` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dx_public_virtual_interface.html.markdown
- AWS provider `aws_dx_gateway_association` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dx_gateway_association.html.markdown
- AWS provider `aws_cloudwatch_metric_alarm` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS Direct Connect transit gateway associations: https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-transit-gateways.html
- AWS Direct Connect allowed prefixes behavior: https://docs.aws.amazon.com/directconnect/latest/UserGuide/allowed-to-prefixes.html
- AWS Direct Connect CloudWatch metrics: https://docs.aws.amazon.com/directconnect/latest/UserGuide/monitoring-cloudwatch.html
- AWS Direct Connect virtual interface overview: https://docs.aws.amazon.com/en_us/directconnect/latest/UserGuide/create-vif.html

## Issues Found
- The post labeled the VIF example as a hosted private virtual interface, but the code used `aws_dx_private_virtual_interface`, which is not a hosted VIF and is not the correct VIF type for a Transit Gateway path. I changed the example to `aws_dx_transit_virtual_interface` and updated the example naming and comments to match.
- The Transit Gateway association snippet described `allowed_prefixes` as VPC prefixes. For Transit Gateway associations, AWS documents these as prefixes the Direct Connect gateway advertises to the on-premises network. I corrected the inline comment.
- The Virtual Private Gateway association example appeared alongside the Transit Gateway example without making the topology choice explicit. AWS documents that a Direct Connect gateway cannot be attached to a transit gateway when it is already associated with a virtual private gateway or attached to a private virtual interface. I updated the heading to clarify that the VGW example is an alternative.

## Review Notes
- The `tofu` CLI is not installed in this workspace, so command validation was done against the current OpenTofu documentation rather than local `tofu -help` output.
- The public virtual interface example assumes `var.onprem_public_cidr` is a public prefix that is valid to advertise over a Direct Connect public VIF.
- After the fixes above, the post is technically accurate against the consulted documentation as of 2026-05-07.
