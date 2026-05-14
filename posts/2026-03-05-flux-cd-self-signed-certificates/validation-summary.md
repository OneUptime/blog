# Validation Summary: How to Set Up Flux CD with Self-Signed Certificates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux source-controller
- Kubernetes Secrets
- GitRepository, HelmRepository, OCIRepository, and HelmRelease custom resources
- TLS, custom CAs, and mutual TLS
- kubectl
- OpenSSL
- Kustomize patches

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `flux create secret git` documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/

## Issues Found
- GitRepository examples used `spec.certSecretRef`, but the current Flux `source.toolkit.fluxcd.io/v1` GitRepository API does not define that field. For HTTPS Git repositories, Flux reads `ca.crt`, `caFile`, and optional mTLS keys from the Secret referenced by `spec.secretRef`. Updated the GitRepository CA and mTLS examples to use `secretRef` only.
- The summary claimed `certSecretRef` is available on GitRepository, HelmRepository, and OCIRepository. Updated it to state that GitRepository uses `secretRef`, while HelmRepository and OCIRepository use `certSecretRef`.
- The controller-level CA section said the patch mounted the CA into all Flux controllers, but the provided Kustomize patch only targets `source-controller`. Updated the wording to refer specifically to the source-controller pod.
- The initial OpenSSL example implied `s_client | openssl x509` downloads the CA certificate from the server. That pipeline captures the first presented certificate, usually the server leaf certificate, so the section now tells readers to obtain the CA certificate from the internal CA source and use `s_client` only to inspect or extract the served chain. Added `-servername` to the `s_client` examples for SNI-aware endpoints.

## Review Notes
- The HelmRepository and OCIRepository `certSecretRef` examples match the current Flux source API and documented secret key names.
- Flux documentation notes that `HelmRepository` with `type: oci` is in maintenance mode and recommends `OCIRepository` for improved OCI Helm chart support. The post's example is still valid, but a future update could prefer `OCIRepository` with HelmRelease `chartRef`.
