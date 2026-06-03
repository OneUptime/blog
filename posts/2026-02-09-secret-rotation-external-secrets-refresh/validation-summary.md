# Validation Summary: How to Use Secret Rotation with External Secrets Operator Refresh Intervals

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, Secrets, and Ingress
- External Secrets Operator
- Stakater Reloader
- HashiCorp Vault KV and database secrets engines
- Prometheus alert rules
- Helm and kubectl

## Sources Consulted
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator metrics documentation: https://external-secrets.io/v0.14.4/api/metrics/
- External Secrets Operator Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator VaultDynamicSecret generator documentation: https://external-secrets.io/latest/api/generator/vault/
- Stakater Reloader documentation: https://docs.stakater.com/reloader/main/index.html
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/latest/reference/annotations.html
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault PostgreSQL database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- Updated ExternalSecret examples from `external-secrets.io/v1beta1` to the current `external-secrets.io/v1` API used by current ESO documentation.
- Moved TLS Secret type configuration from `target.type` to `target.template.type`, which is the valid ExternalSecret target template field for the generated Kubernetes Secret type.
- Corrected the static database credential rotation example so it no longer claims a Vault KV overwrite keeps old credentials valid. The post now states that old credentials must remain valid until rollout completion and shows a new database user value.
- Replaced the dynamic Vault database credential ExternalSecret example with the `VaultDynamicSecret` generator pattern. Current ESO Vault provider documentation states the standard Vault provider supports KV only and other Vault secrets engines should use the Vault generator.
- Reworded the dynamic credential explanation to avoid guaranteeing validity without accounting for failed refreshes or workloads still using revoked credentials.
- Replaced the nonexistent `externalsecret_sync_last_success_time` Prometheus metric with an alert using the documented `externalsecret_status_condition` metric.
- Updated the test script to trigger ESO's documented manual refresh annotation and wait for the ExternalSecret Ready condition instead of sleeping for a hard-coded interval that may be shorter than the configured refresh interval.
- Changed the Reloader verification in the test script to use `kubectl rollout status`, which more directly checks that the deployment rollout completed.

## Review Notes
The remaining examples are intentionally illustrative and assume that referenced SecretStores, Vault auth roles, service accounts, database users, and external API keys already exist. The post correctly notes that applications using environment variables need restart/reload behavior to pick up updated Kubernetes Secret values.
