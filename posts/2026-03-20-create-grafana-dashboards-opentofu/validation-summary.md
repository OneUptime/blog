# Validation Summary: How to Create Grafana Dashboards with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Grafana Terraform provider (`grafana/grafana`)
- Grafana dashboards (JSON model, schemaVersion 36)
- Grafana folders and folder permissions
- Prometheus query language (PromQL) in dashboard panel targets

## Sources Consulted
- Grafana provider registry: https://registry.terraform.io/providers/grafana/grafana/latest/docs
- `grafana_folder` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/folder
- `grafana_dashboard` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/dashboard
- `grafana_folder_permission` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/folder_permission
- `grafana_team` resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/team
- Provider versions endpoint: https://registry.terraform.io/v1/providers/grafana/grafana/versions

## Issues Found
- **Outdated provider version constraint**: The post pinned `version = "~> 2.0"`, which is two major versions behind. The Grafana provider has since released 3.x and 4.x (latest stable 4.35.0 as of April 2026). Updated the constraint to `~> 3.0` to reflect a current, supported major. The HCL syntax used in the post is compatible with both 3.x and 4.x.

## Review Notes
- The `folder` argument on `grafana_dashboard` accepts either the numeric `id` or the string `uid` of a `grafana_folder`. The post uses `grafana_folder.application.id`, which is valid; the provider's own current examples prefer `.uid` because UIDs are stable across Grafana upgrades while numeric IDs are legacy. Both work today.
- `grafana_folder_permission` correctly uses `folder_uid` (not `folder`), and the `permissions` block correctly uses `team_id` and `permission`. The values "Edit" and "View" are valid (full set: View, Edit, Admin).
- The `grafana_team.backend` and `grafana_team.oncall` references in the folder permissions example assume those team resources are defined elsewhere. The post does not show their definitions, but the references themselves are syntactically correct.
- Starting with Grafana v13, Kubernetes-style dashboard resources are also available alongside the legacy `grafana_dashboard` resource. The legacy resource shown in the post still works; no change needed, but readers using newer Grafana versions may want to evaluate the newer resources.
- Provider `auth` argument is correct for API tokens / service account tokens.
