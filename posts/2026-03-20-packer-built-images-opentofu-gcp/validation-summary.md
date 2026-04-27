# Validation Summary: How to Use Packer-Built Images in OpenTofu on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Packer (`googlecompute` builder plugin)
- OpenTofu / Terraform
- Google Cloud Platform (Compute Engine, custom images, image families)
- Terraform Google provider (`google_compute_image`, `google_compute_instance_template`, `google_compute_region_instance_group_manager`)
- HCL2 (functions: `replace`, `formatdate`, `timestamp`, `md5`, `substr`)

## Sources Consulted
- Packer googlecompute plugin documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/googlecompute/latest/components/builder/googlecompute
- Terraform Google provider — `google_compute_image` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/compute_image
- Terraform Google provider — `google_compute_instance_template` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template
- Terraform Google provider — `google_compute_region_instance_template` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_instance_template
- Terraform Google provider — `google_compute_region_instance_group_manager` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_instance_group_manager
- GCP image families documentation: https://cloud.google.com/compute/docs/images/image-families-best-practices

## Issues Found
1. **Duplicate `image_family` argument in the Packer `googlecompute` source block.** The block declared `image_family = "web-server"` twice (once with the other image fields, once again at the end). HCL rejects duplicate arguments in the same block, so this would fail to parse. Removed the duplicate trailing line.
2. **Invalid `region` argument on `google_compute_instance_template`.** The `google_compute_instance_template` resource is a *global* resource and does not support a `region` argument — that argument exists on `google_compute_region_instance_template`. As written, `tofu plan` would error with "Unsupported argument: region". Since a global instance template can be referenced by a regional MIG (`google_compute_region_instance_group_manager`), the minimal fix was to remove the `region = var.region` line. The MIG itself still has the required `region` argument.

## Review Notes
- The `most_recent` comment on the `google_compute_image` data source is accurate: when looking up by `family`, the provider returns the latest non-deprecated image automatically.
- For a regional MIG, `max_surge_fixed = 3` aligns with the typical 3-zone region requirement (surge must be at least the number of zones).
- The "Image Family for Rolling Updates" section uses `name = "web-server-${substr(md5(...), 0, 8)}"` together with `create_before_destroy = true`. Using a deterministic `name` rather than `name_prefix` works here because the suffix changes with each new image, but mixing this with the earlier `name_prefix` example may confuse readers — both patterns are valid, just be consistent in real configs.
- `update_policy.minimal_action = "REPLACE"` together with `max_unavailable_fixed = 0` and `max_surge_fixed = 3` will perform a full surge-then-replace rollout, which is the intended pattern for image-family-driven rolling updates.
- `source_image_project_id` correctly accepts a list of strings in the current Packer googlecompute plugin.
