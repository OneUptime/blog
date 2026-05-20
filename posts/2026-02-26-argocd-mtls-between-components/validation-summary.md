# Validation Summary: How to Configure mTLS Between ArgoCD Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD internal TLS
- Kubernetes Secrets, Deployments, and StatefulSets
- cert-manager Issuers and Certificates
- OpenSSL X.509 certificate generation
- gRPC over TLS

## Sources Consulted
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD `argocd-cmd-params-cm` reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD `argocd-repo-server` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Kubernetes `kubectl create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- OpenSSL X.509 extension configuration documentation: https://docs.openssl.org/3.4/man5/x509v3_config/

## Issues Found
- The original post claimed Argo CD supports native mTLS between the API server, repo server, and application controller. Official Argo CD documentation supports strict server certificate validation for repo server connections, not client-certificate authentication between these components. I rewrote the post to describe strict TLS verification and added a note that true mTLS should be handled by a service mesh or sidecar proxy.
- The original examples generated certificates for every component with `clientAuth` and `serverAuth`. Argo CD only needs a repo server serving certificate for this supported configuration, so I reduced the certificate generation to `argocd-repo-server` with `serverAuth` and the required DNS SANs.
- The original secret names were not the names Argo CD expects. I changed the repo server secret to `argocd-repo-server-tls` and included `tls.crt`, `tls.key`, and `ca.crt`.
- The original `argocd-cmd-params-cm` keys were incorrect. I replaced `repo.server.strict.tls` with `server.repo.server.strict.tls` and `controller.repo.server.strict.tls`, matching the official ConfigMap reference.
- The original repo server arguments `--tls-cert-file`, `--tls-key-file`, and `--tls-ca-file` are not valid `argocd-repo-server` flags. I removed those examples and documented that Argo CD reads the repo server certificate from the `argocd-repo-server-tls` secret.
- The original application controller examples treated `argocd-application-controller` as a Deployment. In standard Argo CD manifests it is a StatefulSet, so rollout commands and examples now use `statefulset/argocd-application-controller`.
- The original cert-manager example created a nonstandard secret name and included `client auth`. I changed it to create `argocd-repo-server-tls` with `server auth`.
- The original verification and troubleshooting commands used client certificates to test mTLS. I replaced them with strict TLS-oriented log checks and certificate chain verification.

## Review Notes
The corrected post is technically valid for Argo CD's documented strict TLS behavior. The original title and URL still refer to mTLS, but the post now explicitly distinguishes strict TLS from true mTLS and points users to a service mesh or sidecar proxy for mutual authentication.
