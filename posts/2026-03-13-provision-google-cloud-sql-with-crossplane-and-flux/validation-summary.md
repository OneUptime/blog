# Validation Summary: How to Provision Google Cloud SQL with Crossplane and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (Upbound family providers for GCP)
- `provider-gcp-sql` (`sql.gcp.upbound.io/v1beta1`)
- `provider-gcp-servicenetworking` (`servicenetworking.gcp.upbound.io/v1beta1`)
- `provider-gcp-compute` (`compute.gcp.upbound.io/v1beta1`)
- Google Cloud SQL (PostgreSQL)
- GCP VPC peering / Private Service Access
- Flux CD (Kustomization controller `kustomize.toolkit.fluxcd.io/v1`)
- Kubernetes Secrets / kubectl

## Sources Consulted
- Crossplane Managed Resources spec — https://docs.crossplane.io/latest/concepts/managed-resources/
- Upbound provider-gcp-sql `DatabaseInstance` reference — https://marketplace.upbound.io/providers/upbound/provider-gcp-sql/latest/resources/sql.gcp.upbound.io/DatabaseInstance/v1beta1
- Upbound provider-gcp-sql `Database` / `User` references — https://marketplace.upbound.io/providers/upbound/provider-gcp-sql
- Upbound provider-gcp-servicenetworking `Connection` reference — https://marketplace.upbound.io/providers/upbound/provider-gcp-servicenetworking/latest/resources/servicenetworking.gcp.upbound.io/Connection/v1beta1
- Upbound provider-gcp-compute `GlobalAddress` reference — https://marketplace.upbound.io/providers/upbound/provider-gcp-compute/latest/resources/compute.gcp.upbound.io/GlobalAddress/v1beta1
- Terraform Google provider `google_sql_database_instance` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Google Cloud SQL — Configure private IP — https://cloud.google.com/sql/docs/postgres/configure-private-ip
- Google Cloud SQL — Private services access — https://cloud.google.com/vpc/docs/configure-private-services-access
- Google Cloud SQL — Database flags (PostgreSQL) — https://cloud.google.com/sql/docs/postgres/flags
- Google Cloud SQL — Query insights — https://cloud.google.com/sql/docs/postgres/using-query-insights
- Google Cloud SQL — IAM database authentication — https://cloud.google.com/sql/docs/postgres/iam-authentication
- Flux Kustomization API — https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- **`writeConnectionSecretsToRef` → `writeConnectionSecretToRef` (Step 2)**: The Crossplane managed-resource spec field is singular (`writeConnectionSecretToRef`). The post used the plural form, which is not a valid field and would be silently ignored / fail validation. Fixed by changing the key to the singular form. Verified against the Crossplane managed-resource documentation and the convention used across all other Crossplane posts in this blog.

## Review Notes
- `requireSsl: true` on `ipConfiguration` is still supported by the underlying Terraform `google_sql_database_instance` resource and the Upbound provider, but it has been deprecated by Google in favor of `sslMode` (values such as `ENCRYPTED_ONLY`, `TRUSTED_CLIENT_CERTIFICATE_REQUIRED`). The post's usage still works today; a future update could migrate to `sslMode` for forward compatibility.
- The `tier: db-custom-2-7680` value is a correctly formatted Cloud SQL custom machine type (`db-custom-<vCPUs>-<MemMiB>`): 2 vCPUs and 7680 MiB (≈7.5 GB). Valid.
- Maintenance window `day: 1` correctly maps to Monday per Cloud SQL's ISO-8601 day-of-week numbering (1=Mon … 7=Sun), and `updateTrack: stable` is a valid value alongside `canary`/`week5`.
- `GlobalAddress` with `purpose: VPC_PEERING`, `addressType: INTERNAL`, `prefixLength: 16` matches Google's recommended configuration for the Cloud SQL private-services-access peering range.
- `cloudsql.iam_authentication = on` is the correct database flag to enable IAM database authentication on Cloud SQL for PostgreSQL.
- The verification command `kubectl get secret production-postgres-connection -o jsonpath='{.data.privateIpAddress}'` assumes the Upbound `DatabaseInstance` writes `privateIpAddress` to its connection secret. The set of keys written to the connection secret can vary by provider version; if the command returns empty, an equivalent and more reliable source is `kubectl get databaseinstance.sql.gcp.upbound.io production-postgres -o jsonpath='{.status.atProvider.privateIpAddress}'`. Left as written since behavior is plausible and version-dependent.
- The `Database` resource sets `charset: UTF8` and `collation: en_US.UTF8`. These are valid PostgreSQL encoding/locale identifiers as accepted by Cloud SQL.
- The Flux `Kustomization` uses `prune: false` for databases, which is the correct conservative default to prevent accidental data loss from Git-side resource removal.
