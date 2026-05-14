# Validation Summary: How to Implement Certificate Rotation with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Kubernetes
- cert-manager
- HelmRelease and HelmRepository
- Let's Encrypt ACME
- Prometheus Operator and PrometheusRule
- NGINX Ingress
- Flux notification-controller

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager continuous deployment with Flux documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager Certificate API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- Flux HelmRelease documentation and API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Alert and Provider documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux webhook receiver documentation: https://fluxcd.io/flux/guides/webhook-receivers/
- Let's Encrypt staging environment documentation: https://letsencrypt.org/docs/staging-environment/

## Issues Found
- Updated the cert-manager chart from the unsupported `1.14.3` release to `v1.20.2`, and updated the Kubernetes prerequisite to match cert-manager's supported Kubernetes version range.
- Replaced the old cert-manager Helm value `installCRDs: true` with the current `crds.enabled: true` value used by recent cert-manager charts.
- Changed the cert-manager chart source to the recommended OCI Helm repository at `oci://quay.io/jetstack/charts`.
- Added a prerequisite note that Prometheus Operator CRDs are required when enabling the cert-manager ServiceMonitor.
- Moved ClusterIssuer example paths into a separate `cert-manager-issuers` directory and added a Flux Kustomization dependency so issuer CRs are applied only after cert-manager CRDs and controllers are installed.
- Replaced ACME HTTP-01 solver `class: nginx` with the recommended `ingressClassName: nginx` field.
- Corrected the Let's Encrypt staging comment from "no rate limits" to "higher rate limits"; staging still has rate limits.
- Corrected the Flux webhook certificate example. The Flux `webhook-receiver` service is HTTP on port 80, so the certificate should represent the public webhook Ingress hostname rather than internal service DNS names.
- Updated Flux notification `Provider` and `Alert` examples from invalid `notification.toolkit.fluxcd.io/v1` API versions to the current `notification.toolkit.fluxcd.io/v1beta3` API.
- Tightened Prometheus expiry alerts to exclude already-expired certificates from "expiring soon" alerts and changed the metric label in the annotation from `namespace` to `exported_namespace`.
- Renamed the renewal failure alert to `CertificateNotReady`, because `certmanager_certificate_ready_status{condition="False"}` indicates a certificate is not ready, not specifically that a renewal failed.

## Review Notes
The YAML snippets were parsed successfully after edits. Helm and kubectl were not installed in the local environment, so CLI-level validation was done against official documentation rather than local command output.
