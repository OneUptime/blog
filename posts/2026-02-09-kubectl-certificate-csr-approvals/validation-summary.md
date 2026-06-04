# Validation Summary: How to Use kubectl certificate Commands to Manage CSR Approvals

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CertificateSigningRequest API
- kubectl certificate approve and deny commands
- Kubernetes built-in certificate signers
- OpenSSL CSR generation
- jq JSON filtering
- Kubernetes RBAC
- Kubernetes CronJob

## Sources Consulted
- Kubernetes Certificate Signing Requests documentation: https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/
- Kubernetes CertificateSigningRequest v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/certificates/certificate-signing-request-v1/
- Kubernetes kubectl certificate approve reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_certificate/kubectl_certificate_approve/
- Kubernetes generated kubectl command reference for certificate deny: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The sample `kubectl get csr` output used `kubernetes.io/kube-apiserver`, which is not a valid built-in CSR signer name. Changed it to `kubernetes.io/kube-apiserver-client`.
- The sample node CSR used `kubernetes.io/kubelet-serving` as an auto-issued node certificate example. Kubernetes documentation states kubelet serving CSRs are never auto-approved by kube-controller-manager. Changed the example and automation section to use `kubernetes.io/kube-apiserver-client-kubelet`, which can be auto-approved.
- The approval section said the cluster CA signs the certificate immediately after approval. Changed this to state that a signing controller can issue the certificate after approval, because issuance depends on the configured signer/controller.
- The denial example used a nonexistent `kubectl certificate deny --reason` flag. Replaced it with a separate annotation example followed by `kubectl certificate deny`.
- The denied CSR listing used an unsupported status condition field selector. Replaced it with a `kubectl get csr -o json` and `jq` filter.
- The troubleshooting signer list included `kubernetes.io/legacy-unknown`, which cannot be set with the stable `certificates.k8s.io/v1` API. Replaced it with `kubernetes.io/kube-apiserver-client-kubelet`.
- The cleanup `jq` filters iterated directly over `.status.conditions[]`, which can fail for pending CSRs without conditions. Updated them to use optional condition iteration.
- The multiple-approval example used multiple positional names even though the official generated usage documents a single `NAME`. Replaced it with a shell loop over individual `kubectl certificate approve` calls.
- The controller-manager log example used a hard-coded pod name. Replaced it with a label selector that is more generally applicable for kube-controller-manager pods.

## Review Notes
The post now matches the current stable `certificates.k8s.io/v1` CSR API and generated `kubectl certificate` references. The `spec.expirationSeconds` examples are valid for Kubernetes v1.22 and later; older API servers silently drop that field.
