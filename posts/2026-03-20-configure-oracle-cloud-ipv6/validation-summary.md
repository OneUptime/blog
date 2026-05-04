# Validation Summary: How to Configure Oracle Cloud Infrastructure with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Oracle Cloud Infrastructure (OCI) — Virtual Cloud Networks (VCN), subnets, instances, internet gateways, route tables, security lists
- IPv6 networking (Oracle GUA allocation, /56 VCN, /64 subnets)
- OCI CLI (`oci network vcn create`, `oci network vcn add-ipv6-vcn-cidr`)
- HashiCorp Terraform (`terraform-provider-oci`: `oci_core_vcn`, `oci_core_subnet`, `oci_core_instance`, `oci_core_internet_gateway`, `oci_core_route_table`, `oci_core_security_list`)
- Linux IPv6 verification commands (`ip -6 addr`, `ping6`, `ip -6 route`)

## Sources Consulted
- OCI Terraform provider docs: https://github.com/oracle/terraform-provider-oci/blob/master/website/docs/r/core_vcn.html.markdown
- OCI Terraform provider subnet docs: `website/docs/r/core_subnet.html.markdown`
- OCI Terraform provider instance docs (create_vnic_details): `website/docs/r/core_instance.html.markdown`
- OCI CLI reference — `oci network vcn create`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/network/vcn/create.html
- OCI CLI reference — `oci network vcn add-ipv6-vcn-cidr`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/network/vcn/add-ipv6-vcn-cidr.html
- HashiCorp `cidrsubnet` function reference: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet

## Issues Found
1. **Invalid OCI CLI flag for adding IPv6 CIDR.** The post used `--ipv6-cidr-type ORACLE_ALLOCATED` for `oci network vcn add-ipv6-vcn-cidr`. This flag does not exist on that command. Per the OCI CLI reference, the correct flag for Oracle GUA allocation is `--is-oracle-gua-allocation-enabled`. Fixed by replacing with `--is-oracle-gua-allocation-enabled true`.

2. **Broken Terraform expression for subnet IPv6 CIDR.** The post used a `substr(...)` string-manipulation expression to derive the /64 subnet IPv6 CIDR from the VCN's /56. The expression produced an invalid IPv6 CIDR (containing two `::` separators and a stray `/`). Fixed by replacing with the standard HashiCorp/Oracle pattern `cidrsubnet(oci_core_vcn.main.ipv6cidr_blocks[0], 8, 0)`, which correctly extends the /56 prefix by 8 bits to produce a /64.

3. **Misleading comment in security list.** The ingress rule comment said "Allow inbound HTTP/HTTPS from IPv6" but the rule only permits port 443 (HTTPS). Updated the comment to "Allow inbound HTTPS from IPv6" to match the rule.

## Review Notes
- The Terraform OCI provider attribute names used in the post (`is_ipv6enabled`, `ipv6cidr_block`, `ipv6cidr_blocks`, `assign_ipv6ip`) are all correct — the provider deliberately omits the underscore between `ipv6` and the following token, which is an OCI provider quirk.
- `enabled = true` on `oci_core_internet_gateway` is the default; explicitly setting it is harmless.
- `protocol = "6"` is the correct IANA protocol number for TCP in OCI security lists.
- The verification section uses standard Linux IPv6 tooling and is correct.
- The example IPv6 address `2603:c020:400f:abc::1/64` in the verification output is illustrative only; actual Oracle GUA assignments will differ.
