# Validation Summary: How to Use flux create secret proxy for Proxy Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux source-controller
- Kubernetes Secrets
- GitRepository
- OCIRepository
- HelmRepository
- Kustomize patches
- HTTP/HTTPS and SOCKS5 proxy configuration
- SOPS

## Sources Consulted
- Flux CLI documentation for `flux create secret proxy`: https://fluxcd.io/flux/cmd/flux_create_secret_proxy/
- Flux v2.4 GA release notes: https://fluxcd.io/blog/2024/09/flux-v2.4.0/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization patches documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The prerequisites said Flux CLI v2.0 or later was sufficient. The `flux create secret proxy` command was added in Flux v2.4, so the prerequisite was changed to Flux CLI v2.4 or later.
- The introduction and diagram implied proxy secrets apply to HelmRepository resources. Official Flux HelmRepository documentation does not define `spec.proxySecretRef`, while GitRepository, OCIRepository, Bucket, and other specific APIs do. The wording and diagram were corrected to refer to supported Flux APIs.
- The HelmRepository example used an unsupported `spec.proxySecretRef` field. It was replaced with a note explaining that HTTP/S HelmRepository traffic should use source-controller proxy environment variables, and OCI-hosted Helm charts can use OCIRepository with `proxySecretRef`.
- The credential update example reconciled a HelmRepository after updating a proxy secret. Because the post's supported per-source proxy examples are GitRepository and OCIRepository, the Helm reconcile command was changed to `flux reconcile source oci app-artifacts`.
- The best-practice recommendation for `proxySecretRef` was clarified to say "where supported" because not every Flux source type supports this field.

## Review Notes
- The local environment did not have the `flux` binary installed, so CLI verification was performed against official Flux CLI documentation and Flux release notes.
- The proxy secret keys `address`, `username`, and `password`, the `--address`, `--username`, `--password`, and `--export` flags, and the GitRepository/OCIRepository `proxySecretRef` examples match current Flux documentation.
- Per-object proxy secrets do not provide a `NO_PROXY` key in the documented format. The post correctly covers proxy exceptions through controller-level environment variables.
