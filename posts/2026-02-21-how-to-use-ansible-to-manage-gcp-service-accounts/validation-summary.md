# Validation Summary: How to Use Ansible to Manage GCP Service Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- google.cloud Ansible collection
- Google Cloud IAM
- Google Cloud service accounts
- Google Cloud service account keys
- gcloud CLI
- YAML

## Sources Consulted
- Ansible google.cloud collection index: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible google.cloud.gcp_iam_service_account module: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_iam_service_account_module.html
- Ansible google.cloud.gcp_iam_service_account_key module: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_iam_service_account_key_module.html
- Google Cloud IAM create service accounts: https://cloud.google.com/iam/docs/service-accounts-create
- Google Cloud IAM service account types: https://cloud.google.com/iam/docs/service-account-types
- Google Cloud IAM create and delete service account keys: https://cloud.google.com/iam/docs/keys-create-delete
- Google Cloud IAM delete and undelete service accounts: https://cloud.google.com/iam/docs/service-accounts-delete-undelete
- gcloud iam service-accounts keys list reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/list
- gcloud iam service-accounts keys delete reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/delete
- gcloud iam service-accounts disable reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/disable
- gcloud projects add-iam-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding

## Issues Found
- The post listed Ansible 2.9+ as the prerequisite, but the current google.cloud collection documentation lists ansible-core 2.16 or newer. Updated the prerequisite.
- The prerequisite roles were incomplete for the examples that create service accounts, manage service account keys, and grant project IAM bindings. Updated the role list to include Service Account Admin, Service Account Key Admin, and Project IAM Admin.
- The install command included google-api-python-client, which is not listed as a requirement for the Ansible modules used. Removed it and kept google-auth and requests.
- The google.cloud.gcp_iam_service_account examples used a description parameter, but the current module documentation does not list that parameter. Removed the unsupported parameter and related sample data fields.
- The service account naming explanation omitted the documented 6 to 30 character length and start/end constraints. Updated the explanation.
- The service account key example manually decoded privateKeyData instead of using the module's documented path parameter. Updated the example to write the key through path and then restrict file permissions.
- The key rotation example deleted existing keys in the same run that created a new key, which contradicted the safe rotation guidance. Updated it so deletion is explicitly gated by delete_old_keys and a list of old key IDs after applications have moved to the new key.
- The deleted service account note incorrectly implied the service account name cannot be reused during the 30-day recovery period. Updated it to describe undelete behavior, permanent removal after 30 days, and the separate-identity behavior if a same-name account is recreated.
- The description claimed workload identity configuration was covered, but the post does not configure workload identity. Updated the description to match the content.
- The statement that every GCP project comes with default service accounts was too broad. Updated it to reflect that default service accounts are created automatically when certain services are enabled or used.

## Review Notes
- The examples use gcloud commands for project IAM bindings and key audit/rotation because the google.cloud collection does not provide a dedicated current project IAM binding module in its documented plugin index.
- The key-creation guidance remains technically valid, but Google Cloud now recommends Workload Identity Federation over service account keys for many external workloads.
