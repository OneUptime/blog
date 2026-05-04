# Validation Summary: How to Create Linode VLANs with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform
- Linode Terraform Provider (`linode_instance` resource)
- Linode VLANs (Layer 2 private networking)
- cloud-init / Linode Metadata service

## Sources Consulted
- Linode Terraform provider `linode_instance` resource docs: https://github.com/linode/terraform-provider-linode/blob/main/docs/resources/instance.md
- Akamai/Linode VLAN product documentation: https://techdocs.akamai.com/cloud-computing/docs/vlan
- Terraform Registry — Linode provider: https://registry.terraform.io/providers/linode/linode/latest/docs/resources/instance

## Issues Found
- **`user_data` is not a top-level field on `linode_instance`.** The cloud-init example used `user_data = <<-EOT ... EOT` directly on the resource. Per the official Linode provider docs, `user_data` lives inside a `metadata` block and must be base64-encoded. Fixed by wrapping the heredoc in `metadata { user_data = base64encode(...) }`.

## Review Notes
- Verified that the `interface` block accepts `purpose` (`"public"`, `"vlan"`, `"vpc"`), `label` (required for `vlan`), and `ipam_address` (CIDR notation, allowed only for `vlan`).
- Verified that the public interface, when present, must occupy `eth0`, so the post's eth0/eth1 mapping for the dual-interface examples is correct.
- VLANs are scoped per region (per Akamai docs: "VLANs are region-specific" and "up to 10 VLANs per region"), so the post's claim that VLANs are "isolated per account and region" is accurate.
- The Linode Metadata service (which delivers `user_data` to cloud-init) is only available on specific images and supported instance types; readers using older or non-metadata-supported images may need an alternative provisioning mechanism.
- Instance type `g6-standard-2` and image `linode/ubuntu24.04` are valid identifiers.
