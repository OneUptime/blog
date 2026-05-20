# Validation Summary: How to Use SOPS Config Management Plugin with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Config Management Plugins
- SOPS
- Kubernetes Secrets
- AWS KMS and EKS IRSA
- GCP KMS and Google Application Default Credentials
- Azure Key Vault
- age keys
- Kustomize

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- SOPS official documentation: https://getsops.io/docs/
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- AWS KMS permissions reference: https://docs.aws.amazon.com/kms/latest/developerguide/kms-api-permissions-reference.html
- Google Application Default Credentials documentation: https://cloud.google.com/docs/authentication/application-default-credentials
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Azure Key Vault key permissions documentation: https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys-details

## Issues Found
- The post called SOPS "Mozilla SOPS." SOPS was originally launched at Mozilla but is now maintained under the getsops project and is a CNCF Sandbox project. Updated the reference to "SOPS."
- The sequence diagram said KMS returns a "decryption key." SOPS uses KMS to decrypt the encrypted data key stored in the SOPS metadata. Updated the diagram wording to "Request data key decryption" and "Return decrypted data key."
- The AWS IRSA example placed the `eks.amazonaws.com/role-arn` annotation on the Deployment pod template. IRSA requires annotating the Kubernetes ServiceAccount. Added a ServiceAccount snippet and kept the Deployment using `serviceAccountName: argocd-repo-server`.
- The Argo CD Application example referenced `sops-decrypt`, but the CMP declares `spec.version: v1.0`. Argo CD requires explicit plugin references to use `<metadata.name>-<spec.version>` when a version is set. Updated the Application to use `sops-decrypt-v1.0`.
- The Kustomize chaining example used shell parameter expansion that would convert `foo.enc.yaml` to `foo.yaml.yml`. Replaced it with a `case` statement for `.enc.yaml` and `.enc.yml`.
- The Kustomize chaining section did not state that the plugin sidecar image must include `kustomize`. Added a short note because sidecar CMPs must have access to the tools they execute.
- The security section claimed decrypted secrets only exist in memory and are never written to disk. That is true for the basic stdout-only plugin but not for the later `init` example, which writes decrypted files before running Kustomize. Updated the wording to distinguish those cases.

## Review Notes
The examples are intentionally minimal snippets rather than complete Argo CD repo-server patches. In a production guide, it would be useful to show the full repo-server volume definitions and cloud-provider-specific workload identity examples, but the corrected snippets are technically valid for the concepts they demonstrate.
