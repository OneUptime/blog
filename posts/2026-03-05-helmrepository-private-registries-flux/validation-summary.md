# Validation Summary: How to Set Up HelmRepository for Private Helm Registries in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Flux source-controller
- Flux HelmRepository custom resource
- Kubernetes Secrets
- Kubernetes NetworkPolicy
- Helm chart repositories
- ChartMuseum
- Harbor
- JFrog Artifactory
- Sonatype Nexus Repository Manager

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Flux latest install manifests for source-controller labels: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

## Issues Found
- The self-signed certificate examples used `caFile` in a `secretRef`. Flux's current v1 API documents `caFile` under `secretRef` as deprecated for TLS data and says to use `.spec.certSecretRef` with a secret containing `ca.crt`. I changed the CA secret key to `ca.crt` and updated the HelmRepository example to use `certSecretRef`.
- The combined authentication and CA example put credentials and the CA certificate in one secret referenced by `secretRef`. Current Flux guidance keeps repository credentials in `secretRef` and TLS certificate data in `certSecretRef`. I changed the example to create a separate credentials secret and added a HelmRepository snippet that references both secrets.
- The summary said to optionally include a CA certificate in the credentials secret. I updated it to say to create a certificate secret for custom CA certificates and reference the appropriate secrets in the HelmRepository spec.

## Review Notes
- The `apiVersion: source.toolkit.fluxcd.io/v1`, `kind: HelmRepository`, `type: oci`, `url`, `interval`, and `secretRef` usage is consistent with current Flux documentation.
- The basic authentication secret examples use `username` and `password`, which matches Flux's documented fields for HTTP/S Helm repositories and is also supported for OCI Helm repository examples.
- The NetworkPolicy pod selector uses `app: source-controller`, which is present on the source-controller pod template in the current Flux install manifests.
- The `kubectl create secret generic` commands use current documented flags such as `--namespace`, `--from-literal`, and `--from-file`.
