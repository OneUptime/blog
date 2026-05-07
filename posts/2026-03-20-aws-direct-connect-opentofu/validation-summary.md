# Validation Summary: How to Set Up AWS Direct Connect with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Direct Connect
- AWS Direct Connect Gateway
- AWS Transit Gateway
- AWS Virtual Private Gateway (VGW)
- AWS CLI

## Sources Consulted
- AWS provider resource docs: `aws_dx_gateway` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_gateway
- AWS provider resource docs: `aws_dx_private_virtual_interface` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_private_virtual_interface
- AWS provider resource docs: `aws_dx_transit_virtual_interface` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_transit_virtual_interface
- AWS provider resource docs: `aws_dx_gateway_association` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_gateway_association
- AWS provider resource docs: `aws_dx_lag` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_lag
- AWS Direct Connect gateways https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-gateways.html
- Allowed prefixes interactions for Direct Connect gateways https://docs.aws.amazon.com/directconnect/latest/UserGuide/allowed-to-prefixes.html
- Direct Connect gateways and transit gateway associations https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-transit-gateways.html
- Direct Connect link aggregation groups (LAGs) https://docs.aws.amazon.com/directconnect/latest/UserGuide/lags.html
- Dedicated AWS Direct Connect connections https://docs.aws.amazon.com/directconnect/latest/UserGuide/dedicated_connection.html
- AWS CLI `describe-virtual-interfaces` https://docs.aws.amazon.com/cli/latest/reference/directconnect/describe-virtual-interfaces.html

## Issues Found
- The original post reused one Direct Connect gateway for both the private-VIF/VGW path and the transit-VIF/TGW path. I changed Step 4 to create a separate Direct Connect gateway for the transit design and set its Amazon-side ASN to `65030`, because AWS does not allow a Direct Connect gateway associated with VGWs or private VIFs to also be associated with a transit gateway, and the Direct Connect gateway ASN must differ from the transit gateway ASN.
- The `allowed_prefixes` examples in Step 3 were described as on-premises routes. I changed them to VPC CIDR examples and updated the comments because, for VGW associations, AWS uses `allowed_prefixes` as a filter for the VPC CIDRs advertised through the Direct Connect gateway.
- The LAG section implied it applied generally to any Direct Connect connection. I clarified in the prerequisites and heading that this step applies to dedicated connections, because AWS LAGs aggregate dedicated connections.
- The conclusion overstated the redundancy guidance and blurred the two architectural patterns. I corrected it to match AWS guidance on redundant connections and to distinguish private-VIF/VGW and transit-VIF/TGW designs.
- The Step 1 ASN comment only mentioned the 16-bit private ASN range. I expanded it to include the supported 32-bit private ASN range documented by the provider.

## Review Notes
- The OpenTofu snippets remain example fragments; a full production deployment still needs provider configuration, VPC or transit gateway route-table updates, and the on-premises router-side BGP configuration.
- The LAG resource creates the LAG itself; associating additional existing connections may also require `aws_dx_connection_association`.
