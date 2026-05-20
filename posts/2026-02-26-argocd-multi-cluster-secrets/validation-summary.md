# Validation Summary: How to Handle Secrets in Multi-Cluster ArgoCD Setup

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes Secrets and CronJobs
- External Secrets Operator
- HashiCorp Vault
- Prometheus Operator PrometheusRule

## Sources Consulted
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD declarative cluster secret documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- External Secrets Operator getting started and Helm chart documentation: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator chart index: https://charts.external-secrets.io/index.yaml
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator PushSecret API documentation: https://external-secrets.io/latest/api/pushsecret/
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/v0.19.0/provider/hashicorp-vault/
- External Secrets Operator metrics documentation: https://external-secrets.io/v0.19.2/api/metrics/
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault policy documentation: https://developer.hashicorp.com/vault/docs/concepts/policies
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The External Secrets Operator Helm chart version was outdated. Updated `targetRevision` from `0.9.12` to `2.5.0`, the current chart version in the official chart index on 2026-05-20.
- The `ExternalSecret` and `ClusterSecretStore` examples used the older `external-secrets.io/v1beta1` API. Updated them to `external-secrets.io/v1`, matching current ESO documentation.
- The `PushSecret` example implied direct cluster-to-cluster replication and omitted `spec.secretStoreRefs`. Clarified that PushSecret pushes to an external provider and added the required provider reference.
- The CronJob example depended on `jq` being present in a plain kubectl image. Reworked the command to render a minimal Secret manifest using kubectl's Go template output instead.
- The Vault policy block was labeled as YAML even though Vault policies use HCL syntax. Changed the code fence language to `hcl`.
- The Vault Kubernetes auth role commands did not match the auth mount paths and role names shown in the SecretStore examples. Updated the commands to use `auth/kubernetes-prod-eu/role/external-secrets-prod-eu` and `auth/kubernetes-prod-us/role/external-secrets-prod-us`.
- The monitoring examples used incorrect ESO metric names. Updated them to `externalsecret_status_condition` and `clustersecretstore_status_condition`.

## Review Notes
The examples are illustrative and still assume supporting infrastructure exists, such as Argo CD cluster labels, Vault auth mounts, policies, kubeconfig contexts for the CronJob, RBAC for the replicator ServiceAccount, and Prometheus labels that identify clusters.
