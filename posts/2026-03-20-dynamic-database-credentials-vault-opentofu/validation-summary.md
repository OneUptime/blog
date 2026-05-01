# Validation Summary: How to Use Dynamic Database Credentials with Vault and OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Vault
- Vault database secrets engine
- Vault audit logging
- PostgreSQL
- MySQL
- Kubernetes

## Sources Consulted
- HashiCorp Vault database secrets engine overview: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault PostgreSQL database secrets engine: https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- HashiCorp Vault MySQL/MariaDB database secrets engine: https://developer.hashicorp.com/vault/docs/secrets/databases/mysql-maria
- HashiCorp Vault audit logging: https://developer.hashicorp.com/vault/docs/audit
- HashiCorp Vault lease renew command: https://developer.hashicorp.com/vault/docs/commands/lease/renew
- HashiCorp Vault provider registry page: https://registry.terraform.io/providers/hashicorp/vault/latest
- HashiCorp Vault provider `vault_generic_secret` data source: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/generic_secret
- HashiCorp Vault provider `vault_database_secret_backend_connection` resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/database_secret_backend_connection
- HashiCorp Vault provider `vault_database_secret_backend_role` resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/database_secret_backend_role
- PostgreSQL provider registry page: https://registry.terraform.io/providers/cyrilgdn/postgresql/latest
- PostgreSQL provider docs overview: https://registry.terraform.io/providers/cyrilgdn/postgresql/1.26.0/docs
- Kubernetes provider `kubernetes_secret` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret.html

## Issues Found
- The OpenTofu example used `data "vault_database_secret_backend_dynamic_role"`, but the Vault provider documents database connection and role management as resources and does not document that data source. I removed the invalid block and kept `vault_generic_secret`, which is the documented way to read a `vault read`-compatible endpoint.
- The Vault provider version constraint was pinned to `~> 3.0`, which is outdated relative to the current provider major version. I updated it to `~> 5.0` to reflect a current supported major line.
- The OpenTofu example implied a direct Vault read was a clean way to consume dynamic credentials without warning that `vault_generic_secret` persists retrieved values in state and requests a new lease on refresh. I added an inline note so the example matches the provider’s documented behavior.
- The Kubernetes Secret example omitted the operational caveat that copying short-lived Vault credentials into a Kubernetes Secret through OpenTofu stores them in state and does not auto-renew them when the Vault lease expires. I added that note inline.
- The MySQL example used `mysql-aurora-database-plugin` with a generic MySQL host example. I changed it to `mysql-database-plugin`, which matches the generic MySQL/MariaDB documentation.
- The best-practices section said Vault audit logs “only show lease IDs, not secrets.” Vault actually records detailed request and response audit entries and HMACs most string values by default. I corrected that statement to describe the documented audit behavior accurately.
- The architecture diagram was fenced as `hcl` even though it is plain text, not valid HCL. I changed the code fence to `text`.
- The conclusion overstated the result as “zero hardcoded database secrets” in a way that ignored state persistence when OpenTofu reads the secret directly. I narrowed the wording to “without hardcoding database secrets in your configuration.”

## Review Notes
- The Vault and Terraform Registry documentation used for provider behavior is Terraform-branded, but the provider configuration syntax shown in the post is also applicable to OpenTofu.
- Even after the fixes, reading dynamic database credentials directly through the Vault provider remains best suited to short-lived infrastructure operations. For long-running application delivery, Vault Agent or an external secret distribution mechanism is a better operational fit because OpenTofu does not continuously renew leases.
