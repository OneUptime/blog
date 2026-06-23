# Validation Summary: How to Access Prometheus and Grafana via Istio Gateway

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio Gateway and VirtualService
- Istio RequestAuthentication, AuthorizationPolicy, PeerAuthentication, DestinationRule, and EnvoyFilter
- Kubernetes TLS secrets and kubectl
- Prometheus command-line web settings and Helm chart values
- Grafana reverse proxy and subpath configuration
- Envoy local rate limiting

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio InvalidGatewayCredential analyzer reference: https://istio.io/latest/docs/reference/config/analysis/ist0161/
- Istio VirtualService reference, including HTTPRewrite: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio RequestAuthentication reference and JWT ingress examples: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio rate limiting with Envoy task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Kubernetes `kubectl create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Prometheus command-line flags reference: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus Community Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus/values.yaml
- Grafana configuration reference: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana reverse proxy tutorial: https://grafana.com/tutorials/run-grafana-behind-a-proxy/

## Issues Found
- The Istio Gateway, VirtualService, RequestAuthentication, AuthorizationPolicy, PeerAuthentication, and DestinationRule snippets used older `v1beta1` API versions. Current Istio documentation uses the stable `networking.istio.io/v1` and `security.istio.io/v1` APIs for these resources, so I updated the snippets.
- The Prometheus Helm values mixed chart-level `baseURL` / `prefixURL` settings with explicit `web.external-url` and `web.route-prefix` flags, and `baseURL` was not a full external URL. I simplified the example to use the documented Prometheus flags through `server.extraFlags`.
- The Grafana config enabled `serve_from_sub_path` while the Istio VirtualService examples strip `/grafana` before proxying to Grafana. Grafana documentation treats `serve_from_sub_path` as the alternative when the proxy is not handling the subpath, so I set it to `false` for the rewrite-based examples.
- The JWT authentication example selected only `app: prometheus` workloads in the `monitoring` namespace, so it would not secure Grafana or all externally exposed monitoring paths through the ingress gateway. I changed the RequestAuthentication and AuthorizationPolicy to apply to the Istio ingress gateway in `istio-system` and scoped the authorization rule to the monitoring host and paths.
- The Grafana Live WebSocket route did not rewrite `/grafana/api/live/ws` before forwarding to Grafana, unlike the regular Grafana route and Grafana's reverse proxy examples. I added a rewrite to `/api/live/ws`.

## Review Notes
The TLS secret command is valid for the default Istio ingress gateway deployment because the selected gateway workload normally runs in `istio-system`, and Istio's analyzer documentation expects `credentialName` secrets in the gateway workload namespace. The mTLS section assumes the monitoring workloads are in the mesh with Istio sidecars; strict mTLS will fail for workloads that are not injected or otherwise mesh-enabled. The EnvoyFilter remains on `networking.istio.io/v1alpha3`, which matches Istio's EnvoyFilter API usage in current rate-limiting documentation.
