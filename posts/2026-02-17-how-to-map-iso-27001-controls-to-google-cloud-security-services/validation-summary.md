# Validation Summary: How to Map ISO 27001 Controls to Google Cloud Security Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ISO/IEC 27001:2022 Annex A controls
- Google Cloud Security Command Center
- Google Cloud Organization Policy
- Access Context Manager and VPC Service Controls
- Google Cloud IAM and IAM Conditions
- Config Connector
- Sensitive Data Protection API
- Cloud Audit Logs and Cloud Logging
- Cloud Monitoring alerting policies
- Cloud KMS and CMEK organization policies
- Binary Authorization and Artifact Analysis
- Terraform for Cloud Scheduler and Cloud Functions
- BigQuery SQL

## Sources Consulted
- Google Cloud SDK reference: Security Command Center service enablement: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/scc/settings/services/enable
- Google Cloud Security Command Center overview and detection services: https://docs.cloud.google.com/security-command-center/docs/security-command-center-overview and https://cloud.google.com/security-command-center/docs/concepts-security-sources
- Google Cloud Resource Manager organization policy constraints: https://docs.cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud SDK reference: organization policy commands: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/enable-enforce and https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Cloud Storage public access prevention: https://docs.cloud.google.com/storage/docs/public-access-prevention
- Access Context Manager access level attributes and service perimeter commands: https://docs.cloud.google.com/access-context-manager/docs/access-level-attributes and https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/create
- Google Cloud IAM Conditions and IAM policy binding command: https://cloud.google.com/iam/docs/conditions-attribute-reference and https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Config Connector ComputeFirewall reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/compute/computefirewall
- Sensitive Data Protection inspect template REST API: https://cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/projects.locations.inspectTemplates/create
- Cloud Logging sinks and log-based alerting policy docs: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create and https://cloud.google.com/logging/docs/alerting/log-based-alerts
- Cloud Monitoring dashboard and alert policy command references: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create and https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Binary Authorization policy export documentation: https://cloud.google.com/binary-authorization/docs/update-policies
- Google Cloud shared responsibility and shared fate guidance: https://docs.cloud.google.com/architecture/framework/security/shared-responsibility-shared-fate
- ISO/IEC 27001:2022 control structure references, including ISO/JTC material and BSI transition guidance: https://committee.iso.org/files/live/sites/jtc1sc27/files/resources/ISO-IECJTC1-SC27_N22394_SC%2027%20Journal%20Volume%202%2C%20Issue%202%20-%20Special%20issue%20on%20ISO-IEC%2027002.pdf and https://www.bsigroup.com/globalassets/localfiles/en-my/ISO%2027001/resources/iso-iec-27001-2022-whats-changed-en-my.pdf

## Issues Found
- Security Command Center enablement used `gcloud scc settings services enable` with uppercase service names and implied that the command activates Premium. Changed the examples to the official alpha command and documented that the appropriate SCC tier must already be activated.
- The public access organization policy example used `compute.restrictPublicIp`, which is not a valid boolean organization policy constraint. Replaced it with the valid Cloud Storage public access prevention constraint `storage.publicAccessPrevention`.
- The IAM Conditions example used the basic role `roles/owner`, but conditional bindings cannot be added to basic roles with `gcloud projects add-iam-policy-binding`. Changed the example to `roles/compute.admin`.
- The Config Connector `ComputeFirewall` manifest used invalid fields for Config Connector (`projectRef`, `network`, and `denied`). Replaced them with the project annotation, `networkRef`, and `deny`.
- The DLP inspection template example used a `gcloud dlp inspect-templates create --inspect-config` command shape that is not supported by the official current reference. Replaced it with the documented Sensitive Data Protection REST `inspectTemplates.create` call.
- The Cloud Monitoring alert policy example used invalid flags (`--condition-threshold-value` and `--condition-threshold-duration`) and depended on an undefined custom log-based metric. Replaced it with a documented log-based alert policy file using `conditionMatchedLog`.
- The physical controls description overstated Google's responsibility. Updated it to reflect Google Cloud's shared responsibility/shared fate model.

## Review Notes
The post is now technically valid as a practical mapping guide, but many examples still require environment-specific prerequisites such as enabled APIs, required IAM roles, existing access policies, notification channels, BigQuery datasets, and SCC exports. The Terraform evidence-export snippet is illustrative and references a Cloud Function resource that would need to be defined elsewhere.
