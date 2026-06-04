# Validation Summary: How to Set Up API Aggregation Layer for Custom API Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes API aggregation layer
- Kubernetes APIService resources
- Kubernetes RBAC
- Kubernetes extension API servers
- apiserver-builder-alpha
- Go
- Docker
- OpenSSL and TLS certificates

## Sources Consulted
- Kubernetes API Aggregation Layer: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/
- Kubernetes Configure the Aggregation Layer: https://kubernetes.io/docs/tasks/extend-kubernetes/configure-aggregation-layer/
- Kubernetes Set up an Extension API Server: https://kubernetes.io/docs/tasks/extend-kubernetes/setup-extension-api-server/
- Kubernetes APIService v1 reference: https://kubernetes.io/docs/reference/kubernetes-api/apiregistration/api-service-v1/
- Kubernetes kube-apiserver flag reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- apiserver-builder-alpha README and tools guide: https://github.com/kubernetes-sigs/apiserver-builder-alpha
- Go crypto/x509 package documentation: https://pkg.go.dev/crypto/x509
- Kubernetes apiserver REST package documentation: https://pkg.go.dev/k8s.io/apiserver/pkg/registry/rest

## Issues Found
- The apiserver-builder install command used `@latest`, but the upstream apiserver-builder-alpha README documents `v1.23.0` as the latest release. Changed the command to pin `@v1.23.0`.
- The deployment mounted `tls.crt` and `tls.key` but passed only `--cert-dir`. The kube-apiserver flag documentation states `--tls-cert-file` and `--tls-private-key-file` are the explicit serving certificate flags. Updated the deployment args to use the mounted secret files directly.
- The deployment example did not include the delegated authentication RBAC that Kubernetes documents for extension API servers. Added a `system:auth-delegator` `ClusterRoleBinding` and an `extension-apiserver-authentication-reader` `RoleBinding`.
- The OpenSSL certificate commands created a certificate with only a Common Name. Modern Go x509 verification ignores the legacy Common Name for hostname validation, so the serving certificate could fail TLS verification. Added DNS Subject Alternative Names for the Kubernetes service names.
- The custom storage Go snippet referenced `metav1.CreateOptions` and `metav1.GetOptions` without importing `metav1`. Added the missing import.
- The best-practices section referred to conversion webhooks for aggregated API server versioning. Conversion webhooks are a CRD mechanism; for an aggregated API server, version conversion is implemented in the API server. Reworded this to "explicit conversion logic."

## Review Notes
The tutorial remains a high-level example. A production deployment should use generated manifests from apiserver-builder where possible, provision a reachable dedicated etcd instance, rotate serving certificates, and verify the generated API server/controller-manager layout for the exact apiserver-builder release in use.
