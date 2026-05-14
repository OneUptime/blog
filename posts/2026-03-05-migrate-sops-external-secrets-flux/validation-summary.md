# Validation Summary: How to Migrate from SOPS to External Secrets Operator in Flux

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux CD Kustomization and HelmRelease
- SOPS with age encryption
- External Secrets Operator
- Kubernetes Secrets
- AWS Secrets Manager
- HashiCorp Vault
- AWS CLI
- kubectl

## Sources Consulted
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease guide and API documentation: https://fluxcd.io/flux/guides/helmreleases/ and https://fluxcd.io/flux/components/helm/api/v2/
- External Secrets Operator AWS provider documentation: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator Helm chart values: https://raw.githubusercontent.com/external-secrets/external-secrets/main/deploy/charts/external-secrets/values.yaml
- External Secrets Operator GitHub releases: https://github.com/external-secrets/external-secrets/releases
- AWS CLI `secretsmanager create-secret` documentation: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- SOPS project documentation: https://github.com/getsops/sops

## Issues Found
- The ESO manifests used `external-secrets.io/v1beta1`, which is deprecated in current ESO releases. Updated the ClusterSecretStore and ExternalSecret examples to `external-secrets.io/v1`.
- The Flux HelmRelease example placed the HelmRelease in the `external-secrets` namespace while relying on Helm to create that namespace. Flux expects the HelmRelease namespace to already exist; only `spec.targetNamespace` can be created with `install.createNamespace`. Moved the HelmRelease to `flux-system` and added `targetNamespace: external-secrets`.
- The ESO chart version was pinned to the outdated `0.9.x` range. Updated it to the current major `2.x` chart range.
- The AWS JWT SecretStore referenced `external-secrets-sa`, but the install snippet did not create that service account. Added Helm values to create that named service account and include an IRSA annotation placeholder.
- The migration sequence temporarily had Flux and ESO managing the same Kubernetes Secret name. Updated the sequence so the SOPS Secret is replaced by the ExternalSecret in one Git change.
- The troubleshooting note implied ESO might use `stringData` semantics. Reworded it to focus on comparing decoded Kubernetes Secret values and configuring ESO `remoteRef.decodingStrategy` when provider values are encoded.

## Review Notes
- The examples still require provider-side setup that cannot be fully represented in the snippets, such as a real IAM role ARN for AWS IRSA and a matching Vault Kubernetes auth role.
