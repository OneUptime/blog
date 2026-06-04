# Validation Summary: How to Migrate from NGINX Ingress Controller to Envoy Gateway on Kubernetes

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Kubernetes
- Gateway API
- Envoy Gateway
- NGINX Ingress Controller
- Helm
- kubectl
- AWS Route53
- Python / PyYAML
- Prometheus Operator
- cert-manager

## Sources Consulted
- Envoy Gateway Helm installation documentation: https://gateway.envoyproxy.io/docs/install/install-helm/
- Envoy Gateway HTTPRoute API documentation: https://gateway.envoyproxy.io/v1.5/api/gateway_api/httproute/
- Envoy Gateway proxy metrics documentation: https://gateway.envoyproxy.io/docs/tasks/observability/proxy-metric/
- Envoy Gateway proxy access logs documentation: https://gateway.envoyproxy.io/v1.8/tasks/observability/proxy-accesslog/
- Envoy Gateway extension API reference: https://gateway.envoyproxy.io/v1.5/api/extension_types/
- Kubernetes Gateway API documentation: https://v1-35.docs.kubernetes.io/docs/concepts/services-networking/gateway/
- Gateway API HTTP rewrite documentation: https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/
- Gateway API specification reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- cert-manager Gateway API documentation: https://cert-manager.io/docs/usage/gateway/

## Issues Found
- Envoy Gateway install used the EOL `v1.0.0` chart and separately applied Gateway API `v1.0.0` CRDs. Updated the guide to use the current stable Envoy Gateway `v1.8.0` Helm install, which installs Gateway API and Envoy Gateway CRDs by default.
- The migration example did not preserve the NGINX `ssl-redirect` behavior. Added a listener-specific HTTPRoute with a `RequestRedirect` filter for HTTP-to-HTTPS redirects.
- The migration example did not preserve the NGINX `rewrite-target` behavior. Added Gateway API `URLRewrite` filters using `ReplacePrefixMatch`.
- The HTTPS backend HTTPRoute attached to both HTTP and HTTPS listeners. Restricted it to the HTTPS listener with `sectionName: https`.
- The Envoy Gateway Service lookup used the control-plane service name instead of the generated Envoy proxy Service. Updated the command to find the data-plane Service by Envoy Gateway ownership labels.
- The Route53 example assumed IP-backed A records. Added a caveat for cloud load balancers that return hostnames and require alias or weighted CNAME records.
- The Python conversion script skipped `kubectl get ingress --all-namespaces -o yaml` output because that command returns a Kubernetes `List`, not individual Ingress documents. Updated the script to handle both `List` and individual documents.
- The Python conversion script copied Ingress `pathType: Prefix` directly into HTTPRoute path matches, which is invalid for Gateway API. Added path type mapping from Ingress `Prefix` to Gateway API `PathPrefix`.
- The Prometheus example used a `ServiceMonitor` selector and path that did not target the generated Envoy proxy metrics endpoint. Updated it to a `PodMonitor` scraping Envoy proxy pods on `/stats/prometheus`.
- The access log snippet used an `EnvoyGateway` resource field that does not configure proxy access logs. Replaced it with an `EnvoyProxy` configuration attached via `GatewayClass.parametersRef`.

## Review Notes
The post is technically relevant and now validates as a migration guide. Some NGINX annotations still cannot be converted automatically in a fully portable way; production migrations should inventory annotations and confirm Gateway API or Envoy Gateway equivalents before cutover.
