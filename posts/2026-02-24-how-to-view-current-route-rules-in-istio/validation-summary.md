# Validation Summary: How to View Current Route Rules in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- istioctl
- Envoy
- Kubernetes
- VirtualService
- DestinationRule
- jq

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio configuration analysis messages: https://istio.io/latest/docs/reference/config/analysis/
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html

## Issues Found
- `istioctl proxy-config routes` was shown with `--port 8080`. Current Istio documentation lists `--name` for filtering route configurations, and the official debugging guide uses `--name 9080`. Changed the example to `--name 8080`.
- `istioctl analyze -f my-virtualservice.yaml` was incorrect for current Istio. `istioctl analyze` accepts files as positional arguments; `-f` is used by `istioctl validate`, not `analyze`. Changed the command to `istioctl analyze my-virtualservice.yaml`.
- The analyzer issue list said "DestinationRule references a subset that does not exist." In Istio, VirtualService destinations reference subsets that must be declared in DestinationRules. Changed this to "VirtualService references a subset that does not exist."

## Review Notes
The remaining commands and explanations match the current Istio and Envoy documentation at the time of review. The post assumes sidecar mode with an Envoy admin interface available on the default Istio admin port, which is appropriate for the commands shown.
