# Validation Summary: How to Use Ansible to Manage Cloud Identity and Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- AWS IAM
- Azure Active Directory / Microsoft Entra ID
- Azure RBAC
- Google Cloud IAM
- AWS CLI
- Google Cloud CLI

## Sources Consulted
- Ansible amazon.aws.iam_user module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_user_module.html
- Ansible amazon.aws.iam_group module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_group_module.html
- Ansible amazon.aws.iam_policy module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_policy_module.html
- Ansible amazon.aws.iam_user_info module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_user_info_module.html
- Ansible amazon.aws.iam_access_key_info module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_access_key_info_module.html
- Ansible amazon.aws.iam_access_key module: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/iam_access_key_module.html
- Ansible azure.azcollection.azure_rm_adapplication module: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_adapplication_module.html
- Ansible azure.azcollection.azure_rm_adserviceprincipal module: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_adserviceprincipal_module.html
- Ansible azure.azcollection.azure_rm_roleassignment module: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_roleassignment_module.html
- Ansible google.cloud.gcp_iam_service_account module: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_iam_service_account_module.html
- Google.Cloud Ansible collection index: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- AWS CLI list-attached-user-policies command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/list-attached-user-policies.html

## Issues Found
- The AWS IAM user example said it created programmatic access, but it only created IAM users and attached managed policies. Changed the wording to match the actual playbook.
- The AWS managed policy attachment task looped over `iam_users` but referenced `item.0.name` and `item.0.managed_policies`, which only work with tuple-like loop items. Changed those references to `item.name` and `item.managed_policies`.
- The Azure RBAC example used only the Contributor role GUID for `role_definition_id`. The module documentation examples use the full role definition resource ID, so the snippet now builds the full `/subscriptions/.../providers/Microsoft.Authorization/roleDefinitions/...` ID.
- The AWS audit example expected `amazon.aws.iam_user_info` results to include `attached_policies`, but that module returns IAM user facts without attached managed policy data. Added an AWS CLI `list-attached-user-policies` task and updated the warning check to inspect `AttachedPolicies[].PolicyArn`.
- The access key section described rotation, but the task only deletes old keys. Updated the wording and code comment to say it deletes old keys.
- The access key info result field was referenced as `access_keys`, but the current module return value is `access_key`. Updated the `subelements` loop accordingly.

## Review Notes
The GCP role binding example uses `gcloud` rather than an Ansible module because the current `google.cloud` collection includes service account and role modules but does not expose a project IAM binding module in the documented collection index. The command is valid, but a future improvement would be to make the task more idempotent by checking the existing IAM policy before adding the binding.
