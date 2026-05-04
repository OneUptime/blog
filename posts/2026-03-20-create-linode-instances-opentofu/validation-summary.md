# Validation Summary: How to Create Linode Instances with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- Linode (Akamai Cloud Compute) provider `linode/linode` v2.x
- HCL (HashiCorp Configuration Language)
- Linode Stackscripts
- Cloud-init / shell provisioning (via Stackscripts)
- Ubuntu 24.04 LTS

## Sources Consulted
- Linode Provider documentation on the OpenTofu/Terraform Registry: https://registry.terraform.io/providers/linode/linode/latest/docs
- `linode_instance` resource reference: https://registry.terraform.io/providers/linode/linode/latest/docs/resources/instance
- `linode_stackscript` resource reference: https://registry.terraform.io/providers/linode/linode/latest/docs/resources/stackscript
- Linode plan and pricing page: https://www.linode.com/pricing/ (Shared CPU / Dedicated plans)
- Linode regions reference: https://www.linode.com/global-infrastructure/
- Linode public images list (image IDs follow `linode/<distro><version>` format)

## Issues Found
No technical issues found.

All resource names, argument names, and attribute references match the official `linode/linode` v2.x provider schema:
- `linode_instance`: `label`, `region`, `type`, `image`, `root_pass`, `authorized_keys`, `tags`, `stackscript_id`, and the computed `ip_address` attribute are all correct.
- `linode_stackscript`: `label`, `description`, `script`, `images`, `is_public` are all correct (description and images are required, which the example provides).
- The Linode plan specs in the table (g6-nanode-1: 1 vCPU / 1 GB / 25 GB; g6-standard-1: 1/2/50; g6-standard-2: 2/4/80; g6-standard-4: 4/8/160) match Linode's published specifications.
- Region ID `us-east` (Newark, NJ) is a valid Linode region.
- Image ID `linode/ubuntu24.04` follows Linode's image ID format and Ubuntu 24.04 LTS is a supported image.
- The claim that resizing requires the instance to be shut down briefly is accurate (Linode resize operations require the instance to be powered off).

## Review Notes
- The example snippets reference `var.ssh_public_key` without declaring it explicitly in the snippet (other variables like `linode_token` and `root_password` are declared inline). This is a stylistic tutorial omission rather than a technical error — the reader is expected to declare it alongside the other variables.
- The post's description mentions "user data" and the intro mentions "cloud-init", but the body demonstrates Stackscripts (Linode's native provisioning mechanism) rather than cloud-init `user_data`. The Linode provider does also support a `metadata { user_data = ... }` block via the Linode Metadata Service for instances using cloud-init-compatible images; that could be a future addition, but the current Stackscript example is technically valid and a common Linode-idiomatic approach.
- The `provider "linode"` block's inline comment notes that `LINODE_TOKEN` can be set via environment variable; this is correct — the provider reads `LINODE_TOKEN` automatically when `token` is not set.
- Version constraint `~> 2.0` allows any 2.x release, which is appropriate for current usage.
