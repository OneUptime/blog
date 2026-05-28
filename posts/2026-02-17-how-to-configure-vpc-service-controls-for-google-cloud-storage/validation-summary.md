# Validation Summary: How to Configure VPC Service Controls for Google Cloud Storage

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Google Cloud VPC Service Controls
- Google Cloud Storage
- Access Context Manager
- Google Cloud CLI
- Cloud Audit Logs / Cloud Logging
- Terraform Google provider

## Sources Consulted
- Google Cloud: VPC Service Controls overview: https://docs.cloud.google.com/vpc-service-controls/docs/overview
- Google Cloud: Create a service perimeter: https://docs.cloud.google.com/vpc-service-controls/docs/create-service-perimeters
- Google Cloud: Dry run mode for service perimeters: https://docs.cloud.google.com/vpc-service-controls/docs/dry-run-mode
- Google Cloud: Ingress and egress rules: https://docs.cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- Google Cloud: VPC Service Controls audit logging: https://docs.cloud.google.com/vpc-service-controls/docs/audit-logging
- Google Cloud: Troubleshoot common VPC Service Controls issues: https://docs.cloud.google.com/vpc-service-controls/docs/troubleshooting
- Google Cloud CLI: `gcloud access-context-manager policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/policies/create
- Google Cloud CLI: `gcloud access-context-manager levels create`: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- Google Cloud CLI: `gcloud access-context-manager perimeters create`: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/create
- Google Cloud CLI: `gcloud access-context-manager perimeters dry-run create`: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run/create
- Terraform Registry: `google_access_context_manager_access_level`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_access_level
- Terraform Registry: `google_access_context_manager_service_perimeter`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_service_perimeter

## Issues Found
- The dry-run perimeter command used regular enforced-mode flags (`--title`, `--resources`, `--restricted-services`, and `--access-levels`) while describing creation of a new dry-run perimeter. Updated it to use the documented dry-run perimeter flags (`--perimeter-title`, `--perimeter-type`, `--perimeter-resources`, `--perimeter-restricted-services`, and `--perimeter-access-levels`).
- The dry-run section said to test before enforcing immediately after showing an enforced perimeter creation command. Clarified that the dry-run command is the alternative to use before enforcing.
- The troubleshooting section listed incorrect or outdated violation reason names. Updated `RESOURCES_NOT_IN_SAME_SERVICE_PERIMETER` to `RESOURCE_NOT_IN_SAME_SERVICE_PERIMETER`, `ACCESS_LEVEL_VIOLATION` to `NO_MATCHING_ACCESS_LEVEL`, and `SERVICE_NOT_ALLOWED` to `SERVICE_NOT_ALLOWED_FROM_VPC`.
- The Cloud Console troubleshooting note said to include the Console's identity. Google documents Cloud Console access as requiring an access level that allows the user's IP range or user account, so the note was corrected.

## Review Notes
The access-level YAML examples are syntactically consistent with Google Cloud's Access Context Manager examples. Google recommends using ingress/egress rule identities instead of the `members` attribute in access levels for many perimeter communication scenarios, but the shown `members` examples are still supported.
