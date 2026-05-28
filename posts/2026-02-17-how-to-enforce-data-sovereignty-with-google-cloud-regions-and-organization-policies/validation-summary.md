# Validation Summary: How to Enforce Data Sovereignty with Google Cloud Regions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud organization policies
- Resource location constraints
- BigQuery
- Cloud Storage
- Cloud SQL
- Spanner
- Cloud Asset Inventory
- Cloud Functions / Pub/Sub event handling
- Assured Workloads
- Google Cloud CLI
- Python

## Sources Consulted
- Google Cloud Organization Policy: Restrict resource locations: https://docs.cloud.google.com/organization-policy/restrict-locations
- Google Cloud SDK: `gcloud resource-manager org-policies set-policy`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Google Cloud SDK: `gcloud resource-manager org-policies describe`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/describe
- Google Cloud SDK: `gcloud org-policies set-policy`: https://cloud.google.com/sdk/gcloud/reference/org-policies/set-policy
- Google Cloud BigQuery custom constraints: https://docs.cloud.google.com/bigquery/docs/custom-constraints
- Google Cloud SDK: `gcloud storage buckets create`: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud SDK: `gcloud storage buckets update`: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Google Cloud SDK: `gcloud sql instances create`: https://cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Google Cloud SDK: `gcloud spanner instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- Spanner regional, dual-region, and multi-region configurations: https://docs.cloud.google.com/spanner/docs/instance-configurations
- Cloud Asset Inventory `SearchAllResourcesRequest` Python reference: https://docs.cloud.google.com/python/docs/reference/cloudasset/latest/google.cloud.asset_v1.types.SearchAllResourcesRequest
- Cloud Asset Inventory `ResourceSearchResult` Python reference: https://docs.cloud.google.com/python/docs/reference/cloudasset/latest/google.cloud.asset_v1.types.ResourceSearchResult
- Cloud Asset Inventory supported asset types: https://docs.cloud.google.com/asset-inventory/docs/asset-types
- Cloud Asset Inventory Pub/Sub feeds: https://docs.cloud.google.com/asset-inventory/docs/monitor-asset-changes
- Assured Workloads control packages: https://cloud.google.com/assured-workloads/docs/control-packages
- Assured Workloads EU Data Boundary and Support: https://docs.cloud.google.com/assured-workloads/docs/control-packages/eu-regions-support
- Assured Workloads personnel data access and support controls: https://docs.cloud.google.com/assured-workloads/docs/personnel-access-data-controls
- Google Cloud SDK: `gcloud assured workloads create`: https://docs.cloud.google.com/sdk/gcloud/reference/assured/workloads/create

## Issues Found
- The post overstated that Google Cloud regions always determine the physical location of data. Updated the wording to match Google Cloud's resource location constraint scope: it applies to supported resources, and some services require service-specific data, backup, export, and replication controls.
- The Step 4 Cloud Storage replication policy implied that `constraints/gcp.resourceLocations` was a Cloud Storage-only replication control. Clarified that the constraint prevents supported resources from being created outside allowed locations, while service-specific replication and backup settings still need to be configured.
- The custom BigQuery organization policy used an invalid condition against `resource.access.specialGroup` for datasets. Replaced it with a documented BigQuery Dataset field, `resource.location`, and changed the example to require the EU multi-region.
- The custom organization policy enforcement command referenced a missing `custom-policy-enforcement.yaml` file and incorrectly passed `--organization` to `gcloud org-policies set-policy`, which reads the target resource from the policy file name. Added the policy file content and corrected the command.
- The `gcloud resource-manager org-policies describe` example used `constraints/gcp.resourceLocations`; the documented positional value is the constraint ID such as `gcp.resourceLocations`. Updated the command.
- The Cloud Asset Inventory Pub/Sub remediation example parsed `event["data"]` directly as JSON. Cloud Functions Pub/Sub events provide base64-encoded data, so the snippet now decodes it before parsing.
- The Assured Workloads section overstated the personnel access guarantee. Updated it to describe data residency and personnel access controls based on the selected control package.
- The Assured Workloads command used an outdated enum style and an unqualified billing account placeholder. Updated the compliance regime to the documented CLI value, prefixed the billing account with `billingAccounts/`, and added `--enable-sovereign-controls=true` for the EU regions and support sovereignty example.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so CLI validation was performed against official Google Cloud SDK reference documentation rather than local `--help` output. Both Python snippets were checked with `ast.parse` for syntax.
