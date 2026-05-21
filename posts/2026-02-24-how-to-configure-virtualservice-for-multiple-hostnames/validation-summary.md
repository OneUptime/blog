# Validation Summary: How to Configure VirtualService for Multiple Hostnames

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio Gateway
- Istio traffic management
- Kubernetes custom resources
- TLS and SNI
- istioctl
- jq

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/

## Issues Found
- The Istio resource examples used `apiVersion: networking.istio.io/v1beta1`. Current official Istio documentation uses `networking.istio.io/v1` for VirtualService and Gateway examples, so the examples were updated to `apiVersion: networking.istio.io/v1`.
- The host-specific routing explanation said the fallback route handled `www.example.com` "or anything else". In that example, the VirtualService hosts are limited to `api.example.com`, `admin.example.com`, and `www.example.com`, so the text was corrected to say `www.example.com` goes to the web frontend.
- The wildcard example implied exact host matching takes precedence over wildcard hosts by itself. Istio HTTP routes are evaluated by rule order, so the text was corrected to explain that the `api.example.com` authority match works because it is listed before the fallback route.
- The Gateway mismatch pitfall said every VirtualService host must be included in the Gateway host list. Istio allows exact matches and supported wildcard suffix matches between bound VirtualService hosts and Gateway server hosts, so the wording was corrected.

## Review Notes
The `istioctl proxy-config routes` and `istioctl analyze -n default` commands match the documented `istioctl` command syntax. The YAML snippets are illustrative and use valid Istio field names for VirtualService hosts, gateways, HTTP route matches, redirects, destinations, Gateway servers, TLS settings, and certificate credentials.
