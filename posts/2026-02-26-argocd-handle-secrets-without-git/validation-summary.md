# Validation Summary: How to Handle Secrets Without Committing Them to Git

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Secrets
- Bitnami Sealed Secrets
- External Secrets Operator
- HashiCorp Vault
- Argo CD Vault Plugin
- SOPS
- age and GPG
- AWS Secrets Manager
- EKS IRSA and EKS Pod Identity
- Helm

## Sources Consulted
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- External Secrets Operator AWS access documentation: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/config-management-plugins/
- Argo CD Vault Plugin "How it Works" documentation: https://argocd-vault-plugin.readthedocs.io/en/v1.12.0/howitworks/
- Argo CD Vault Plugin backend documentation: https://argocd-vault-plugin.readthedocs.io/en/stable/backends/
- SOPS documentation: https://github.com/age-sops/sops
- AWS Secrets Manager on Amazon EKS documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/integrate_eks.html
- Archived Kubernetes External Secrets repository: https://github.com/external-secrets/kubernetes-external-secrets

## Issues Found
- The Sealed Secrets Helm install command used the chart defaults, but the official docs note that `kubeseal` expects the controller name `sealed-secrets-controller` by default. Added `--set-string fullnameOverride=sealed-secrets-controller` to make the following `kubeseal` command work as written.
- The External Secrets Operator examples used the older `external-secrets.io/v1beta1` API. Updated the `SecretStore` and `ExternalSecret` manifests to the current `external-secrets.io/v1` API.
- The options table included Kubernetes External Secrets, which is archived and deprecated and was not covered later in the post. Removed that row.
- The SOPS section claimed Argo CD has native SOPS support. Argo CD's native tools are Helm, Jsonnet, and Kustomize; SOPS decryption requires a plugin or related integration. Updated the text to reference repo-server plugins such as KSOPS or Helm secrets.
- The AVP section said Argo CD replaces placeholders during sync and that AVP works with any Vault backend. Updated the wording to say AVP performs replacement during manifest generation and narrowed Vault support to KV v1/v2 plus other supported secret managers.
- The AVP pros overstated support for Vault's full feature set, including dynamic secrets. Updated it to the supported Vault-backed KV and audit/versioning framing.
- The cloud-native AWS example used an `aws-secretsmanager://...` environment value that is not a Kubernetes or AWS standard by itself. Changed the example to pass a secret identifier and clarified that application code must use the cloud provider SDK to read the secret at runtime.

## Review Notes
The post is technically relevant and remains a practical comparison guide after the corrections. Future improvements could add version-specific caveats for ESO API upgrades and more explicit setup steps for each Argo CD repo-server plugin, but those additions were outside the scope of a correction-only review.
