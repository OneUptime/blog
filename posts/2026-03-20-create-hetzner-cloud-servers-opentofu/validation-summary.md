# Validation Summary: How to Create Hetzner Cloud Servers with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Hetzner Cloud (`hetznercloud/hcloud` provider)
- `hcloud_server` and `hcloud_ssh_key` resources
- Cloud-init (`#cloud-config`)
- Ubuntu 24.04 LTS
- Hetzner server types: cx22, cx32, cx42, cpx11, cax11

## Sources Consulted
- Hetzner Cloud Terraform/OpenTofu provider docs: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs
- `hcloud_server` resource: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/server
- `hcloud_ssh_key` resource: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/ssh_key
- Hetzner Cloud server types (pricing/specs): https://www.hetzner.com/cloud
- Cloud-init documentation: https://cloudinit.readthedocs.io/
- OpenTofu/Terraform `lifecycle` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/lifecycle/

## Issues Found
No technical issues found.

- Provider source `hetznercloud/hcloud` and version constraint `~> 1.49` are valid and current for early 2026.
- All `hcloud_server` and `hcloud_ssh_key` resource arguments are correct (name, image, server_type, location, ssh_keys, labels, user_data, public_key).
- The `ipv4_address` attribute on `hcloud_server` is a real exported attribute.
- Server type specifications are accurate per Hetzner's published specs:
  - cx22: 2 vCPU / 4 GB / 40 GB (Intel)
  - cx32: 4 vCPU / 8 GB / 80 GB (Intel)
  - cx42: 8 vCPU / 16 GB / 160 GB (Intel)
  - cpx11: 2 vCPU / 2 GB / 40 GB (AMD)
  - cax11: 2 vCPU / 4 GB / 40 GB (ARM64 Ampere)
- Location code `nbg1` (Nuremberg) is a valid Hetzner location.
- Image identifier `ubuntu-24.04` is a valid Hetzner image slug.
- Cloud-init `#cloud-config` snippet (packages + runcmd) is syntactically valid.
- `lifecycle { ignore_changes = [user_data] }` is correctly used to prevent server rebuilds when `user_data` changes (per Hetzner provider docs, changes to `user_data` force a server replacement).

## Review Notes
- The post description mentions "network placement," but the post does not actually demonstrate attaching a server to an `hcloud_network`. This is a content/scope nit rather than a technical inaccuracy, so no edit was made.
- The `cpx` (AMD) and `cax` (ARM) lines have additional sizes beyond the ones listed (e.g., cpx21, cpx31, cax21, cax31); the table is intentionally a small "popular" subset, which is fine.
- Hetzner currently offers US locations (`ash`, `hil`) in addition to EU locations — the intro statement about "Europe and the US" is accurate.
- For production use, readers should be aware that the `hcloud_ssh_key.default.id` is an integer; passing it inside the `ssh_keys` list works because the provider accepts either IDs or names. No change needed.
