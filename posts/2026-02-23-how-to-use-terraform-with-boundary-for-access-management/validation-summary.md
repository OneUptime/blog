# Validation Summary: How to Use Terraform with Boundary for Access Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Boundary
- HashiCorp Vault
- AWS EC2
- AWS RDS PostgreSQL
- AWS KMS
- OIDC
- RBAC

## Sources Consulted
- HashiCorp Boundary Terraform target patterns: https://developer.hashicorp.com/boundary/docs/deploy/terraform-patterns/terraform-targets
- HashiCorp Boundary Terraform credentials and credential stores patterns: https://developer.hashicorp.com/boundary/docs/deploy/terraform-patterns/terraform-credentials-and-credential-stores
- HashiCorp Boundary credential library domain model: https://developer.hashicorp.com/boundary/docs/domain-model/credential-libraries
- HashiCorp Boundary Vault static credential documentation: https://developer.hashicorp.com/boundary/docs/credentials/static-cred-vault
- HashiCorp Boundary AWS KMS configuration: https://developer.hashicorp.com/boundary/docs/configuration/kms/awskms
- HashiCorp Boundary Terraform users and auth methods patterns: https://developer.hashicorp.com/boundary/docs/deploy/terraform-patterns/terraform-users-and-auth-methods
- Terraform Registry documentation for the HashiCorp Boundary provider and resources: https://registry.terraform.io/providers/hashicorp/boundary/latest/docs

## Issues Found
- The access model description said organizations were the top level. Boundary has a global scope that contains organizations, so the text now reflects the global-to-org-to-project hierarchy.
- The SSH target used `type = "tcp"` while also configuring `injected_application_credential_source_ids`. Official Boundary guidance shows injected application credentials on `ssh` targets, with credential injection and SSH target types limited to HCP Boundary or Boundary Enterprise. The target type is now `ssh`.
- The database target referenced `boundary_host_set_static.database.id`, but the post did not define that host set. Added a database host and static host set before the database target.
- The database Vault credential library was defined but not attached to the database target. Added `brokered_credential_source_ids` so the target uses the database credential library in the provider-supported way for a TCP target.
- The Vault SSH credential library was described as SSH certificates but used the generic Vault credential library with `credential_type = "ssh_private_key"`. Updated the wording and path to describe SSH private keys stored in Vault KV. Dynamic SSH certificates require `boundary_credential_library_vault_ssh_certificate`.
- The best-practices and conclusion text overstated credential injection as universal and implied users never see credentials in all modes. Updated the wording to distinguish credential brokering from credential injection and to note support boundaries.

## Review Notes
The infrastructure deployment snippet remains illustrative because it depends on external templates, AMIs, security groups, IAM profiles, load balancers, and variables not shown in the post. The Boundary provider examples align with the current provider documentation, but credential injection and SSH target types require HCP Boundary or Boundary Enterprise.
