# Validation Summary: How to Configure Flux TLS Secret with Custom CA Bundle

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller
- Kubernetes Secrets
- GitRepository, HelmRepository, OCIRepository, and Bucket source APIs
- kubectl
- OpenSSL
- TLS certificate authority bundles

## Sources Consulted
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux CLI documentation: https://fluxcd.io/flux/cmd/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The OpenSSL example described `openssl s_client -showcerts` as extracting the CA certificate from the server. That command prints the certificate chain presented by the server, which can include the leaf certificate and may not include the root CA. I changed the wording and output filename to describe it as chain inspection, then directed readers to save the root CA and required intermediates into `ca-bundle.crt`.

## Review Notes
- The Flux API fields are current: `GitRepository` uses `secretRef` for HTTPS CA data via `ca.crt`, while `HelmRepository`, `OCIRepository`, and generic-provider `Bucket` sources support `certSecretRef` with `ca.crt`.
- The `kubectl create secret generic` commands use valid `--from-file` and `--from-literal` forms.
- The Flux CLI verification commands are consistent with the documented `flux get sources git` and `flux reconcile source git` commands. Local verification with installed binaries was not possible because `flux` and `kubectl` are not installed in this environment.
