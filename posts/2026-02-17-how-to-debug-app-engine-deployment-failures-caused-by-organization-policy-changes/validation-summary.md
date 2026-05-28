# Validation Summary: Debug App Engine Deployment Failures Caused by Organization Policy Changes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google App Engine Standard Environment
- Google App Engine Flexible Environment
- Google Cloud Organization Policy
- Google Cloud CLI (`gcloud`)
- Cloud Build
- Cloud Logging and Cloud Monitoring
- Policy Intelligence and Policy Simulator
- Identity and Access Management service accounts

## Sources Consulted
- Google Cloud CLI reference: `gcloud resource-manager org-policies list`, `describe`, `allow`, and `set-policy`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies
- Google Cloud CLI reference: `gcloud app versions list`: https://docs.cloud.google.com/sdk/gcloud/reference/app/versions/list
- Google Cloud CLI reference: `gcloud builds list` and `gcloud builds log`: https://docs.cloud.google.com/sdk/gcloud/reference/builds
- Google Cloud CLI reference: `gcloud logging read`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- Google Cloud organization policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Restricting resource locations: https://docs.cloud.google.com/resource-manager/docs/organization-policy/defining-locations
- Restricting identities by domain: https://docs.cloud.google.com/resource-manager/docs/organization-policy/restricting-domains
- App Engine locations: https://cloud.google.com/appengine/docs/standard/locations
- App Engine Flexible Environment internal-only services and Cloud NAT requirements: https://docs.cloud.google.com/appengine/docs/flexible/disable-external-ip
- App Engine service accounts: https://docs.cloud.google.com/appengine/docs/standard/configure-service-accounts
- IAM service account creation: https://docs.cloud.google.com/iam/docs/service-accounts-create
- Policy Simulator for organization policy: https://docs.cloud.google.com/policy-intelligence/docs/test-organization-policies
- Google Cloud CLI reference: `gcloud policy-intelligence simulate orgpolicy`: https://docs.cloud.google.com/sdk/gcloud/reference/policy-intelligence/simulate/orgpolicy
- Log-based alerting policies: https://cloud.google.com/logging/docs/alerting/log-based-alerts
- Google Cloud CLI reference: `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The Cloud NAT section incorrectly implied that App Engine Flexible Environment generally uses Cloud NAT for outbound traffic. Updated it to say Flex uses ephemeral external IP addresses by default, and Cloud NAT is required for outbound internet access when internal-only services are configured without external IP addresses.
- The policy simulation example used IAM Policy Troubleshooter, which checks IAM allow and deny policies, not organization policy constraints. Replaced it with an organization policy simulator example using `gcloud policy-intelligence simulate orgpolicy` and a policy YAML file.
- The service account workaround attempted to create the App Engine default service account with `gcloud iam service-accounts create`, which creates `SERVICE_ACCOUNT_NAME@PROJECT_ID.iam.gserviceaccount.com` user-managed service accounts, not `PROJECT_ID@appspot.gserviceaccount.com`. Replaced it with a user-managed service account creation and deployment example using `gcloud app deploy --service-account`.
- The log alert command used `--condition-filter`, which creates a metric threshold or absence condition, not a log-matching alert. Replaced it with a log-based alert policy JSON using `conditionMatchedLog` and `gcloud alpha monitoring policies create --policy-from-file`.

## Review Notes
Most commands and constraints were current and aligned with official Google Cloud CLI and Resource Manager documentation. The post uses the older `gcloud resource-manager org-policies` command group, which is still documented; Google also documents the newer `gcloud org-policies` command group for v2-style policy files.
