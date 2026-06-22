# Validation Summary: Deploying Kong API Gateway with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kong Gateway
- Kong Ingress Controller
- Kong Helm charts
- Kubernetes Ingress, Service, Secret, and custom resources
- Helm
- PostgreSQL
- Kong plugins: rate limiting, JWT, key auth, OAuth2, CORS, request transformer, HTTP log, Prometheus, basic auth
- Prometheus Operator ServiceMonitor and PrometheusRule

## Sources Consulted
- Kong Helm Charts repository: https://github.com/Kong/charts
- Kong Helm chart values.yaml: https://github.com/Kong/charts/blob/main/charts/kong/values.yaml
- Kong Helm chart CRD bundle: https://github.com/Kong/charts/blob/main/charts/kong/crds/custom-resource-definitions.yaml
- Kong Ingress Controller custom resources reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong Ingress Controller KongIngress migration guide: https://developer.konghq.com/kubernetes-ingress-controller/migrate/kongingress/
- Kong Ingress Controller credential Secret migration guide: https://developer.konghq.com/kubernetes-ingress-controller/migrate/credential-kongcredtype-label/
- Kong Gateway Kubernetes Helm installation guide: https://developer.konghq.com/gateway/install/kubernetes/on-prem/
- Kong Rate Limiting plugin reference: https://developer.konghq.com/plugins/rate-limiting/reference/
- Kong JWT plugin reference: https://developer.konghq.com/plugins/jwt/reference/
- Kong Key Auth plugin reference: https://developer.konghq.com/plugins/key-auth/reference/
- Kong OAuth2 plugin reference: https://developer.konghq.com/plugins/oauth2/reference/
- Kong Prometheus plugin documentation: https://developer.konghq.com/plugins/prometheus/

## Issues Found
- Kong image tag `3.4` was below the minimum `3.4.1` required by Kong Ingress Controller 3.x upgrade guidance. Updated chart examples to pin `3.4.1`.
- The PostgreSQL install enabled Kong Manager while using the open source `kong` image. Disabled Manager in that community installation example and kept Manager in the Enterprise example.
- The Enterprise values example did not use the Enterprise Gateway image. Added `kong/kong-gateway:3.4.1`.
- `KongIngress` examples used deprecated route, proxy, and upstream configuration. Replaced route/proxy settings with supported annotations and replaced upstream settings with `KongUpstreamPolicy` using `configuration.konghq.com/v1beta1`.
- The upstream policy example was not attached to a Service. Added the required `konghq.com/upstream-policy` Service annotation.
- The rate limiting plugin set `policy: local` while also configuring Redis fields. Changed the policy to `redis` so the Redis configuration is active.
- The JWT credential used the removed/legacy `KongCredential` resource. Replaced it with a labeled Kubernetes `Secret` referenced by `KongConsumer.credentials`.
- Key auth and basic auth credential Secrets included deprecated `kongCredType` data. Removed it and retained the current `konghq.com/credential` label.
- The API key credential Secret incorrectly used `apiVersion: configuration.konghq.com/v1`. Changed it to the core Kubernetes `v1` Secret API.
- The section labeled RBAC created a basic auth credential, not Kong Enterprise RBAC. Renamed it to Basic Auth Credential and added the missing consumer credential reference.
- The standalone ServiceMonitor example referenced a `metrics` service port that the chart does not expose. Updated it to scrape `targetPort: status` and match the chart's `enable-metrics: "true"` label.
- Prometheus alert expressions used outdated metric names. Updated them to current Prometheus plugin metrics: `kong_request_latency_ms_bucket` and `kong_http_requests_total`.
- Troubleshooting referenced `kongingresses`; updated it to `kongupstreampolicies` after migrating the examples.

## Review Notes
- Helm and kubectl were not installed in the local environment, so command help output could not be checked locally. The review used official Kong chart files and documentation instead.
- The post still intentionally pins Kong `3.4.1` for consistency with the original versioned examples. New deployments should consider reviewing current Kong Gateway and chart versions before production use.
