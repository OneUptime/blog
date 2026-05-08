# Validation Summary: How to Use External Secrets with Flux for TLS Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- External Secrets Operator
- Flux CD Kustomization
- Kubernetes Ingress and TLS Secrets
- AWS Secrets Manager
- HashiCorp Vault
- Prometheus Operator PrometheusRule
- x509-certificate-exporter

## Sources Consulted
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator ClusterExternalSecret documentation: https://external-secrets.io/latest/api/clusterexternalsecret/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator Kubernetes Secret Types guide: https://external-secrets.io/latest/guides/common-k8s-secret-types/
- External Secrets Operator AWS Secrets Manager provider documentation: https://external-secrets.io/latest/provider/aws-secrets-manager/
- External Secrets Operator Advanced Templating v2 guide: https://external-secrets.io/latest/guides/templating/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Ingress TLS documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/#tls
- Kubernetes Secret types documentation: https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets
- x509-certificate-exporter metrics documentation: https://github.com/enix/x509-certificate-exporter/blob/main/docs/metrics.md

## Issues Found
- Updated `ExternalSecret`, `ClusterExternalSecret`, and Flux health check references from `external-secrets.io/v1beta1` to the current `external-secrets.io/v1` API used by current ESO documentation.
- Changed the Step 2 `ExternalSecret` namespace from `ingress-nginx` to `default` so the generated TLS Secret is in the same namespace as the example Ingress that references it.
- Updated the Flux `healthChecks` namespace to match the corrected `ExternalSecret` namespace.
- Replaced deprecated `ClusterExternalSecret.spec.namespaceSelector` with `spec.namespaceSelectors`, matching current ESO documentation.
- Replaced the Prometheus alert metric `x509_cert_expiry` with `x509_cert_not_after`, which is the current x509-certificate-exporter Unix timestamp metric for certificate expiry.

## Review Notes
The direct `ClusterExternalSecret` fan-out pattern is valid for small namespace sets. Current ESO documentation notes that for large namespace sets, each generated `ExternalSecret` polls the upstream provider independently, so a source-namespace plus Kubernetes-provider fan-out pattern can reduce provider API calls.
