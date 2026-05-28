# Validation Summary: How to Use Attribute-Based Access Control with IAM Conditions in Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud IAM
- IAM Conditions
- Common Expression Language (CEL)
- Google Cloud CLI
- Resource Manager tags
- Access Context Manager
- Policy Troubleshooter
- Terraform Google provider

## Sources Consulted
- Google Cloud IAM Conditions overview: https://docs.cloud.google.com/iam/docs/conditions-overview
- Google Cloud IAM Conditions attribute reference: https://docs.cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud CLI `projects add-iam-policy-binding` reference: https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud CLI `storage buckets add-iam-policy-binding` reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- Google Cloud CLI `resource-manager tags keys create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/tags/keys/create
- Google Cloud CLI `resource-manager tags values create` reference: https://cloud.google.com/sdk/gcloud/reference/resource-manager/tags/values/create
- Google Cloud CLI `access-context-manager levels create` reference: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- Google Cloud Policy Troubleshooter documentation: https://docs.cloud.google.com/policy-intelligence/docs/troubleshoot-access
- Terraform Google provider `google_project_iam_member` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam

## Issues Found
- The `gcloud projects add-iam-policy-binding` and `gcloud storage buckets add-iam-policy-binding` examples used unsupported `--condition-title`, `--condition-description`, and `--condition-expression` flags. Replaced them with the documented `--condition` flag syntax, including alternate delimiters where expressions contain commas.
- The temporary access examples used the basic `roles/viewer` role with an IAM condition. Basic roles do not support conditions, so the examples now use `roles/logging.viewer`.
- The resource-name condition used `resource.name.contains()`, which is not supported for IAM Conditions. Replaced it with a `resource.type` guard and a supported `resource.name.startsWith()` check for a specific Compute Engine zone.
- The tag value creation commands used an invalid parent format. Updated them to use the documented namespaced tag key format, `ORG_ID/environment`.
- The access level example used BigQuery and `request.auth.accessLevels`. Access level conditions are supported for IAP resources and the documented attribute is `request.auth.access_levels`, so the example now uses `roles/iap.httpsResourceAccessor` and the correct attribute name.
- The Cloud Storage API attribute example used `storage.googleapis.com/objectListPrefix` in a conditional role binding, which Google documents as supported only for Credential Access Boundaries and warns can fail unexpectedly in conditional role bindings. Replaced it with the documented IAM API attribute `iam.googleapis.com/modifiedGrantsByRole`.
- The Policy Troubleshooter command used an outdated command shape and flags. Updated it to the documented `gcloud policy-intelligence troubleshoot-policy iam RESOURCE --principal-email=... --permission=...` form.
- The time-zone wording said EST while using `America/New_York`, which observes daylight saving time. Updated the wording to Eastern Time.

## Review Notes
The local environment does not have `gcloud` installed, so CLI verification was performed against the current official Google Cloud CLI reference documentation rather than local `--help` output.
