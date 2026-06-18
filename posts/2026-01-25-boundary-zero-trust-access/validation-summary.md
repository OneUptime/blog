# Validation Summary: How to Configure Boundary for Zero Trust Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Boundary
- HashiCorp Vault
- Terraform Boundary provider
- PostgreSQL
- OIDC
- SSH
- Kubernetes API access through Boundary
- AWS S3 storage buckets for session recording

## Sources Consulted
- HashiCorp Boundary self-managed deployment overview: https://developer.hashicorp.com/boundary/docs/deploy/self-managed
- HashiCorp Boundary controller configuration: https://developer.hashicorp.com/boundary/docs/deploy/self-managed/configure-controllers
- HashiCorp Boundary worker deployment: https://developer.hashicorp.com/boundary/docs/deploy/self-managed/deploy-workers
- HashiCorp Boundary system requirements: https://developer.hashicorp.com/boundary/docs/architecture/system-requirements
- HashiCorp Boundary CLI authenticate OIDC command: https://developer.hashicorp.com/boundary/docs/commands/authenticate/oidc
- HashiCorp Boundary CLI connect commands: https://developer.hashicorp.com/boundary/docs/commands/connect
- HashiCorp Boundary SSH connect helper: https://developer.hashicorp.com/boundary/docs/commands/connect/ssh
- HashiCorp Boundary Kubernetes connect helper: https://developer.hashicorp.com/boundary/docs/commands/connect/kube
- HashiCorp Boundary PostgreSQL connect helper: https://developer.hashicorp.com/boundary/docs/commands/connect/postgres
- HashiCorp Boundary target domain model: https://developer.hashicorp.com/boundary/docs/domain-model/targets
- HashiCorp Boundary Terraform target patterns: https://developer.hashicorp.com/boundary/docs/deploy/terraform-patterns/terraform-targets
- Terraform Boundary provider target resource: https://github.com/hashicorp/terraform-provider-boundary/blob/main/docs/resources/target.md
- Terraform Boundary provider Vault credential store resource: https://github.com/hashicorp/terraform-provider-boundary/blob/main/docs/resources/credential_store_vault.md
- Terraform Boundary provider Vault SSH certificate credential library resource: https://github.com/hashicorp/terraform-provider-boundary/blob/main/docs/resources/credential_library_vault_ssh_certificate.md
- Terraform Boundary provider storage bucket resource: https://github.com/hashicorp/terraform-provider-boundary/blob/main/docs/resources/storage_bucket.md
- HashiCorp Boundary managed group filters: https://developer.hashicorp.com/boundary/docs/rbac/users/managed-groups
- HashiCorp Boundary session recording storage bucket documentation: https://developer.hashicorp.com/boundary/docs/session-recording/configuration/create-storage-bucket

## Issues Found
- The post used non-official Helm chart names (`hashicorp/boundary` and `hashicorp/boundary-worker`) and Helm values that are not part of the official self-managed deployment path. Replaced these with Boundary controller and worker HCL configuration examples, official package repository installation commands, database initialization, service startup, and worker-led registration.
- The prerequisites listed Kubernetes v1.21+ and PostgreSQL 11+. Updated the deployment prerequisite to VMs or bare-metal hosts and PostgreSQL 12+ to match current Boundary requirements and official deployment guidance.
- The Linux install command used deprecated `apt-key` and `apt-add-repository` usage. Updated it to HashiCorp's signed keyring repository setup.
- The Terraform provider constraint was outdated (`~> 1.1`). Updated it to `~> 1.5`, matching the current provider generation used for the reviewed resources.
- The target examples referenced `boundary_host_set_static.postgres` and `boundary_host_set_static.kubernetes` without defining them. Added static host and host set resources for PostgreSQL and Kubernetes API targets.
- The SSH target was described as credential injection while using a TCP target with brokered credentials. Updated the wording to credential brokering and kept the TCP target type, which is the correct target type for brokered SSH credentials.
- The Vault SSH credential example used a generic Vault credential library POST body with `{{user.ssh_public_key}}`. Replaced it with the current `boundary_credential_library_vault_ssh_certificate` Terraform resource.
- The storage bucket example omitted the required worker filter. Added `worker_filter` so Boundary can select workers that can access the storage bucket.
- The OIDC managed group filter attempted to match an email domain substring against `/token/email`. Replaced it with a list-membership filter against `/userinfo/groups`, consistent with official managed group filter examples.
- The Kubernetes CLI helper example passed `kubectl` after `--`. Updated it to pass kubectl arguments (`-- get pods`) because the helper invokes the Kubernetes client itself.
- The generic TCP connection example used `boundary connect` without a helper. Updated the example to use the PostgreSQL helper with a fixed local proxy port.

## Review Notes
- Session recording, SSH targets, injected application credentials, and storage buckets are HCP Boundary or Boundary Enterprise features. The post now includes technically correct configuration, but readers should confirm their Boundary edition supports these features before implementation.
- The AEAD KMS examples are suitable as illustrative placeholders; production deployments should prefer a cloud KMS or Vault Transit, as HashiCorp recommends.
