# Validation Summary: How to Configure NGINX Ingress Rate Limiting with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- community ingress-nginx controller
- Kubernetes Ingress
- Flux CD HelmRelease
- NGINX `limit_req` and `limit_conn`
- Prometheus Operator `PrometheusRule`
- kubectl, jq, curl, hey

## Sources Consulted
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx repository and retirement notice: https://github.com/kubernetes/ingress-nginx
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get/
- NGINX `ngx_http_limit_req_module` documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- NGINX request limiting guide: https://docs.nginx.com/nginx/admin-guide/security-controls/controlling-access-proxied-http/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The original guide used unsupported ingress-nginx ConfigMap keys for global request and connection limits, including `limit-req-zone-variable`, `limit-connections`, and `limit-connections-status-code`. Replaced them with supported `http-snippet` and `location-snippet` directives using NGINX `limit_req_zone`, `limit_conn_zone`, `limit_req`, and `limit_conn`, and corrected the status-code key to `limit-conn-status-code`.
- The guide described `limit-rate-after` as enabling rate limit response headers. That ConfigMap key controls response bandwidth throttling after a number of kilobytes, so it was removed from the header example.
- The authentication example used `nginx.ingress.kubernetes.io/limit-rps: "0.167"` to express 10 requests per minute. ingress-nginx documents `limit-rpm` for per-minute limits, so the example now uses `nginx.ingress.kubernetes.io/limit-rpm: "10"`.
- The examples used the old `kubernetes.io/ingress.class` annotation alongside `spec.ingressClassName`. Removed the annotation and kept the current Kubernetes field.
- The post included an unsupported per-Ingress `limit-req-zone-variable` annotation. Removed it and clarified that ingress-nginx determines the client IP from its trusted proxy and forwarded-header settings.
- The API example set `Retry-After: 1` on every response via `configuration-snippet`. Removed that always-on header and kept only a static policy header.
- The advanced snippet was shown as an arbitrary standalone ConfigMap that ingress-nginx would not automatically consume. Converted it to a HelmRelease `values.controller.config` example so it updates the controller ConfigMap managed by the chart.
- The Flux command used `flux get kustomization`; official Flux CLI documentation lists `flux get kustomizations`, so the command was corrected.
- The monitoring command only displayed `limit-rps` annotations even though the guide now uses both RPS and RPM limits. Updated the `jq` expression to show both.
- Updated wording from ambiguous "NGINX Ingress Controller" to "community ingress-nginx controller" where needed, because F5 NGINX Ingress Controller and community ingress-nginx have different annotation sets.

## Review Notes
The post is technically valid for existing community ingress-nginx deployments. As of May 13, 2026, the ingress-nginx repository documents project retirement and advises against new deployments; the guide was scoped to existing deployments rather than greenfield adoption.
