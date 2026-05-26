# Validation Summary: How to Use Ansible to Manage GCP Secret Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- `google.cloud` Ansible collection
- Google Cloud Secret Manager
- Google Cloud CLI
- Google Cloud IAM and audit logging
- Ansible password lookup and `no_log`

## Sources Consulted
- Ansible `google.cloud.gcp_secret_manager` module documentation: https://docs.ansible.com/projects/ansible/12/collections/google/cloud/gcp_secret_manager_module.html
- Ansible `google.cloud.gcp_secret_manager` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_secret_manager_lookup.html
- Ansible `ansible.builtin.password` lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/password_lookup.html
- Google Cloud `gcloud services enable` reference: https://cloud.google.com/sdk/gcloud/reference/services/enable
- Google Cloud Secret Manager access secret version documentation: https://cloud.google.com/secret-manager/docs/access-secret-version
- Google Cloud Secret Manager create secret documentation: https://cloud.google.com/secret-manager/docs/creating-and-accessing-secrets
- Google Cloud Secret Manager rotation schedules documentation: https://cloud.google.com/secret-manager/docs/secret-rotation
- Google Cloud Secret Manager audit logging documentation: https://cloud.google.com/secret-manager/docs/audit-logging
- Google Cloud Secret Manager access control documentation: https://cloud.google.com/secret-manager/docs/access-control
- Google Cloud Secret Manager destroy secret version documentation: https://cloud.google.com/secret-manager/docs/destroy-secret-version

## Issues Found
- The post used non-existent `google.cloud.gcp_secret_manager_secret`, `google.cloud.gcp_secret_manager_secret_version`, and `google.cloud.gcp_secret_manager_secret_version_access` module names. Replaced the examples with the supported `google.cloud.gcp_secret_manager` module and its documented parameters.
- The create examples separated secret resource creation from version creation using unsupported Ansible modules. Updated them to use `name`, `value`, `labels`, and `state: present`, which is how the documented Ansible module creates secrets and adds new versions.
- Retrieval examples decoded `payload.data` with `b64decode`, but the documented Ansible module returns the decrypted value in `value`. Updated examples to use `secret_data.value`.
- The VM deployment example decoded `item.payload.data`, which does not match the documented module return values. Updated it to build the dictionary from `item.value`.
- The rotation example fetched a secret resource with an unsupported module before adding a new version. Removed the unsupported lookup step and used `google.cloud.gcp_secret_manager` with a new `value`, which adds a new version when the value differs.
- The cleanup example attempted to disable versions with an unsupported module and `state: disabled`. The documented Ansible module supports removing versions with `state: absent`, so the section was corrected to describe deleting old versions.
- The post described Secret Manager as having automatic rotation support. Google Cloud Secret Manager provides rotation schedules and Pub/Sub notifications; external automation performs the actual rotation. Updated the wording to reflect that behavior.
- Added `no_log: true` to the single-secret creation task because it handles a plaintext secret value.
- Removed replication parameters from the Ansible module examples because the documented module notes that replication settings are managed outside Ansible.

## Review Notes
- The local environment did not have `ansible`, `ansible-galaxy`, or `gcloud` installed, so validation was performed against official documentation rather than local command execution.
- The post remains a valid tutorial, but future improvements could show a `gcloud secrets create --replication-policy=automatic` step when users need explicit replication configuration.
