# Validation Summary: Debug Kubernetes Service Account Token Mount Failures After Cluster Upgrade

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes projected volumes
- TokenRequest API
- Bound service account tokens
- Kubernetes Secrets
- RBAC
- kubectl
- client-go
- Python JWT payload decoding

## Sources Consulted
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Managing Service Accounts documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes Projected Volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Configure Service Accounts for Pods documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes Accessing the Kubernetes API from a Pod documentation: https://kubernetes.io/docs/tasks/run-application/access-api-from-pod/
- client-go rest package documentation: https://pkg.go.dev/k8s.io/client-go/rest

## Issues Found
- The post stated that BoundServiceAccountTokenVolume became stable in Kubernetes 1.21. Kubernetes documents the bound service account token volume mechanism as stable in Kubernetes v1.22, so the version was corrected.
- The JWT payload inspection command used plain `base64 -d`, which is not reliable for JWT base64url payloads without padding. It was replaced with a Python base64url decoder that adds required padding.
- The manual token curl example described checking token validity against a namespaced resource, which could fail because of RBAC even when the token is valid. It now checks API authentication against the API discovery endpoint and notes that RBAC may still reject specific resources.
- The Kubernetes API server troubleshooting commands used `kube-apiserver-*` as if `kubectl` expanded pod-name wildcards. They were replaced with label-selector based `kubectl get pods` and `kubectl logs` commands for kubeadm-style static pods.
- The API server token audience example hardcoded `kubernetes.default.svc`, but the API server audience is cluster-configured and Kubernetes defaults the projected token audience to the API server identifier when omitted. The example now omits the audience for the Kubernetes API token.
- The Go client example imported `clientcmd` without using it and used `metav1.ListOptions{}` without importing `k8s.io/apimachinery/pkg/apis/meta/v1`. The unused import was removed and the missing import was added.

## Review Notes
The remaining examples are illustrative and assume typical kubeadm labels and a `kube-root-ca.crt` ConfigMap in the namespace, both of which are common but cluster-dependent. The post correctly discourages long-lived service account token Secrets and recommends projected tokens or client libraries that reread rotated credentials.
