# Validation Summary: How to Configure Linode Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- Linode (Akamai Cloud Computing)
- Linode Terraform/OpenTofu Provider (`linode/linode`)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Linode Provider on the Terraform Registry: https://registry.terraform.io/providers/linode/linode/latest/docs
- `linode_instance` resource docs: https://registry.terraform.io/providers/linode/linode/latest/docs/resources/instance
- Linode provider authentication / configuration reference (env var `LINODE_TOKEN`, attribute `token`)
- Linode API reference for instance types and images (e.g., `g6-nanode-1`, `linode/ubuntu22.04`)
- OpenTofu documentation for `required_providers` and `required_version`: https://opentofu.org/docs/language/providers/requirements/

## Issues Found
The original post was a generic placeholder template that did not match the title. The title promises "Linode Provider with OpenTofu", but the body used unsubstituted placeholders (`provider_name`, `provider-namespace/provider-name`, `provider_example_resource`, `PROVIDER_API_KEY`, `PROVIDER_API_SECRET`). This made the post technically inaccurate as a Linode tutorial. Fixes:

- **Provider source**: Replaced `provider-namespace/provider-name` and `provider_name` with the official source `linode/linode` and provider name `linode`. Pinned to `~> 2.0` (current major series of the official Linode provider).
- **Authentication env vars**: Replaced the generic `PROVIDER_API_KEY` / `PROVIDER_API_SECRET` with the provider's actual single variable `LINODE_TOKEN` (Linode uses a single Personal Access Token, not a key/secret pair). Updated the inline-credential comment to reference the real attribute name `token`.
- **Provider block**: Renamed `provider "provider_name"` to `provider "linode"` so it matches the `required_providers` declaration.
- **Example resource**: Replaced the generic `provider_example_resource` with a real resource type (`linode_instance`), including its required arguments (`label`, `region`, `type`, `image`). On Linode, `tags` is a `Set of String` (not a map), so the `tags` block was rewritten as `[var.environment, "managed-by-opentofu"]` to match the resource schema. The `name` argument was renamed to `label` (Linode's instance identifier attribute).
- **Variables**: Added `region` variable (required by `linode_instance`).
- **Output**: Renamed `resource_id` to `instance_id` and pointed it at `linode_instance.main.id` so it lines up with the example resource.

## Review Notes
- The provider version pin (`~> 2.0`) is current as of the validation date. The Linode provider went 2.x in 2024; new minor releases continue to ship and the pin should be revisited periodically.
- The example uses image `linode/ubuntu22.04` and type `g6-nanode-1`. Both are valid Linode catalog values at validation time; they may be superseded by newer Ubuntu images / instance plans in the future, but neither has been removed.
- The example omits `root_pass` and `authorized_keys` — `linode_instance` requires one of these (or `disk` blocks) to actually boot. The post is intentionally minimal as a configuration walkthrough rather than an end-to-end working example, in line with the rest of the author's "configure-*-provider-opentofu" template family.
- The post intentionally keeps the structure of the author's template family. No structural changes were made beyond substituting accurate Linode-specific values.
- The author's writing style and tone were left intact.
