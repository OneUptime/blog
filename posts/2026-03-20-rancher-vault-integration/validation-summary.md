# Validation Summary: How to Set Up Vault Integration with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- HashiCorp Vault
- Helm
- kubectl
- Vault Agent Injector
- Vault Kubernetes auth method
- Vault database secrets engine
- Vault PKI secrets engine
- PostgreSQL

## Sources Consulted
- HashiCorp Vault Helm chart run guide: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/run
- HashiCorp Vault Helm chart configuration reference: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/configuration
- HashiCorp Vault Kubernetes auth method: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth API: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault Agent Injector docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- HashiCorp Vault Agent Injector installation docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/installation
- HashiCorp Vault seal/unseal concepts: https://developer.hashicorp.com/vault/docs/concepts/seal
- HashiCorp Vault status command reference: https://developer.hashicorp.com/vault/docs/commands/status
- HashiCorp Vault health API: https://developer.hashicorp.com/vault/api-docs/system/health
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- GNU Bash builtin index: https://www.gnu.org/software/bash/manual/html_node/Builtin-Index.html

## Issues Found
- The Helm values file used `server.replicas`, but the chart documents HA replica count under `server.ha.replicas`. I moved the setting into `server.ha.replicas` so the example uses the correct chart value.
- The install command used `helm install --wait`, but Vault server pods remain unready until initialization and unsealing with the chart’s default readiness behavior. I removed `--wait` so the command matches the documented install flow.
- The unseal example only unsealed `vault-0`. With Shamir seals on a multi-node Vault cluster, each node must be unsealed individually. I updated the example to unseal `vault-0`, `vault-1`, and `vault-2`.
- The Kubernetes auth backend example wrote `token_reviewer_jwt` and `kubernetes_ca_cert` from the pod filesystem. Current Vault guidance for Kubernetes 1.21+ recommends omitting those values and using Vault’s in-cluster service account files so short-lived reviewer tokens keep rotating correctly. I updated the command to the current recommended configuration.
- The policy creation command used a here-document with `kubectl exec` but omitted `-i`, so stdin would not be passed into the container. I added `-i`.
- The Kubernetes auth role used deprecated `policies` and `ttl` parameters. I replaced them with `token_policies` and `token_ttl` from the current auth API.
- The Deployment manifest in the injector example was invalid for `apps/v1` because it lacked `.spec.selector` and matching pod labels. I added both required fields.
- The container command used `/bin/sh` with `source`, which is a Bash builtin. I switched it to the POSIX `.` form so the command matches the declared shell.

## Review Notes
- The guide is technically a generic Kubernetes/Vault setup that works on Rancher-managed clusters; it is not Rancher UI-specific.
- `storageClass: standard`, the PostgreSQL hostname, and the example database credentials are environment-specific placeholders and may need adjustment for a real Rancher cluster.
- The example still disables Vault listener TLS inside the cluster. That is acceptable for a simple internal example, but production deployments should enable TLS and auto-unseal, as the conclusion already recommends.
