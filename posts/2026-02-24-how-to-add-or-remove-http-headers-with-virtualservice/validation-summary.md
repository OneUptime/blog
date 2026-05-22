# Validation Summary: How to Add or Remove HTTP Headers with VirtualService

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio traffic management APIs
- Envoy HTTP header manipulation
- Kubernetes YAML manifests
- istioctl proxy-config
- curl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Envoy HTTP header manipulation documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html
- Envoy substitution formatter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter

## Issues Found
- The VirtualService examples used `apiVersion: networking.istio.io/v1beta1`. Istio now provides stable `v1` APIs for VirtualService and the current official examples use `networking.istio.io/v1`, so the snippets were updated to use `apiVersion: networking.istio.io/v1`.
- The limitations section said Envoy processes request header modifications before routing. Istio documents these rules as applying before forwarding a request to the destination service and before returning a response to the caller, so the wording was corrected to match that behavior.

## Review Notes
The header operation fields `headers.request.set`, `headers.request.add`, `headers.request.remove`, `headers.response.set`, and `headers.response.remove` match the official Istio VirtualService schema. The `istioctl proxy-config routes deployment/<deployment-name> -o json` command form is supported by the official `istioctl` command reference. Envoy command operators such as `%REQ(...)%` and `%RESP(...)%` are supported in custom request and response headers.
