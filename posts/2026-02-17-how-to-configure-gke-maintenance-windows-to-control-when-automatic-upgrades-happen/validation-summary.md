# Validation Summary: Configure GKE Maintenance Windows to Control When Automatic Upgrades Happen

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud CLI (`gcloud`)
- Kubernetes cluster upgrades and maintenance policies
- Terraform Google provider
- RFC 5545 recurrence rules
- Pod Disruption Budgets
- Cloud Logging

## Sources Consulted
- Google Cloud GKE documentation: Maintenance windows and exclusions: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/maintenance-windows-and-exclusions
- Google Cloud GKE documentation: Configure maintenance windows and exclusions: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/maintenance-windows-and-exclusions
- Google Cloud SDK reference: `gcloud container clusters update`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Terraform Registry documentation: `google_container_cluster`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- RFC 5545, Internet Calendaring and Scheduling Core Object Specification: https://www.rfc-editor.org/rfc/rfc5545

## Issues Found
- The post stated that GKE holds off on making changes outside maintenance windows. Updated this to specify applicable automatic maintenance, and noted that emergency upgrades and some underlying Google Cloud maintenance can still occur outside the window.
- The maintenance exclusions section said exclusions block maintenance entirely. Updated this to specify applicable automatic maintenance, matching GKE's documented scope.
- The example maintenance exclusion dates were in the past as of the validation date. Updated the gcloud and Terraform exclusion examples to use future dates.
- The scope descriptions could imply that exclusions block manual upgrades. Updated them to refer to automatic upgrades.
- The post omitted the restriction that non-release-channel clusters only support the default `no_upgrades` exclusion scope. Added a short note.
- The maintenance availability requirement omitted that only contiguous windows of at least four hours count toward the 48-hour requirement. Added that detail.

## Review Notes
The gcloud maintenance window flags, maintenance exclusion flags, Terraform `maintenance_policy` schema, RFC 5545 recurrence examples, UTC examples, and removal commands are otherwise consistent with current official documentation. `gcloud` was not installed locally, so CLI verification used the official Google Cloud SDK reference instead of local `--help` output.
