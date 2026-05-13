# Validation Summary: How to Configure Flux TLS Secret with Client Certificate and Key

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Kubernetes Secrets
- GitRepository
- HelmRepository
- OCIRepository
- Bucket
- kubectl
- OpenSSL
- curl
- TLS / mutual TLS

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI `flux create secret tls`: https://fluxcd.io/flux/cmd/flux_create_secret_tls/
- Kubernetes `kubectl create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- OpenSSL command documentation: https://docs.openssl.org/
- curl TLS options documentation: https://curl.se/docs/manpage.html

## Issues Found
- The combined basic-auth and mTLS example created a Secret named `secure-git-full-auth`, but the HelmRepository example referenced `secure-helm-auth`, which was not defined in the post. Changed the shared Secret name to `secure-source-full-auth` and updated the GitRepository and HelmRepository references to use that same Secret.
- The conclusion stated that Bucket uses `certSecretRef` without mentioning Flux's provider limitation. Updated the statement to specify that Bucket TLS `certSecretRef` applies when using the generic provider, matching the Flux Source API and Bucket documentation.

## Review Notes
The core Flux field guidance is correct: GitRepository uses `secretRef` for HTTPS mTLS material, while HelmRepository and OCIRepository use `certSecretRef`; Bucket also uses `certSecretRef` for the generic provider. The documented `tls.crt`, `tls.key`, and `ca.crt` key names are current, and the Kubernetes Secret examples are valid with either `Opaque` or `kubernetes.io/tls` where shown. The local environment did not have `kubectl` or `flux` installed, so CLI syntax was checked against official generated command references rather than local `--help` output.
