# Validation Summary: How to Create Custom Security Health Analytics Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Security Command Center
- Security Health Analytics custom modules
- Common Expression Language (CEL)
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Compute Engine, Cloud Storage, GKE, Cloud SQL, and VPC firewall resources

## Sources Consulted
- Google Cloud: Overview of custom modules for Security Health Analytics - https://docs.cloud.google.com/security-command-center/docs/custom-modules-sha-overview
- Google Cloud: Code a custom module for Security Health Analytics - https://docs.cloud.google.com/security-command-center/docs/custom-modules-sha-code
- Google Cloud: Using custom modules with Security Health Analytics - https://docs.cloud.google.com/security-command-center/docs/custom-modules-sha-create
- Google Cloud SDK: `gcloud scc custom-modules sha create` - https://docs.cloud.google.com/sdk/gcloud/reference/scc/custom-modules/sha/create
- Google Cloud SDK: `gcloud scc custom-modules sha simulate` - https://docs.cloud.google.com/sdk/gcloud/reference/scc/custom-modules/sha/simulate
- Google Cloud SDK: `gcloud scc custom-modules sha update` - https://docs.cloud.google.com/sdk/gcloud/reference/scc/custom-modules/sha/update
- Google Cloud SDK: `gcloud scc findings list` - https://docs.cloud.google.com/sdk/gcloud/reference/scc/findings/list
- Google Cloud Security Command Center API: `CustomConfig` - https://docs.cloud.google.com/security-command-center/docs/reference/rest/v1/CustomConfig
- Google Cloud Security Command Center API: `SimulatedResource` - https://docs.cloud.google.com/security-command-center/docs/reference/rest/v1/SimulatedResource
- Google Cloud SQL Admin API: `IpConfiguration` - https://docs.cloud.google.com/sql/docs/mysql/admin-api/rest/v1beta4/instances#ipconfiguration

## Issues Found
- The prerequisite permission used the Security Center Management API permission name. Updated it to the documented Security Command Center custom module create permission.
- Custom module display names used hyphens, but documented display names must start with a lowercase letter and contain only alphanumeric characters or underscores. Updated example names to use underscores.
- YAML examples used REST-style camelCase fields. Updated them to the documented YAML field names such as `resource_selector`, `resource_types`, `custom_output`, and `value_expression`.
- The CEL label check used dot notation for a map key containing a hyphen. Updated it to test membership in the labels map with `'cost-center' in resource.labels`.
- The custom output example referenced `resource.project`, which is not a Compute Engine instance API field. Replaced it with `resource.machineType`.
- The Terraform example omitted the required `location = "global"` argument shown in current Google provider examples. Added it.
- The simulation example used a JSON file and `.json` filename even though the current `gcloud` command documents YAML input. Updated the example to `test-resource.yaml`.
- The lifecycle section described a `TEST` enablement state. Current custom module states are enabled, disabled, and inherited; testing is handled through simulation. Reworded the section and flow diagram accordingly.
- The Cloud SQL SSL example used legacy `requireSsl`. Updated it to use `sslMode`, which Google Cloud recommends for SSL/TLS enforcement.
- The findings list example used `--source=SECURITY_HEALTH_ANALYTICS`, but `--source` expects a source ID. Removed the invalid source flag and filtered by the custom module category instead.

## Review Notes
The post is technically relevant and valid after corrections. The examples remain illustrative and still require users to substitute their own organization, folder, project, and module IDs.
