# Validation Summary: How to Create OCI Virtual Cloud Networks with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HashiCorp Configuration Language (HCL2)
- Oracle Cloud Infrastructure (OCI)
- OCI Terraform/OpenTofu provider (`oracle/oci`)
- OCI Networking: VCN, Subnets, Internet Gateway, NAT Gateway, Route Tables, Security Lists

## Sources Consulted
- Oracle OCI Terraform provider documentation: https://registry.terraform.io/providers/oracle/oci/latest/docs/
- OCI provider source / docs on GitHub: https://github.com/oracle/terraform-provider-oci (resource markdown for `core_vcn`, `core_internet_gateway`, `core_route_table`, `core_subnet`, `core_nat_gateway`, `core_security_list`)
- HCL2 language specification (block bodies / attribute terminators)
- IANA Protocol Numbers (TCP = 6)

## Issues Found
- **Invalid HCL2 syntax in security list `tcp_options` blocks.** The original used semicolons to put two attributes on one line, e.g. `tcp_options { max = 443; min = 443 }`. HCL2 does not support semicolons as attribute separators inside a block — body items must be newline-terminated. OpenTofu/Terraform would fail to parse this. Fixed by expanding both `tcp_options` blocks (port 443 and port 80) onto multiple lines with newline-separated `max`/`min` attributes.

All other resources (`oci_core_vcn`, `oci_core_internet_gateway`, `oci_core_route_table`, `oci_core_subnet`, `oci_core_nat_gateway`, `oci_core_security_list`) and their argument names (`compartment_id`, `vcn_id`, `cidr_block`, `dns_label`, `freeform_tags`, `display_name`, `enabled`, `route_rules`, `destination`, `destination_type`, `network_entity_id`, `route_table_id`, `prohibit_public_ip_on_vnic`, `egress_security_rules`, `ingress_security_rules`, `protocol`, `source`, `destination`) were verified against the official OCI provider docs and are correct. Protocol number `"6"` for TCP is correct per IANA.

## Review Notes
- The flat `tcp_options { min = X, max = Y }` form (used in the post after the fix) is supported by the OCI provider and appears in Oracle's own documentation examples, but it is the legacy form. The modern, recommended schema is to nest the values inside a `destination_port_range` block:
  ```hcl
  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
  ```
  Both forms work today; future provider versions may eventually remove the flat form.
- The `cidr_block` attribute on `oci_core_vcn` still works but Oracle now also exposes `cidr_blocks` (a list) for multi-CIDR VCNs. Single-CIDR usage as in the post is fine.
- `prohibit_public_ip_on_vnic` is correct; a newer companion argument `prohibit_internet_ingress` exists for the case where you want to block all internet ingress at the subnet level. Only one is needed; the post's choice is appropriate for the public/private subnet pattern shown.
- The "private" subnet in the "Creating Public and Private Subnets" section omits `route_table_id`, which makes it use the VCN's default route table. The post's inline comment correctly notes this. Acceptable for an introductory example.
