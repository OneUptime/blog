# Validation Summary: How to Configure Flux Helm Secret with TLS Client Certificate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Source Controller
- Flux HelmRepository and HelmRelease APIs
- Kubernetes Secrets
- kubectl
- OpenSSL
- curl
- cert-manager
- Mutual TLS (mTLS)

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Source API reference v1: https://v2-6.docs.fluxcd.io/flux/components/source/api/v1/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `flux get sources helm`: https://fluxcd.io/flux/cmd/flux_get_sources_helm/
- Flux CLI `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI `flux reconcile source helm`: https://fluxcd.io/flux/cmd/flux_reconcile_source_helm/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- cert-manager Certificate documentation: https://cert-manager.io/v1.14-docs/usage/certificate/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- OpenSSL `x509` documentation: https://docs.openssl.org/3.0/man1/openssl-x509/
- OpenSSL X.509 v3 extension documentation: https://docs.openssl.org/4.0/man5/x509v3_config/

## Issues Found
- The prerequisites stated "Kubernetes cluster (v1.20 or later)", which is not accurate for current Flux v2 releases. Changed it to require a Kubernetes version supported by the selected Flux release.
- The client certificate generation example did not include X.509 client authentication usage. Added a small extension file and passed it with `openssl x509 -extfile` so the test certificate is explicitly valid for TLS client authentication.
- The Secret creation text said to create a `kubernetes.io/tls` Secret, but the shown `kubectl create secret generic` command creates an `Opaque` Secret. Updated the wording to match the command. Flux accepts either `Opaque` or `kubernetes.io/tls` for `certSecretRef`.
- The troubleshooting section said wrong Secret key names would fail silently. Flux documentation indicates missing or mismatched TLS keys prevent the TLS material from being used correctly and can produce errors, so the wording was softened to avoid an inaccurate claim.
- The cert-manager `Certificate` example requested only `client auth`. Because cert-manager does not add default usages when any usages are specified, added `digital signature` and `key encipherment` alongside `client auth`.

## Review Notes
The Flux API fields and examples using `spec.certSecretRef`, `spec.secretRef`, `source.toolkit.fluxcd.io/v1` HelmRepository, and `helm.toolkit.fluxcd.io/v2` HelmRelease are current and align with the official Flux documentation. The local environment did not have `kubectl` or `flux` installed, so CLI validation was performed against official command references rather than local `--help` output.
