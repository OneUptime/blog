# Validation Summary: How to Use Istio Certificate Management with cert-manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- cert-manager
- cert-manager-istio-csr
- Kubernetes
- Helm
- TLS and mTLS
- ACME / Let's Encrypt
- Prometheus metrics

## Sources Consulted
- Istio cert-manager integration documentation: https://istio.io/latest/docs/ops/integrations/certmanager/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio secure ingress task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- cert-manager Certificate documentation for v1.14: https://cert-manager.io/v1.14-docs/usage/certificate/
- cert-manager Prometheus metrics documentation for v1.14: https://cert-manager.io/v1.14-docs/devops-tips/prometheus-metrics/
- cert-manager istio-csr usage documentation: https://cert-manager.io/docs/usage/istio-csr/
- cert-manager istio-csr installation documentation: https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager v1.14.0 chart templates and metrics source: https://github.com/cert-manager/cert-manager/tree/v1.14.0
- cert-manager-istio-csr Helm chart values reference: https://artifacthub.io/packages/helm/cert-manager/cert-manager-istio-csr

## Issues Found
- The ACME solver example used unqualified HTTP-01 and DNS-01 solvers while the Certificate later requested a wildcard name. I added solver selectors and clarified that DNS-01 is required for wildcard certificates.
- Istio Gateway examples used `networking.istio.io/v1beta1`. I updated them to the current `networking.istio.io/v1` API used by current Istio documentation.
- The HTTP-to-HTTPS Gateway example used `redirect.httpsRedirect`, which is not the Istio Gateway schema. I moved `httpsRedirect` under `tls`.
- The istio-csr section created a CA certificate but did not create a cert-manager Issuer backed by that CA secret. I added an `Issuer` that references the generated CA secret.
- The Istio install command used the obsolete `CITADEL_ENABLE_NAMESPACED_CA` setting. I replaced it with an `IstioOperator` install manifest that sets `ENABLE_CA_SERVER=false` and `global.caAddress`, matching current istio-csr guidance.
- The istio-csr installation order and root CA mount were incomplete. I added the root CA copy into the `cert-manager` namespace and configured the chart to mount that copied secret before installing Istio.
- The manual ServiceMonitor example did not match the Helm chart-managed setup used in the article. I replaced it with a Helm upgrade that enables the chart-managed ServiceMonitor.
- The PromQL query used a non-existent `certmanager_certificate_request_count` metric. I replaced it with `certmanager_controller_sync_error_count`, which is exposed by cert-manager v1.14.
- The cert-manager resource-limit example used an invalid Deployment shape for the Helm-installed controller. I replaced it with the chart values format for `resources`.

## Review Notes
- The post pins cert-manager to v1.14.0, which is valid for the examples reviewed but is no longer the latest cert-manager release as of this validation date.
- Public ACME issuers such as Let's Encrypt are appropriate for ingress certificates but not for Istio workload certificates, because Istio workload certificates require SPIFFE URI SANs.
