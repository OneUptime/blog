# Validation Summary: How to Restrict GCP Resource Access by Geographic Region Using Access Levels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Access Context Manager
- VPC Service Controls
- Identity-Aware Proxy
- IAM Conditions
- Google Cloud CLI
- Terraform Google provider
- YAML

## Sources Consulted
- Google Cloud Access Context Manager: Create an access policy: https://docs.cloud.google.com/access-context-manager/docs/create-access-policy
- Google Cloud Access Context Manager: Create a basic access level: https://cloud.google.com/access-context-manager/docs/create-basic-access-level
- Google Cloud Access Context Manager: Access level attributes: https://docs.cloud.google.com/access-context-manager/docs/access-level-attributes
- Google Cloud SDK: `gcloud access-context-manager levels create`: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- Google Cloud SDK: `gcloud access-context-manager perimeters create`: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/create
- Google Cloud SDK: `gcloud access-context-manager perimeters dry-run create`: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run/create
- Google Cloud IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- Terraform Google provider: `google_access_context_manager_access_level`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_access_level

## Issues Found
- Access level names used hyphens (`geo-restricted-na`), but Access Context Manager access level short names must begin with a letter and contain only letters, numbers, and underscores. Changed examples to `geo_restricted_us_ca`.
- Service perimeter names used hyphens (`geo-perimeter`, `geo-perimeter-test`), but service perimeter short names must also use only letters, numbers, and underscores after the first letter. Changed examples to `geo_perimeter` and `geo_perimeter_test`.
- The post said each organization gets one access policy. Updated this to clarify that each organization can have one organization-level access policy, while VPC Service Controls supports scoped policies for folders and projects.
- The post described a US-and-Canada access level as "North America Only." Changed wording and titles to "US and Canada Only" because Mexico and other North American regions were not included.
- The OR-logic YAML example omitted the required `--combine-function=OR`; otherwise multiple condition blocks default to AND. Added the correct `gcloud` command.
- The IAM Condition expression for IAP treated the access level resource name as an unquoted CEL token. Added quotes around the access level full name and updated the condition title to use underscores.
- The troubleshooting section did not mention the documented limitation that geographic conditions require geolocatable public IP addresses and deny private IP requests. Added that caveat.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK reference documentation instead of local `--help` output.
