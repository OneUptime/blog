# Validation Summary: How to Use Zero Trust Access to Web Applications Using BeyondCorp Enterprise

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Platform
- BeyondCorp Enterprise / Chrome Enterprise Premium
- Identity-Aware Proxy
- Access Context Manager
- Endpoint Verification
- Google Cloud CLI
- Google Cloud external HTTPS load balancing
- Python Flask

## Sources Consulted
- Google Cloud SDK: `gcloud iap web enable` - https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/enable
- Google Cloud SDK: `gcloud iap web add-iam-policy-binding` - https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- Google Cloud SDK: `gcloud iap web set-iam-policy` - https://docs.cloud.google.com/sdk/gcloud/reference/iap/web/set-iam-policy
- Google Cloud SDK: `gcloud compute backend-services create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK: `gcloud compute ssl-certificates create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/ssl-certificates/create
- Identity-Aware Proxy: Enable IAP for Compute Engine - https://cloud.google.com/iap/docs/enabling-compute-howto
- Identity-Aware Proxy: Context-aware access with IAP - https://docs.cloud.google.com/iap/docs/cloud-iap-context-aware-access-howto
- Identity-Aware Proxy: Getting the user's identity - https://docs.cloud.google.com/iap/docs/identity-howto
- Identity-Aware Proxy: Securing your app with signed headers - https://docs.cloud.google.com/iap/docs/signed-headers-howto
- Access Context Manager: Creating a basic access level - https://cloud.google.com/access-context-manager/docs/create-basic-access-level
- Access Context Manager: Access level attributes - https://docs.cloud.google.com/access-context-manager/docs/access-level-attributes
- IAM Conditions overview - https://docs.cloud.google.com/iam/docs/conditions-overview
- Chrome Enterprise Premium overview - https://cloud.google.com/beyondcorp-enterprise/docs/overview

## Issues Found
- The `gcloud iap web enable` examples omitted OAuth client ID and secret flags. The command requires OAuth credentials unless they were already configured, so the backend-service and App Engine examples now include `--oauth2-client-id` and `--oauth2-client-secret`.
- The Access Context Manager device YAML used an `accessLevel` wrapper instead of the `basic-level-spec` condition list expected by `gcloud access-context-manager levels create`. Replaced it with a valid condition file using `devicePolicy`.
- The access level names used hyphens, but Access Context Manager level names must use only letters, numbers, and underscores and begin with a letter. Updated names to `corp_device_required` and `corp_network`.
- The text described a corporate-device access level but only created a network access level. Added the matching `corp_device_required` creation command.
- The IAP `set-iam-policy` example placed `policy.json` after all flags. Moved it to the documented positional argument location after the command.
- The IAM policy JSON contained a conditional binding without specifying policy `version: 3`. Added the required version for IAM Conditions.
- Updated the conditional access-level expression to use the corrected `corp_device_required` access level name.
- The verification command comment said it checked IAP status, but `gcloud iap web get-iam-policy` returns the IAP IAM policy. Updated the comment to match the command.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against the current official Google Cloud SDK reference documentation rather than local `--help` output. The Python Flask snippet is syntactically valid, but a production app should also implement the post's stated JWT validation requirement before trusting identity headers.
