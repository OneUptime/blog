# Validation Summary: How to Configure OpenFaaS with IPv6

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenFaaS (Functions as a Service)
- Kubernetes (dual-stack IPv4/IPv6)
- Helm / arkade (OpenFaaS install methods)
- faas-cli (OpenFaaS CLI)
- Python (`python3-http` template)
- Prometheus (metrics)
- Grafana (dashboards)
- IPv6 addressing on Kubernetes Services (`ipFamilyPolicy`, `ipFamilies`)

## Sources Consulted
- OpenFaaS Helm chart README: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/README.md
- OpenFaaS Helm chart `values.yaml`: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/values.yaml
- OpenFaaS gateway metrics source: https://github.com/openfaas/faas/blob/master/gateway/metrics/metrics.go
- OpenFaaS Python templates: https://github.com/openfaas/python-flask-template/blob/master/template/python3-http/index.py
- OpenFaaS Python language docs: https://docs.openfaas.com/languages/python/
- OpenFaaS stack.yml reference: https://docs.openfaas.com/reference/yaml/
- Kubernetes dual-stack Service docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Grafana dashboard 3434: https://grafana.com/grafana/dashboards/3434

## Issues Found
1. **Incorrect Python `context` attribute.** The handler used `context.function_name`, but the official `python3-http` template `Context` class only exposes `hostname` (`self.hostname = os.getenv('HOSTNAME', 'localhost')`) — there is no `function_name` attribute. Replaced with `context.hostname` and renamed the response field accordingly.
2. **Invalid IPv6 literal in `stack.yml`.** The example gateway address `fd00:10:96::gw` contained the characters `g` and `w`, which are not valid hexadecimal digits and would fail any IPv6 parser. Replaced with a syntactically valid placeholder `fd00:10:96::1`.
3. **Incorrect Prometheus metric name.** The post listed `gateway_functions_total`, but the actual OpenFaaS gateway metric is `gateway_function_invocation_total` (singular `function`, registered under namespace `gateway`, subsystem `function`, name `invocation_total`). Updated to the correct name.

## Review Notes
- Helm value `serviceType=LoadBalancer` is the correct top-level key in the `openfaas/openfaas` chart (not `gateway.serviceType`); the chart applies it to the `gateway-external` Service. Verified.
- `gateway-external` is the standard service name when `exposeServices: true` (the default). Verified.
- `ipFamilyPolicy: RequireDualStack` with both `IPv6` and `IPv4` in `ipFamilies` is a valid Kubernetes Service spec for dual-stack with IPv6 as the primary family.
- Grafana dashboard 3434 ("OpenFaaS Serverless Dashboard") exists and is widely used, but it was last updated in 2017 and uses deprecated panel types (`singlestat`, old Graph). Readers on modern Grafana may need to update panels or seek a newer dashboard.
- The `is_ipv6 = ":" in client_ip` heuristic is acceptable for distinguishing IPv4 vs. IPv6 client addresses pulled from `X-Forwarded-For` (IPv4 dotted-decimal never contains a colon), though strictly speaking a port-suffixed IPv4 like `1.2.3.4:5678` would also contain a colon. Most reverse proxies do not append ports to `X-Forwarded-For`, so the check is fine for typical OpenFaaS gateway behavior.
