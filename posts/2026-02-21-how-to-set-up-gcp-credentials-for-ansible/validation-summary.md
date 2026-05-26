# Validation Summary: How to Set Up GCP Credentials for Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Core
- `google.cloud` Ansible collection
- Google Cloud IAM service accounts
- Google Cloud CLI (`gcloud`)
- Application Default Credentials
- Ansible Vault

## Sources Consulted
- Ansible `google.cloud` collection index: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible `google.cloud.gcp_compute_instance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_module.html
- Ansible `google.cloud.gcp_compute_instance_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_info_module.html
- Ansible `google.cloud.gcp_compute_network_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_network_info_module.html
- Google Cloud IAM service account creation documentation: https://docs.cloud.google.com/iam/docs/service-accounts-create
- Google Cloud SDK `gcloud iam service-accounts create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK `gcloud iam service-accounts keys create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud Application Default Credentials documentation: https://cloud.google.com/docs/authentication/application-default-credentials
- Google Cloud SDK `gcloud auth application-default login` reference: https://docs.cloud.google.com/sdk/gcloud/reference/auth/application-default/login

## Issues Found
- The post said the current setup supported Ansible 2.9+ with `google.cloud`. The current official `google.cloud` collection documentation lists Ansible Core 2.16+ support, so the prerequisite was updated.
- The install command included `google-api-python-client` as a required Python dependency, but the checked `google.cloud` module documentation lists `google-auth` and `requests` for these modules. The install command was corrected.
- The post described Workload Identity Federation as a covered Ansible authentication method, but the article did not provide a working WIF setup and the checked module `auth_kind` choices do not include a dedicated WIF mode. The WIF references were removed from the description and diagram.
- The examples used `google.cloud.gcp_compute_zone_info`, which is not listed in the current `google.cloud` collection index. Those examples now use documented `google.cloud.gcp_compute_network_info` or `google.cloud.gcp_compute_instance_info` modules.
- The examples used `google.cloud.gcp_storage_bucket_info`, which is not listed in the current `google.cloud` collection index. The ADC and verification examples now use documented Compute Engine info modules.
- The environment-variable example said credential parameters did not need to be passed to each module but then passed them explicitly with `lookup('env', ...)`. The example now relies on documented `GCP_AUTH_KIND` and `GCP_SERVICE_ACCOUNT_FILE` environment fallback behavior.
- The production guidance recommended service account JSON keys too strongly. Google Cloud documentation notes service account keys are sensitive and not recommended where keyless options are available, so the wording now prefers attached service accounts and frames JSON keys as a fallback that should be vaulted and rotated.

## Review Notes
The `gcloud` service account creation, IAM policy binding, service account key creation, ADC login, `auth_kind: application`, `auth_kind: machineaccount`, `service_account_file`, and `service_account_contents` examples were consistent with the official documentation reviewed. The local environment does not have Ansible installed, so module behavior was verified against official documentation rather than local `ansible-doc` output.
