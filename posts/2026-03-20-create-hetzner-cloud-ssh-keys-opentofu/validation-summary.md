# Validation Summary: How to Create Hetzner Cloud SSH Keys with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- Hetzner Cloud (hcloud) Terraform provider
- HCL (HashiCorp Configuration Language)
- SSH key management
- Hetzner Cloud servers (cx22, cx42 instance types, Ubuntu 24.04, nbg1 location)

## Sources Consulted
- Hetzner Cloud Terraform provider — `hcloud_ssh_key` resource: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/ssh_key.md
- Hetzner Cloud Terraform provider — `hcloud_server` resource: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/server.md
- Hetzner Cloud Terraform provider — `hcloud_ssh_key` data source: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/data-sources/ssh_key
- OpenTofu documentation for `TF_VAR_*` environment variable convention and `for_each` semantics

## Issues Found
No technical issues found.

- The `hcloud_ssh_key` resource correctly uses `name`, `public_key`, and the optional `labels` map.
- The exported `id` and `fingerprint` attributes are valid (the post references both).
- The `hcloud_server.ssh_keys` argument correctly accepts a list of SSH key IDs (or names).
- Server types `cx22` and `cx42` are valid current-generation Hetzner Cloud Intel shared vCPU types.
- `ubuntu-24.04` is a valid image slug, and `nbg1` (Nuremberg) is a valid location.
- The `for_each` with a `map(string)` variable and the `[for key in hcloud_ssh_key.team : key.id]` splat-style projection are valid HCL/OpenTofu.
- The `data "hcloud_ssh_key"` lookup by `name` is supported by the provider.
- The `TF_VAR_ssh_public_key` environment variable convention and `tofu apply` invocation are correct.

## Review Notes
- The post uses `file("~/.ssh/id_ed25519.pub")`. The `~` is expanded by Terraform/OpenTofu's `file()` function on Unix-like systems via the `pathexpand` semantics of the underlying read; in practice this works, though some users may prefer `pathexpand("~/.ssh/id_ed25519.pub")` for explicitness. Not an error — just a minor style nit.
- The Hetzner provider exposes the SSH key `fingerprint` as an MD5 hash (legacy SSH fingerprint format), not the modern SHA-256 representation shown by `ssh-keygen -lf` by default. Users consuming the output should be aware of the format. This is a provider/API behavior, not a post error.
- The post does not pin a `required_providers` version for `hcloud`. For long-lived production code, pinning is generally recommended, but its absence here is a stylistic choice consistent with a focused tutorial.
