# Validation Summary: How to Create OCI Network Security Groups with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu (Terraform-compatible)
- Oracle Cloud Infrastructure (OCI)
- OCI Network Security Groups (NSGs)
- OCI Core / Networking service
- OCI Compute (instance VNICs)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Oracle Terraform/OpenTofu provider docs for `oci_core_network_security_group_security_rule` (https://github.com/oracle/terraform-provider-oci/blob/master/website/docs/r/core_network_security_group_security_rule.html.markdown)
- Oracle Terraform/OpenTofu provider docs for `oci_core_instance` (https://github.com/oracle/terraform-provider-oci/blob/master/website/docs/r/core_instance.html.markdown)
- Terraform Registry: Oracle OCI provider resource pages (https://registry.terraform.io/providers/oracle/oci/latest/docs)
- OCI Networking concepts: NSGs vs Security Lists (Oracle docs)

## Issues Found
No technical issues found.

Verification details:
- `oci_core_network_security_group` accepts `compartment_id` (required), `vcn_id` (required), `display_name`, and `freeform_tags` — all used correctly.
- `oci_core_network_security_group_security_rule` accepts `network_security_group_id`, `direction` (`INGRESS`/`EGRESS`), `protocol`, `source`/`destination`, `source_type`/`destination_type`, `description`, `stateless`, and `tcp_options` — all used correctly.
- Protocol values: `"6"` (TCP), `"17"` (UDP), `"1"` (ICMP), `"58"` (ICMPv6), and `"all"` are supported. The inline comment is correct.
- `source_type` values `CIDR_BLOCK` and `NETWORK_SECURITY_GROUP` are valid (also `SERVICE_CIDR_BLOCK`).
- `tcp_options { destination_port_range { min, max } }` block structure is correct.
- `create_vnic_details` block on `oci_core_instance` accepts `subnet_id`, `assign_public_ip`, and `nsg_ids` (list of NSG OCIDs) — used correctly.
- The factual claim that NSGs are stateful, attach at the VNIC level, and can reference other NSGs as source/destination matches Oracle's documentation.

## Review Notes
- NSGs are limited to 5 per VNIC by OCI (a common pitfall worth noting in future expansions, but not strictly required for correctness).
- The conclusion mentions attaching NSGs to load balancers and database systems; this is accurate (e.g., `oci_load_balancer_load_balancer.network_security_group_ids`, `oci_database_db_system` supports NSGs on the VNIC).
- Each `oci_core_network_security_group_security_rule` is a single rule resource; the provider also supports adding rules inline via the now-removed-but-historically-used `security_rules` argument on the NSG resource. The single-rule resource pattern shown here is the current recommended approach.
