# Validation Summary: How to Store TLS Certificates in Git with SOPS and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Secrets
- Kubernetes Ingress
- Flux Kustomization
- Flux HelmRelease
- SOPS
- age encryption
- cert-manager
- x509-certificate-exporter
- Prometheus metrics

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- SOPS documentation: https://github.com/getsops/sops
- cert-manager ACME documentation: https://cert-manager.io/docs/configuration/acme/
- cert-manager DNS validation documentation: https://cert-manager.io/v1.16-docs/tutorials/acme/dns-validation/
- x509-certificate-exporter chart documentation: https://artifacthub.io/packages/helm/enix/x509-certificate-exporter

## Issues Found
- The post said wildcard certificates were a case where cert-manager cannot issue certificates. cert-manager can issue wildcard certificates when DNS-01 validation is configured, so the wording was changed to "cannot issue in your environment."
- The TLS Secret example used the `istio-system` namespace while the Ingress example was in the `default` namespace. Kubernetes Ingress TLS references require the Secret to be in the same namespace as the Ingress, so the TLS Secret examples were updated to `default`.
- The fresh-file renewal command encrypted `/tmp/wildcard-cert.yaml` without telling SOPS to use the repository destination path for `.sops.yaml` rule matching. The command was updated to use `sops encrypt --filename-override infrastructure/tls/wildcard-cert.sops.yaml ...` so the intended creation rule applies.

## Review Notes
- Kubernetes documents `stringData` as valid for TLS Secrets, but notes that it does not work well with server-side apply. Flux's SOPS guide still demonstrates encrypting `stringData`, so the post's approach is usable, but teams using strict server-side apply workflows may prefer base64-encoded `data`.
- The x509-certificate-exporter HelmRelease assumes a matching `HelmRepository` named `enix` exists in `flux-system`; that is a prerequisite rather than an error in the focused snippet.
