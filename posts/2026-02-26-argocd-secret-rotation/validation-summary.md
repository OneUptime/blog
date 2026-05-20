# Validation Summary: How to Handle Secret Rotation with ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- External Secrets Operator
- HashiCorp Vault
- Kubernetes Secrets
- Stakater Reloader
- Bitnami Sealed Secrets
- Prometheus Operator PrometheusRule
- PostgreSQL
- Helm

## Sources Consulted
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator HashiCorp Vault provider: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator VaultDynamicSecret generator: https://external-secrets.io/latest/api/generator/vault/
- External Secrets Operator metrics: https://external-secrets.io/v0.14.4/api/metrics/
- HashiCorp Vault database secrets engine: https://developer.hashicorp.com/vault/docs/secrets/databases
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Stakater Reloader documentation: https://docs.stakater.com/reloader/main/index.html
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/1.4/reference/annotations.html
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- Argo CD diffing customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-options/

## Issues Found
- Updated External Secrets Operator manifests from `external-secrets.io/v1beta1` to the current documented `external-secrets.io/v1` API.
- Corrected Vault KV v2 `remoteRef.key` examples from API-style `secret/data/...` paths to paths relative to the configured Vault mount, such as `production/db` and `production/app`.
- Replaced the direct `dataFrom.extract` example for Vault database dynamic credentials with the documented `VaultDynamicSecret` generator pattern.
- Updated the Reloader Helm installation example to include `helm repo update` and `--create-namespace`, matching the official install flow.
- Corrected the Reloader annotation comment: `reloader.stakater.com/auto` watches referenced Secrets and ConfigMaps, not one hard-coded Secret.
- Replaced the Sealed Secrets forced key rotation command with the documented early key renewal mechanism using `SEALED_SECRETS_KEY_CUTOFF_TIME`.
- Corrected the PostgreSQL dual-credential example. PostgreSQL roles do not accept two active passwords on one role, so the example now uses a second application role during the transition.
- Replaced the nonexistent `externalsecret_status_sync_time` metric with `externalsecret_sync_calls_total`, which is documented by External Secrets Operator.
- Replaced the Argo CD `ignoreDifferences` example for Secret `/data` with an ignore rule for the Reloader-managed pod-template annotation, which is the drift source introduced by Reloader when using annotation-based restarts.

## Review Notes
The examples are now aligned with current upstream documentation. In a production version of the PostgreSQL rotation script, add stricter SQL identifier quoting, connection draining checks, and dependency cleanup before dropping the old role.
