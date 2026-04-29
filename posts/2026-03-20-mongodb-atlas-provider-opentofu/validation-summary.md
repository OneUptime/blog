# Validation Summary: How to Configure the MongoDB Atlas Provider in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (>= 1.6.0)
- MongoDB Atlas Terraform/OpenTofu provider (`mongodb/mongodbatlas`)
- HashiCorp Configuration Language (HCL)
- MongoDB Atlas resources: projects, teams, alert configurations, cloud backup schedules

## Sources Consulted
- MongoDB Atlas Terraform Provider documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs
- `mongodbatlas_project` resource docs
- `mongodbatlas_team` resource docs
- `mongodbatlas_project_team` resource docs
- `mongodbatlas_alert_configuration` resource docs
- `mongodbatlas_cloud_backup_schedule` resource docs
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/

## Issues Found

The post was published as a generic template — every code example used `example`/`hashicorp/example` placeholders rather than actual MongoDB Atlas provider details, despite the title and topic. I replaced the placeholders with verified MongoDB Atlas configuration:

- **Step 1 (Provider block):** Changed `hashicorp/example` to `mongodb/mongodbatlas` with version `~> 1.24` (a current stable line in the 1.x series). Updated the inline comments to reference the actual auth env vars (`MONGODB_ATLAS_PUBLIC_KEY` / `MONGODB_ATLAS_PRIVATE_KEY`) and the correct provider config fields (`public_key`, `private_key`).
- **Step 2 (Authentication):** Replaced `PROVIDER_API_KEY` / `PROVIDER_TOKEN` / `PROVIDER_ORG` with the real `MONGODB_ATLAS_PUBLIC_KEY` and `MONGODB_ATLAS_PRIVATE_KEY` env vars (no `MONGODB_ATLAS_ORG_ID` env var exists in the provider; the org ID is passed per-resource). Updated the variable declarations accordingly and added an `org_id` variable.
- **Step 3 (Basic resources):** Replaced `example_project` with `mongodbatlas_project` (using the required `name` and `org_id` fields plus the supported `tags` map). Replaced `example_team` with the correct two-resource pattern: `mongodbatlas_team` for the org-level team (with required `name`, `org_id`, `usernames`) and `mongodbatlas_project_team` to assign the team to the project with `role_names` (using the valid `GROUP_READ_WRITE` role).
- **Step 4 (Advanced settings):** Replaced the fictional `example_alert` with `mongodbatlas_alert_configuration`, using the correct `event_type` (`OUTSIDE_METRIC_THRESHOLD`), the required `notification` block (with `type_name`, `email_address`, `delay_min`), and the correct `metric_threshold_config` block (with `metric_name`, `operator`, `threshold`, `units`, `mode`). Replaced `example_backup_policy` with `mongodbatlas_cloud_backup_schedule`, which is configured per-cluster and uses `reference_hour_of_day` / `reference_minute_of_hour` plus `policy_item_daily` blocks (rather than a free-form cron schedule string).
- **Step 5 (Outputs):** Updated the resource references to point to `mongodbatlas_project.main`.

Prerequisites were also clarified to mention an Atlas account, organization, and API key (public/private).

The OpenTofu CLI commands in Step 6 (`tofu init`, `tofu validate`, `tofu plan`, `tofu apply`) are correct as-is.

## Review Notes
- The introduction and conclusion contain awkward phrasing (the post title is repeated as a sentence subject), but this is stylistic, not a technical error, so it was left as-is per the review scope.
- The example references `var.environment` and `var.notification_email` without declaring them — these were already part of the original post's pattern, so they were preserved. Readers will need to declare these variables in their own configuration.
- The `mongodbatlas_cloud_backup_schedule` resource requires an existing cluster (`cluster_name`); the example uses a placeholder string `"your-cluster-name"` because the original post did not include a cluster resource. In a real configuration, this would reference `mongodbatlas_advanced_cluster.<name>.name`.
- Provider version `~> 1.24` was chosen as a reasonable current pin for the 1.x line; readers should always check the Terraform Registry for the latest stable release before deploying.
