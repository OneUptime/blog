# Validation Summary: How to Manage Secrets with ArgoCD and External Secrets Operator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- External Secrets Operator
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Secret Manager
- Helm

## Sources Consulted
- External Secrets Operator Getting Started: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator ClusterSecretStore API: https://external-secrets.io/latest/api/clustersecretstore/
- External Secrets Operator AWS Access provider docs: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator Azure Key Vault provider docs: https://external-secrets.io/latest/provider/azure-key-vault/
- External Secrets Operator Google Cloud Secret Manager provider docs: https://external-secrets.io/latest/provider/google-secrets-manager/
- External Secrets Operator HashiCorp Vault provider docs: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator Find Secrets guide: https://external-secrets.io/latest/guides/getallsecrets/
- External Secrets Operator Helm chart index: https://charts.external-secrets.io/index.yaml
- Argo CD Resource Health docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Diffing Customization docs: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD Sync Phases and Waves docs: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The ESO Helm chart version was outdated (`0.10.0`). Updated it to `2.5.0`, the latest chart version in the official chart index on 2026-05-20.
- The ESO manifests used `external-secrets.io/v1beta1`. Updated them to `external-secrets.io/v1` because current ESO examples use `v1` and the current chart marks `v1beta1` serving as deprecated/backward-compatibility only.
- The AWS section said "SecretStore" while the YAML created a `ClusterSecretStore`. Updated the text to match the manifest.
- The Deployment example omitted required `apps/v1` fields and a container image. Added a selector, matching pod template labels, and an image placeholder so the manifest is structurally valid.
- The sync wave explanation implied sync waves alone guarantee the secret is fetched before the Deployment starts. Clarified that the custom health check lets ArgoCD wait for ESO readiness.
- The Argo CD diff section implied a Secret generated only by ESO would be OutOfSync simply because it was not in Git. Adjusted the wording to the accurate case: a Secret that is also declared in Git can drift when ESO updates its data, and scoped the ignore rule to the specific Secret.
- The conclusion described `refreshInterval` as automatic rotation. Changed it to automatic synchronization of rotated secret values.

## Review Notes
The static AWS credential example is syntactically valid, but production EKS deployments should prefer IRSA or another workload identity mechanism over long-lived access keys, as the post already notes.
