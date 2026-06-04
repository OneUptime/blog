# Validation Summary: How to Use Kong KongPlugin and KongIngress CRDs for Policy Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kong Ingress Controller
- Kong Gateway plugins
- KongPlugin and KongClusterPlugin CRDs
- KongIngress legacy CRD
- KongUpstreamPolicy CRD
- Kubernetes Ingress, Service annotations, and kubectl

## Sources Consulted
- Kong Ingress Controller CRD API reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong Ingress Controller annotation reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Kong migration guide for KongIngress to annotations and KongUpstreamPolicy: https://developer.konghq.com/kubernetes-ingress-controller/migrate/kongingress/
- Kong Service health checks with KongUpstreamPolicy: https://developer.konghq.com/kubernetes-ingress-controller/service-health-checks/
- Kong Ingress Controller debugging logs: https://developer.konghq.com/kubernetes-ingress-controller/troubleshooting/debugging/
- Kong Request Transformer plugin docs: https://developer.konghq.com/plugins/request-transformer/
- Kong CORS plugin configuration reference: https://developer.konghq.com/plugins/cors/reference/
- Kong IP Restriction plugin configuration reference: https://developer.konghq.com/plugins/ip-restriction/reference/
- Kong Proxy Cache plugin configuration reference: https://developer.konghq.com/plugins/proxy-cache/reference/
- Kong HTTP Log plugin documentation: https://developer.konghq.com/plugins/http-log/

## Issues Found
- The basic KongPlugin structure incorrectly nested fields under `spec`. KongPlugin fields such as `plugin`, `config`, `disabled`, `protocols`, `run_on`, and `ordering` are top-level CRD fields, so the example was corrected.
- The post described KongIngress as a primary current configuration mechanism. Current Kong Ingress Controller documentation deprecates KongIngress route/proxy usage in favor of annotations and uses KongUpstreamPolicy for upstream settings, so the wording and examples were updated.
- The request-transformer example attempted to add an `X-Forwarded-*` header and used an unsupported UUID-style template. Kong documents that `X-Forwarded-*` headers cannot be overwritten by this plugin, so the example now adds ordinary gateway headers.
- The IP restriction example combined allow rules with a deny-all rule, which would block the allowed ranges because deny rules can override allow matches. The deny-all entry was removed.
- Timeout examples used a deprecated KongIngress proxy block. They were replaced with current Service annotations such as `konghq.com/connect-timeout`, `konghq.com/read-timeout`, and `konghq.com/retries`.
- Health check and load-balancing examples used KongIngress upstream fields. They were replaced with `KongUpstreamPolicy` examples using the current `v1beta1` API and lowerCamelCase field names.
- The combined configuration example used deprecated `konghq.com/override` and a KongIngress resource for new configuration. It now uses Service annotations and `konghq.com/upstream-policy`.
- The plugin ordering section did not mention that `ordering` is Enterprise-only. The text was corrected.
- The troubleshooting log commands used a selector that is not the current official example. They were updated to `kubectl logs -n kong deployments/kong-controller`.

## Review Notes
KongIngress remains relevant for legacy clusters and migrations, but new Kong Ingress Controller configurations should prefer Gateway API or Kubernetes Ingress plus annotations, with KongUpstreamPolicy for upstream load-balancing and health-check settings.
