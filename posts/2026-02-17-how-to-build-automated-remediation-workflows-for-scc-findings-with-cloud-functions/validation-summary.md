# Validation Summary: How to Build Automated Remediation Workflows for SCC Findings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Security Command Center
- Security Command Center finding notifications
- Pub/Sub
- Cloud Run functions / Cloud Functions Gen 2
- Python
- Google Cloud Python client libraries
- Cloud Storage IAM and public access prevention
- Compute Engine firewall rules
- Terraform Google provider
- Google Cloud IAM

## Sources Consulted
- Google Cloud Security Command Center: Creating and managing NotificationConfigs: https://docs.cloud.google.com/security-command-center/docs/how-to-api-manage-notifications
- Google Cloud Security Command Center: Filtering notifications: https://docs.cloud.google.com/security-command-center/docs/how-to-api-filter-notifications
- Google Cloud Security Command Center: Vulnerability findings: https://cloud.google.com/security-command-center/docs/concepts-vulnerabilities-findings
- Google Cloud Security Command Center: Remediating Security Health Analytics findings: https://docs.cloud.google.com/security-command-center/docs/how-to-remediate-security-health-analytics-findings
- Google Cloud Functions / Cloud Run functions: Cloud Pub/Sub 2nd Gen Python sample: https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- Google Cloud Functions: Deploy a function: https://cloud.google.com/functions/docs/deploy
- Google Cloud SDK: gcloud functions deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Storage: Use public access prevention: https://docs.cloud.google.com/storage/docs/using-public-access-prevention
- Google Cloud Storage Python client: IAMConfiguration reference: https://cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.bucket.IAMConfiguration
- Google Cloud Compute Python client: FirewallsClient reference: https://docs.cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.firewalls.FirewallsClient

## Issues Found
- The Terraform example used the legacy `google_scc_notification_config` resource and omitted the SCC notification `location`. Updated it to `google_scc_v2_organization_notification_config` with `location = "global"`, matching current Google Cloud SCC Terraform examples.
- The SCC notification filter did not group the high/critical severity condition, which could make `HIGH` findings match without the intended active-state constraint. Added parentheses around the severity expression.
- The Terraform snippet manually granted `roles/pubsub.publisher` to the SCC notification service account. Current SCC documentation says the notification service account is created and granted `securitycenter.notificationServiceAgent` on the Pub/Sub topic when the notification config is created. Removed the manual publisher binding and added a note explaining the automatic grant.
- The Cloud Function deployment used `--gen2`, but the Python handler used the first-generation `(event, context)` signature. Updated the handler to use `@functions_framework.cloud_event` and decode Pub/Sub data from `cloud_event.data["message"]["data"]`.
- The Python examples referenced functions and helpers across files without importing them. Added the missing imports so the examples are internally consistent.
- `OPEN_RDP_PORT` was present in the remediation map but no `remediate_open_rdp` handler was defined. Added a handler that delegates to the firewall-disabling remediation.
- The bucket remediation comment incorrectly described public access prevention as a uniform bucket-level access override. Corrected the comment to describe public access prevention for ACL-based public access.
- The notification helper used `logger` without defining it and hard-coded `"your-project"` as the Pub/Sub project. Added logging setup, reads the project from `GOOGLE_CLOUD_PROJECT`, and waits for the publish future to complete.
- The deployment section omitted required Python package dependencies. Added a `requirements.txt` snippet with the Functions Framework and Google Cloud client libraries used by the examples.
- The service account Terraform did not grant the remediation function permission to publish its outbound notification messages. Added a `security-notifications` Pub/Sub topic and a topic IAM binding for `roles/pubsub.publisher`.

## Review Notes
- The corrected Python snippets compile syntactically.
- The remediation examples are intentionally broad and should still be treated as examples. Production use should add allowlists, dry-run enforcement, idempotency checks, and more granular IAM scopes where the target resource set is known.
