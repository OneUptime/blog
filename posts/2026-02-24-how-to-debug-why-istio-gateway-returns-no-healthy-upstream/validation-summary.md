# Validation Summary: How to Debug Why Istio Gateway Returns No Healthy Upstream

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio ingress gateway
- Envoy proxy
- Kubernetes Services, Pods, and EndpointSlices
- Istio VirtualService and DestinationRule configuration
- Istio mTLS and DNS proxying
- `kubectl`, `istioctl`, and `pilot-agent`

## Sources Consulted
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio traffic routing documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/traffic-routing/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `pilot-agent` command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio DNS proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Envoy response flag documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html

## Issues Found
- Corrected the explanation of the Envoy `UH` response flag from "Upstream Unhealthy" to "No Healthy Upstream," matching Envoy's official response flag name.
- Replaced legacy `kubectl get endpoints` guidance with EndpointSlice checks. Kubernetes EndpointSlices are the current API for service backend endpoint tracking, while the older Endpoints API is deprecated in Kubernetes v1.33+.
- Clarified that Kubernetes service traffic is normally sent to ready endpoints and that EndpointSlices track readiness conditions, rather than implying endpoint resources only ever contain ready pods.
- Updated Istio protocol-selection guidance. Istio can use explicit port naming or `appProtocol`, and may use protocol auto-detection; an unnamed port is not always immediately treated as TCP.
- Changed `istioctl proxy-config` examples from `deploy/istio-ingressgateway` to the documented `deployment/istio-ingressgateway` resource form.
- Broadened the explanation of `UNHEALTHY` endpoint entries to include health checks as well as outlier detection.
- Replaced the unsupported-looking DNS debug endpoint example with an Istio agent metrics check on port 15020 for DNS proxy activity and failures.

## Review Notes
The mTLS section is accurate as a 503 troubleshooting check, but TLS mismatches can surface with response flags other than `UH`, such as upstream connection failures, depending on where the failure occurs.
