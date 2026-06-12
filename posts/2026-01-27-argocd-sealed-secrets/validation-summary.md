# Validation Summary: How to Handle ArgoCD Secrets with Sealed Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Argo CD
- Bitnami Sealed Secrets
- kubeseal CLI
- Helm
- Kustomize
- GitOps secret management

## Sources Consulted
- Bitnami Sealed Secrets README: https://github.com/bitnami-labs/sealed-secrets
- Bitnami Sealed Secrets Helm chart values: https://github.com/bitnami-labs/sealed-secrets/blob/main/helm/sealed-secrets/values.yaml
- Bitnami Sealed Secrets releases: https://github.com/bitnami-labs/sealed-secrets/releases
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- Updated Sealed Secrets examples from v0.24.0 to v0.37.0, the current upstream release as of the review date. The previous version-specific examples were outdated.
- Corrected the architecture diagram so the Kubernetes cluster is shown as the place where Argo CD applies the SealedSecret and the controller watches resources, rather than implying Kubernetes itself decrypts the secret.
- Changed "key rotation" wording to "key renewal and rotation" where needed. Official Sealed Secrets documentation distinguishes automatic sealing key renewal from rotating the actual user secret values.
- Removed the incorrect implication that Helm `secretName` enables automatic key generation and that `resources` controls the number of old keys retained. `secretName` names an existing TLS secret, `resources` configures controller CPU/memory, and old sealing keys are not garbage collected automatically.
- Replaced the manual relabeling command for compromised keys with the documented early key renewal flow using `keycutofftime`. Relabeling active keys as compromised can remove them from the controller key registry after restart and break decryption of existing SealedSecrets.
- Replaced the custom re-encryption script that read decrypted Kubernetes Secrets from the cluster with `kubeseal --re-encrypt`, the supported re-encryption command that does not expose plaintext locally.
- Changed the Helm upgrade command in the key renewal section to use `helm upgrade --install`, matching the surrounding "install or upgrade" description.
- Updated the best-practices summary to recommend both sealing key renewal and rotation of actual secret values.

## Review Notes
The remaining examples are structurally correct for a tutorial. The Kustomize patch and Argo CD sync wave snippets are illustrative and assume the referenced base Deployment and namespaces exist. Sealed Secrets old keys remain available unless manually removed, so teams should back up renewed keys and rotate underlying credentials as a separate operational practice.
