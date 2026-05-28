# Validation Summary: How to Implement Step-Up Authentication for Sensitive GCP Operations

## Status
validated

## Post Type
Tutorial / Security implementation guide

## Technologies Covered
- Google Cloud IAM Conditions
- Access Context Manager access levels
- Identity-Aware Proxy reauthentication
- Google Workspace / Cloud Identity session controls
- Cloud Functions / Cloud Run functions with Python
- Firestore
- Cloud Logging sinks
- Organization Policy constraints
- BeyondCorp / Context-Aware Access device policies

## Sources Consulted
- Google Cloud authentication reauthentication documentation: https://cloud.google.com/docs/authentication/reauthentication
- Access Context Manager custom access level specification: https://cloud.google.com/access-context-manager/docs/custom-access-level-spec
- `gcloud access-context-manager levels create` reference: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- IAM Conditions overview: https://cloud.google.com/iam/docs/conditions-overview
- IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- IAP reauthentication documentation: https://cloud.google.com/iap/docs/configuring-reauth
- `gcloud iap settings set` reference: https://cloud.google.com/sdk/gcloud/reference/iap/settings/set
- `gcloud iap web add-iam-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- Organization Policy domain restriction documentation: https://cloud.google.com/resource-manager/docs/organization-policy/restricting-domains
- `gcloud resource-manager org-policies set-policy` reference: https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Cloud Logging query language and sink documentation: https://cloud.google.com/logging/docs/view/logging-query-language and https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Run functions / Cloud Functions Python Pub/Sub CloudEvent sample: https://cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub

## Issues Found
- The post said Google Cloud had no built-in step-up capability. Updated this to mention built-in reauthentication for some sensitive Console actions, while clarifying that custom workflows still need IAP, Access Context Manager, IAM Conditions, or custom logic.
- The custom access level YAML used an invalid `custom.expr` structure and unsupported `auth_time` / `amr` claims. Replaced it with the documented `expression` format and the supported `request.auth.claims.crd_str.hwk` credential-strength claim.
- The IAM binding example tried to attach an access-level condition to `roles/owner`, a legacy basic role. IAM Conditions cannot be used with basic roles, and `request.auth.access_levels` is only appropriate for IAP access permissions. Replaced the example with an IAP web binding for `roles/iap.httpsResourceAccessor`.
- The session-duration example used a Google Groups membership command, which changes membership roles and expiration, not Google Cloud session length. Replaced it with documented IAP reauthentication settings and a `gcloud iap settings set` command.
- The billing IAM example reused `request.auth.access_levels` for `roles/billing.admin`, which is not a supported use of the access-level attribute. Removed it in favor of the IAP reauthentication example.
- The Cloud Functions example compared Firestore timestamp values with naive UTC datetimes and read JSON through `request.json`. Updated it to use timezone-aware `datetime.now(timezone.utc)` and `request.get_json(silent=True)`.
- The organization policy section claimed the policy required MFA. Domain restricted sharing does not enforce MFA; it restricts which identities can be granted IAM roles. Updated the explanation, command comment, constraint name, and allowed value format.
- The basic access level YAML for device policy used an invalid top-level `conditions:` wrapper for `--basic-level-spec`, and OS minimum versions did not consistently use the documented `major.minor.patch` format. Replaced it with the expected list format.
- Removed unused imports from Python snippets and adjusted the Cloud Logging filter to use documented Logging query language substring matching with `OR`.

## Review Notes
- The custom Cloud Functions proxy remains illustrative. The helper functions `get_user_email_from_token`, `validate_mfa_with_idp`, and `send_slack_alert` are intentionally left as integration points for the reader's IdP and alerting system.
- `gcloud` was not installed in the local environment, so CLI validation was performed against official Google Cloud SDK reference documentation instead of local `--help` output.
