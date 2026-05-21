# Validation Summary: How to Fix Istio Gateway Not Routing Traffic

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio ingress gateways
- Istio Gateway and VirtualService APIs
- istioctl proxy-config and analyze commands
- Kubernetes Services, Pods, and Secrets
- TLS certificates and SNI testing
- Envoy access log response flags

## Sources Consulted
- Istio Gateway installation and selector documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio secure ingress gateway documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl proxy-config reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Envoy response flag documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html
- curl name resolution and SNI behavior: https://everything.curl.dev/usingcurl/connections/name.html

## Issues Found
- The Istio manifests used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1` for Gateway and VirtualService examples, so the snippets were updated to the current stable API version.
- The commands used `kubectl get gateways`, which can be ambiguous on clusters that also have Kubernetes Gateway API resources. The commands were changed to `kubectl get gateways.networking.istio.io` and `kubectl get gateway.networking.istio.io` so they explicitly inspect Istio Gateway resources.
- The Service port inspection command piped JSONPath output into `jq`, but that JSONPath expression does not emit valid JSON. It was changed to request full JSON and filter `.spec.ports[]` with `jq`.
- The Service patch example used a JSON merge patch against `spec.ports`, which can replace the existing port list. It was changed to a JSON Patch append operation so existing Service ports are preserved.
- The HTTPS curl test used an IP address in the URL with `--resolve` for the hostname. curl derives SNI from the URL hostname, so this would not test the intended TLS host. The command now uses `https://myapp.example.com/health` with `--resolve myapp.example.com:443:$GATEWAY_IP`.

## Review Notes
The guide focuses on Istio's `networking.istio.io` APIs rather than the Kubernetes Gateway API. That is technically valid, but future updates could mention the distinction because Istio also supports the Kubernetes Gateway API and intends it to become the default traffic management API.
