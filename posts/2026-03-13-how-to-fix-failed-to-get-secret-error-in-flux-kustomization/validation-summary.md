# Validation Summary: How to Fix failed to get secret Error in Flux Kustomization

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux Kustomization and kustomize-controller
- Kubernetes Secrets
- Kubernetes RBAC
- kubectl
- Flux CLI
- SOPS and Sealed Secrets

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux reconcile kustomization CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- Clarified namespace behavior for Flux Kustomization Secret references. The post described the issue as occurring in the target namespace, but Flux Kustomization Secret references such as decryption, kubeConfig, and post-build substitution references are namespace-scoped to the Kustomization resource. Updated the wording to say the Secret should be in the Kustomization namespace.
- Corrected the Secret copy command. The original `kubectl get secret -o yaml | sed ... | kubectl apply -f -` example can preserve server-managed metadata such as `uid`, `resourceVersion`, and `managedFields`. Updated it to use JSON and `jq` to remove server-managed fields before applying the Secret in the correct namespace.

## Review Notes
The Flux and kubectl commands otherwise matched the official CLI documentation. The Git credentials example uses placeholder credentials; in production, a real token should be handled through the user's normal secret-management process rather than committed in plain text.
