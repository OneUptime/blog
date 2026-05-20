# Validation Summary: How to Configure ArgoCD to Trust Custom CA Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- TLS and X.509 certificates
- Git and Helm repositories
- OCI registries
- OIDC / SSO and Dex
- Docker images

## Sources Consulted
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Declarative Setup documentation for `argocd-tls-certs-cm`: https://argo-cd.readthedocs.io/en/release-2.0/operator-manual/declarative-setup/#repositories-using-self-signed-tls-certificates-or-are-signed-by-custom-ca
- Argo CD `argocd cert add-tls` command reference: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/commands/argocd_cert_add-tls/
- Argo CD `argocd cert list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cert_list/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_cluster_add/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD TLS configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD Microsoft/OIDC and Dex examples: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/microsoft/
- Go `crypto/x509` package documentation for `SSL_CERT_FILE` and `SSL_CERT_DIR`: https://pkg.go.dev/crypto/x509

## Issues Found
- The introduction and example ConfigMap referred to a generic container registry. Argo CD does not generally trust image pull registries for Kubernetes workloads; that trust is handled by the node/container runtime. The wording was changed to OCI registry, which matches Argo CD's repository/Helm OCI use case.
- The bulk `kubectl patch deployment` loop included `argocd-application-controller`, but the upstream Argo CD manifests install it as a StatefulSet. The example was split so Deployments and the application controller StatefulSet are patched with the correct resource kinds.
- The OIDC/SSO section showed an `argocd-cmd-params-cm` key named `dex.server.tls.certificate`, which is not present in the official command-parameters reference and would not configure trust for an external identity provider. The snippet was replaced with a pod volume mount and `SSL_CERT_DIR` example for `argocd-server`, and the Dex example was adjusted the same way.

## Review Notes
The `argocd-tls-certs-cm` and `argocd cert` guidance is accurate for repository server certificates. The Dockerfile approach is plausible for the Ubuntu-based Argo CD images around the referenced version, but future image base changes could require rechecking the package tooling and runtime user.
