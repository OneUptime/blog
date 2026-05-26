# Validation Summary: How to Use Ansible to Manage GCP IAM Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Google Cloud IAM
- Google Cloud CLI (`gcloud`)
- Google Cloud Resource Manager
- IAM Conditions
- Google Cloud service accounts
- Google Cloud custom roles

## Sources Consulted
- Ansible `google.cloud` collection index: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible `google.cloud.gcp_iam_service_account` module: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_iam_service_account_module.html
- Ansible `google.cloud.gcp_iam_role` module: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_iam_role_module.html
- Google Cloud CLI `gcloud projects add-iam-policy-binding`: https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud CLI `gcloud iam roles create`: https://docs.cloud.google.com/sdk/gcloud/reference/iam/roles/create
- Google Cloud CLI `gcloud iam service-accounts add-iam-policy-binding`: https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/add-iam-policy-binding
- Google Cloud IAM service account authentication roles: https://docs.cloud.google.com/iam/docs/service-account-permissions
- Google Cloud IAM Conditions overview: https://docs.cloud.google.com/iam/docs/conditions-overview
- Google Cloud IAM resource-based access conditions: https://docs.cloud.google.com/iam/docs/configuring-resource-based-access
- Google Cloud IAM resource attributes reference: https://cloud.google.com/iam/docs/conditions-resource-attributes
- Google Cloud IAM policy history review: https://docs.cloud.google.com/iam/docs/review-iam-policy-history
- Google Cloud Resource Manager `projects.setIamPolicy`: https://cloud.google.com/resource-manager/reference/rest/v1/projects/setIamPolicy

## Issues Found
- The prerequisites said "Ansible 2.9+ with the `google.cloud` collection." The current `google.cloud` collection documentation lists support for ansible-core 2.16 or newer, so this was updated to `ansible-core 2.16+`.
- The prerequisites omitted the Google Cloud CLI even though most examples use `gcloud`. Added `gcloud` as an installed and authenticated prerequisite.
- The prerequisites listed only the Cloud Resource Manager API, but the examples also create custom roles and service accounts through IAM APIs. Updated the prerequisite to include the IAM API.
- The introduction said console changes leave no audit trail. Google Cloud records IAM policy changes in Cloud Audit Logs, so this was changed to say console changes leave no version-controlled record.
- The prerequisite referred generically to an "IAM Admin" role. Updated it to Project IAM Admin or Security Admin, matching Google Cloud's documented roles for managing project IAM access.
- The post referenced `google.cloud.gcp_resourcemanager_policy`, which is not present in the current `google.cloud` collection module index. Reworded the sentence to describe the collection's service account/custom role modules and explain why the examples use `gcloud` for project IAM bindings.
- The IAM Conditions example used only `resource.name.startsWith(...)` and claimed it restricted all instance admin access to `dev-` instances. Google Cloud's resource-based condition guidance recommends including resource type checks and handling non-instance resource types for roles with broader permission sets. Updated the condition to use `resource.type != "compute.googleapis.com/Instance" || resource.name.extract("/instances/{name}").startsWith("dev-")` and narrowed the prose to Compute Engine instances.

## Review Notes
- The `gcloud projects add-iam-policy-binding`, `remove-iam-policy-binding`, `get-iam-policy`, `gcloud iam roles create`, and `gcloud iam service-accounts add-iam-policy-binding` command forms and flags are consistent with current Google Cloud CLI documentation.
- `roles/iam.serviceAccountTokenCreator` is the correct role for service account impersonation with short-lived credentials and the `gcloud --impersonate-service-account` flow.
- The examples use `ansible.builtin.command` with `changed_when: true` in several places, so they are operational examples rather than fully idempotent playbooks. A future revision could make the change detection more precise, but this is not a syntax or API correctness issue.
