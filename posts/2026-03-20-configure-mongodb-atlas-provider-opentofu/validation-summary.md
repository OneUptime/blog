# Validation Summary: How to Configure Mongodb Atlas Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- MongoDB Atlas
- MongoDB Atlas Terraform/OpenTofu Provider (`mongodb/mongodbatlas`)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- MongoDB Atlas Provider on the Terraform Registry: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs
- `mongodbatlas_project` resource docs: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/project
- MongoDB Atlas provider authentication / configuration reference (env vars `MONGODB_ATLAS_PUBLIC_KEY`, `MONGODB_ATLAS_PRIVATE_KEY`)
- OpenTofu documentation for `required_providers` and `required_version`: https://opentofu.org/docs/language/providers/requirements/
- Cross-referenced with the sibling post `posts/2026-03-20-mongodb-atlas-provider-opentofu/README.md` to confirm the provider source string and version range

## Issues Found
The original post was a generic placeholder template that did not match the title. The title promises "MongoDB Atlas Provider with OpenTofu", but the body used unsubstituted placeholders (`provider_name`, `provider-namespace/provider-name`, `provider_example_resource`, `PROVIDER_API_KEY`, `PROVIDER_API_SECRET`). This made the post technically inaccurate as a MongoDB Atlas tutorial. Fixes:

- **Provider source**: Replaced `provider-namespace/provider-name` and `provider_name` with the official source `mongodb/mongodbatlas` and provider name `mongodbatlas`. Pinned to `~> 1.24` (current major series of the official MongoDB Atlas provider).
- **Authentication env vars**: Replaced the generic `PROVIDER_API_KEY` / `PROVIDER_API_SECRET` with the provider's actual variables `MONGODB_ATLAS_PUBLIC_KEY` and `MONGODB_ATLAS_PRIVATE_KEY`. Also corrected the inline-credential comment to reference the real attribute names `public_key` / `private_key`.
- **Provider block**: Renamed `provider "provider_name"` to `provider "mongodbatlas"` so it matches the `required_providers` declaration.
- **Example resource**: Replaced the generic `provider_example_resource` with a real resource type (`mongodbatlas_project`), including its required `org_id` argument and the `tags` map (supported on `mongodbatlas_project`).
- **Variables**: Added `org_id` variable to support the new example resource.
- **Output**: Renamed `resource_id` to `project_id` and pointed it at `mongodbatlas_project.main.id` so it lines up with the example resource.

## Review Notes
- The provider version pin (`~> 1.24`) is current as of the validation date but should be revisited as the `mongodb/mongodbatlas` provider releases new minor versions.
- The `tags` argument on `mongodbatlas_project` was introduced in a recent v1.x release; if a reader uses a much older provider version, the `tags` block will fail. The `~> 1.24` constraint avoids this.
- The post intentionally keeps the structure of the author's "configure-*-provider-opentofu" template family. No structural changes were made beyond substituting accurate provider-specific values.
- The author's writing style and tone (and the existing typo "Mongodb" in the title — preserved for consistency with other titles in the repo) were left intact.
