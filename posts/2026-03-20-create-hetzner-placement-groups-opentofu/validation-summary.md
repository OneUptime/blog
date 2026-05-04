# Validation Summary: How to Create Hetzner Cloud Placement Groups with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Hetzner Cloud (`hcloud`) Terraform provider
- `hcloud_placement_group` resource
- `hcloud_server` resource
- `hcloud_load_balancer_target` resource

## Sources Consulted
- Hetzner Cloud Placement Groups overview: https://docs.hetzner.com/cloud/placement-groups/overview/
- Hetzner Cloud Placement Groups FAQ: https://docs.hetzner.com/cloud/placement-groups/faq/
- Terraform Registry — `hcloud_placement_group`: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/placement_group
- Terraform Registry — `hcloud_load_balancer_target`: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/load_balancer_target
- Terraform Registry — `hcloud_server`: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/server

## Issues Found

1. **Incorrect `label_selector` syntax in `hcloud_load_balancer_target`.** The post used a nested block (`label_selector { selector = "role=web" }`), but the provider defines `label_selector` as a string attribute. Changed to `label_selector = "role=web"` to match the provider schema.

2. **Incorrect claim that servers must be in the same location as the placement group.** The Hetzner FAQ explicitly states placement groups can include servers from different locations; the `spread` type is merely best suited for same-location servers because it only protects against single-host failures. Rewrote that bullet accordingly.

3. **Incorrect claim that placement groups can only be assigned at server creation time.** Hetzner's FAQ confirms existing servers can be added to a placement group, provided they are powered off. Replaced the bullet with the correct constraint.

4. **Added missing limits documented by Hetzner** — up to 50 placement groups per project and one placement group per server — to round out the limitations section in line with the official overview, while preserving the post's structure.

## Review Notes

- Confirmed `spread` is currently the only supported placement group type.
- Confirmed the 10-server limit per placement group (type `spread`) per Hetzner's overview docs.
- The `count` and `for_each` examples and the `placement_group_id` attribute on `hcloud_server` are correct per the Terraform provider.
- The output expressions and label-selector load balancer pattern are valid HCL and consistent with provider documentation after the syntax fix.
