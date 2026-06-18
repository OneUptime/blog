# Validation Summary: How to Configure API Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- API gateways
- Kong Gateway
- Kong Ingress Controller
- Apache APISIX
- APISIX Ingress Controller
- Kubernetes
- Helm
- Prometheus / PromQL
- Grafana

## Sources Consulted
- Kong Gateway Rate Limiting plugin documentation: https://developer.konghq.com/plugins/rate-limiting/
- Kong Gateway Key Auth plugin documentation: https://developer.konghq.com/plugins/key-auth/
- Kong Gateway JWT plugin documentation: https://developer.konghq.com/plugins/jwt/
- Kong Gateway Request Transformer plugin documentation: https://developer.konghq.com/plugins/request-transformer/
- Kong Gateway Response Transformer plugin documentation: https://developer.konghq.com/plugins/response-transformer/
- Kong Gateway Prometheus plugin documentation: https://developer.konghq.com/plugins/prometheus/
- Kong Ingress Controller custom resource reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong Ingress Controller annotation reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Apache APISIX Helm chart documentation: https://apache.github.io/apisix-helm-chart/docs/en/latest/apisix.html
- Apache APISIX Ingress Controller CRD API reference: https://apisix.apache.org/docs/ingress-controller/reference/apisix-ingress-controller/api-reference/
- Apache APISIX jwt-auth plugin documentation: https://apisix.apache.org/docs/apisix/plugins/jwt-auth/
- Apache APISIX limit-count plugin documentation: https://apisix.apache.org/docs/apisix/plugins/limit-count/
- Apache APISIX limit-req plugin documentation: https://apisix.apache.org/docs/apisix/plugins/limit-req/
- Apache APISIX proxy-cache plugin documentation: https://apisix.apache.org/docs/apisix/plugins/proxy-cache/
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The APISIX Helm command used `--set admin.allow.ipList="{0.0.0.0/0}"`. The official chart FAQ documents using an empty value to allow all IPs for quick testing, so the command was changed to `--set admin.allow.ipList=""`.
- The APISIX JWT route placed JWT credential fields (`key`, `secret`, and `algorithm`) in the route plugin config. APISIX stores those values on consumers/credentials, while route-side JWT auth config controls token lookup locations. The route was changed to use the `authentication.jwtAuth.header` field.
- The Kong response-transformer example attempted to add `X-Response-Time:${latency}ms`, but the standard response-transformer plugin adds static transformations and does not document that `${latency}` template. The example now adds a static response header.
- The APISIX `ApisixUpstream` health check used `httpStatuses`, but the current CRD field is `httpCodes`. Both passive health check sections were updated.
- The APISIX `ApisixUpstream` duration fields used bare integers for `interval` and upstream `timeout` values. The CRD uses Kubernetes duration-style fields for those settings, so they were changed to `5s`, `2s`, `5s`, `30s`, and `30s`.
- The PromQL latency query used `kong_latency_bucket` and passed raw bucket rates directly to `histogram_quantile`. Kong's documented latency histogram metric is `kong_kong_latency_ms_bucket`, and `histogram_quantile` should receive buckets aggregated by `le`. The query was updated accordingly.

## Review Notes
- The Kong Gateway image tag `kong:3.4` refers to Kong Gateway 3.4 LTS rather than the newest Kong Gateway release. The examples remain version-specific and valid, but a future refresh could update the examples to the latest LTS.
- The APISIX `proxy-cache` example assumes the named cache zone exists in APISIX configuration.
- The examples use placeholder secrets and permissive admin access for demonstration; production deployments should store credentials in Kubernetes Secrets and restrict administrative endpoints.
