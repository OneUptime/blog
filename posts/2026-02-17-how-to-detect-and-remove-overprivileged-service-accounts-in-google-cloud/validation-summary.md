# Validation Summary: How to Detect and Remove Overprivileged Service Accounts in Google Cloud

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud service accounts
- Google Cloud CLI (`gcloud`)
- Cloud Asset Inventory
- Policy Intelligence / Activity Analyzer
- IAM Recommender
- Cloud Logging
- Python Google Cloud client libraries

## Sources Consulted
- Google Cloud SDK: `gcloud iam service-accounts list` - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/list
- Google Cloud SDK: `gcloud iam service-accounts keys list` - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/list
- Google Cloud SDK: `gcloud iam service-accounts disable` - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/disable
- Google Cloud SDK: `gcloud projects add-iam-policy-binding` - https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud SDK: `gcloud recommender recommendations list` - https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/list
- Google Cloud SDK: `gcloud policy-intelligence query-activity` - https://cloud.google.com/sdk/gcloud/reference/policy-intelligence/query-activity
- Policy Intelligence: View recent usage for service accounts and keys - https://cloud.google.com/policy-intelligence/docs/activity-analyzer-service-account-authentication
- Cloud Asset Inventory: Search IAM allow policies - https://cloud.google.com/asset-inventory/docs/search-allow-policies
- Cloud Asset Inventory: `searchAllIamPolicies` REST reference - https://cloud.google.com/asset-inventory/docs/reference/rest/v1/TopLevel/searchAllIamPolicies
- Resource Manager: Listing all projects and folders in your hierarchy - https://cloud.google.com/resource-manager/docs/listing-all-resources
- Resource Manager API: `projects.list` - https://cloud.google.com/resource-manager/reference/rest/v3/projects/list

## Issues Found
- The project inventory script claimed organization-wide coverage but used a `parent.id` filter that only finds directly matched project parents and does not recursively traverse folders. Changed the wording and script to inventory active projects accessible to the caller.
- The Cloud Asset Inventory Python example used `memberTypes:serviceAccount`. Official examples document `memberTypes=serviceAccount`, so the query was updated to the documented exact-match syntax.
- The Python example imported `resourcemanager_v3` but did not use it. Removed the unused import to avoid implying an unnecessary dependency.
- The `gcloud policy-intelligence query-activity` examples used a non-existent `--service-account-email` flag. Replaced them with the documented `--query-filter` syntax using `activities.full_resource_name`.
- The key-usage section described checking whether service account keys are used but only listed keys. Added the documented `serviceAccountKeyLastAuthentication` query pattern for checking recent use of a specific key.

## Review Notes
The commands assume the caller has the required IAM and API permissions, such as Cloud Asset Inventory search permissions, Policy Analyzer activity analysis permissions, and Recommender access. `gcloud` was not installed in the local workspace, so CLI verification was performed against official Google Cloud SDK documentation rather than local `--help` output.
