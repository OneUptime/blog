# Validation Summary: How to Simulate Attack Paths and Identify Toxic Combinations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Security Command Center
- Attack path simulation
- Resource value configurations
- Toxic combination findings
- gcloud CLI
- Security Command Center API v2
- Python Security Command Center client library
- Pub/Sub notifications
- BigQuery
- jq

## Sources Consulted
- Google Cloud Security Command Center attack exposure and high-value resource documentation: https://cloud.google.com/security-command-center/docs/attack-exposure-learn
- Google Cloud Security Command Center resource value configuration REST API: https://cloud.google.com/security-command-center/docs/reference/rest/v2/organizations.resourceValueConfigs
- Google Cloud Security Command Center batchCreate resource value configuration API: https://cloud.google.com/security-command-center/docs/reference/rest/v2/organizations.resourceValueConfigs/batchCreate
- Google Cloud Security Command Center CreateResourceValueConfigRequest API: https://cloud.google.com/security-command-center/docs/reference/rest/v2/CreateResourceValueConfigRequest
- Google Cloud Security Command Center finding classes documentation: https://cloud.google.com/security-command-center/docs/finding-classes
- Google Cloud Security Command Center toxic combinations overview: https://cloud.google.com/security-command-center/docs/toxic-combinations-overview
- Google Cloud Python Security Command Center v2 Finding type reference: https://cloud.google.com/python/docs/reference/securitycenter/latest/google.cloud.securitycenter_v2.types.Finding
- Google Cloud Security Command Center v2 ToxicCombination type reference: https://cloud.google.com/php/docs/reference/cloud-security-center/latest/V2.ToxicCombination
- gcloud scc findings list reference: https://cloud.google.com/sdk/gcloud/reference/scc/findings/list
- gcloud scc notifications create reference: https://cloud.google.com/sdk/gcloud/reference/scc/notifications/create
- Google Cloud Security Command Center notification filtering documentation: https://cloud.google.com/security-command-center/docs/how-to-api-filter-notifications

## Issues Found
- The post used `gcloud scc resource-value-configs create`, but current gcloud documentation does not expose that command. Replaced those examples with documented Security Command Center API v2 `resourceValueConfigs:batchCreate` requests.
- The tag example used a key-value `--tag-filter`, but SCC resource value configs expect Google Cloud tag value IDs in `tagValues`. Updated examples to use `tagValues/1234567890`.
- The Terraform resource `google_scc_management_organization_resource_value_config` could not be verified in the official Google provider documentation. Replaced the Terraform block with a documented API request for multiple resource value configs.
- The resource value section stated that SCC supports only HIGH, MEDIUM, and LOW. Clarified that these are the priority levels for high-value resources and that the API enum also supports NONE for ignoring matching resources.
- The findings example sorted server-side by `attackExposure.score`, used `SECURITY_HEALTH_ANALYTICS` as a source ID, and omitted an explicit SCC v2 location. Updated it to list findings across sources with `--location=global` and sort client-side with `jq`, using the nested `finding` output shape.
- The Python toxic-combination script used a wildcard location, filtered on `category="TOXIC_COMBINATION"`, and used nonexistent or incorrect fields such as `finding.display_name`, `finding.connections`, and `finding.attack_exposure.score`. Updated it to use the `global` location, filter active findings, select `FindingClass.TOXIC_COMBINATION` in code, sort by `finding.toxic_combination.attack_exposure_score`, and print `toxic_combination.related_findings`.
- The BigQuery export wrote a JSON array but loaded it as newline-delimited JSON. Updated the pipeline to emit NDJSON with `jq -c`.
- The SQL example treated `resourceName` as JSON. Updated it to extract the project ID from the resource name string with `REGEXP_EXTRACT`.
- The notification example filtered directly on toxic-combination category and attack exposure score. Updated it to create a supported active-finding notification and filter toxic combinations plus score thresholds in subscriber code.

## Review Notes
The conceptual discussion of high-value resources, attack exposure scores, and toxic combination findings is consistent with Google Cloud's documentation. Some examples still require an SCC Enterprise environment, appropriate IAM permissions, existing Pub/Sub and BigQuery resources, and `jq` installed locally.
