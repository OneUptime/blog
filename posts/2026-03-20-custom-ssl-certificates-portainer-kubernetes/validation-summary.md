# Validation Summary: How to Set Up Custom SSL Certificates in Portainer on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer CE
- Kubernetes (Secrets, Deployment, Ingress, PersistentVolumeClaim)
- ingress-nginx
- cert-manager
- TLS / SSL (kubernetes.io/tls secret type)
- kubectl
- OpenSSL (verification)

## Sources Consulted
- Portainer source code (`api/cli/cli.go`, `api/cli/defaults.go`) for CLI flags and default ports
- Kubernetes documentation: `kubectl create secret tls` and `kubernetes.io/tls` secret type (https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets)
- Kubernetes Ingress API reference for `networking.k8s.io/v1` (https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#ingress-v1-networking-k8s-io)
- ingress-nginx annotations reference (https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/) — `backend-protocol`, `ssl-passthrough`
- cert-manager Certificate API reference for `cert-manager.io/v1` (https://cert-manager.io/docs/reference/api-docs/)

## Issues Found
No technical issues found.

All code, commands, and configuration were verified:
- `kubectl create secret tls` syntax and the resulting `tls.crt` / `tls.key` mount key names are correct.
- The `networking.k8s.io/v1` Ingress shape, `ingressClassName`, TLS block, and rules paths are correct (older `extensions/v1beta1` was removed in Kubernetes 1.22).
- ingress-nginx annotations `backend-protocol: "HTTPS"` and `ssl-passthrough: "false"` are valid; `false` is the default.
- Portainer CE default HTTPS port `9443` confirmed in source (`defaultHTTPSBindAddress = ":9443"`).
- Portainer CLI flags `--ssl`, `--sslcert`, `--sslkey` exist and function as described.
- `cert-manager.io/v1` Certificate with `secretName`, `issuerRef.name/kind`, and `dnsNames` is the current GA schema (since cert-manager v1.0).
- The OpenSSL verification command is syntactically correct.

## Review Notes
- Portainer's `--ssl` flag is marked deprecated in the upstream source code with a comment recommending `--tlsverify` instead (alongside `--tlscert` / `--tlskey`). The flag still works today and is widely used in documentation, so no change was made — but a future revision could prefer the non-deprecated equivalents. Note that `--tlsverify` semantics in some related tooling imply mutual TLS, so any swap should be tested before publishing.
- The intro states certificates can be managed at "two levels" (Ingress vs. Pod), but the post then shows three methods. This reads cleanly because Method 3 (cert-manager) is an automation layer that produces the secret consumed by either of the first two — i.e., it is not a third level. Editorial wording, not a technical error.
- `nginx.ingress.kubernetes.io/ssl-passthrough` only takes effect if the ingress-nginx controller is started with `--enable-ssl-passthrough`. Since the post sets it to `"false"` (the default), this caveat does not affect correctness here, but readers enabling passthrough in other contexts should be aware.
- Method 1 forwards to Portainer's HTTPS port (9443) with `backend-protocol: "HTTPS"`. This works but means TLS is terminated at the Ingress and re-encrypted to the pod. Forwarding to Portainer's HTTP port (9000) without `backend-protocol` would also be a valid (and slightly simpler) configuration when terminating at the Ingress.
