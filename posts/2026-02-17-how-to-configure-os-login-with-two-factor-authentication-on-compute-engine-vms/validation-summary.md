# Validation Summary: How to Configure OS Login with Two-Factor Authentication on Compute Engine VMs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- OS Login
- OS Login two-factor authentication
- Google Cloud IAM
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Cloud Audit Logs
- SSH

## Sources Consulted
- Google Cloud Compute Engine: Set up OS Login: https://docs.cloud.google.com/compute/docs/oslogin/set-up-oslogin
- Google Cloud Compute Engine: About OS Login: https://docs.cloud.google.com/compute/docs/oslogin
- Google Cloud Compute Engine: Monitor OS Login audit logs: https://docs.cloud.google.com/compute/docs/oslogin/view-audit-logs
- Google Cloud SDK: `gcloud compute project-info add-metadata`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/project-info/add-metadata
- Google Cloud SDK: `gcloud compute os-login ssh-keys add`: https://cloud.google.com/sdk/gcloud/reference/compute/os-login/ssh-keys/add
- Google Cloud SDK: `gcloud compute os-login ssh-keys list`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/os-login/ssh-keys/list
- Google Cloud SDK: `gcloud compute os-login describe-profile`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/os-login/describe-profile
- Google Cloud Compute Engine: Restrict SSH keys from VMs: https://docs.cloud.google.com/compute/docs/connect/restrict-ssh-keys
- Terraform Registry: `google_compute_project_metadata`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_project_metadata

## Issues Found
- External-user IAM binding was shown at the project level. Google Cloud documentation requires `roles/compute.osLoginExternalUser` to be granted at the organization level by an organization administrator, so the command was changed to use `gcloud organizations add-iam-policy-binding ORGANIZATION_ID`.
- The role summary omitted `roles/iam.serviceAccountUser`, which is required when users connect to OS Login-enabled VMs that have an attached service account. Added a short note after the role table.
- The post said GCP pushes SSH public keys to the VM. OS Login-enabled VMs fetch keys from the OS Login service, so that step was corrected.
- The username-format explanation was too absolute. Google Cloud documents the generated format as `USERNAME_DOMAIN_SUFFIX`, with administrator customization, `ext_` and `sa_` prefixes, and truncation at 32 characters, so the explanation was updated.
- The audit log query used `google.ssh-serialport.v1.connect`, which is for serial port SSH rather than OS Login audit logs. Replaced it with an OS Login service filter and adjusted the surrounding claim to describe OS Login API activity.
- The 2FA challenge examples were adjusted to match documented OS Login 2FA challenge types, including SMS or phone call verification and security key one-time passwords.

## Review Notes
The Terraform snippet uses `google_compute_project_metadata`, which authoritatively manages all project metadata. That is valid, but in a real environment `google_compute_project_metadata_item` can be safer if other project metadata keys are managed elsewhere.
