# Validation Summary: How to Debug Container Issues Related to Istio Sidecar

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio sidecar mode
- Envoy sidecar proxy
- Kubernetes Pods, containers, EndpointSlices, and readiness
- kubectl
- istioctl
- Istio Sidecar and ProxyConfig configuration

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Application Requirements, including ports used by Istio: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio MeshConfig ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#ProxyConfig
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- Replaced `kubectl get endpoints my-service` with `kubectl get endpointslice -l kubernetes.io/service-name=my-service` because the Endpoints API is deprecated as of Kubernetes v1.33 and EndpointSlices are the current service endpoint API.
- Removed the invalid `--type SIDECAR_INBOUND` filter from the `istioctl proxy-config listener` example. The current `listener` command supports filtering by listener type values such as HTTP/TCP, and the safer diagnostic for an application port is `istioctl proxy-config listener my-app-xyz --port 8080`.
- Changed the outbound connectivity test to run from the application container instead of `istio-proxy`. Proxy images may not include `curl`, and traffic generated from the proxy container does not necessarily test the same capture path as application-container traffic.
- Updated the Sidecar resource example from `networking.istio.io/v1alpha3` to the current `networking.istio.io/v1` API version used in Istio documentation.
- Expanded the Istio reserved port list to include current documented ports 15002, 15004, and 15008.
- Corrected the port-conflict guidance. Excluding a reserved Istio port from capture does not free a port already bound by the proxy or agent, so the post now distinguishes reserved-port conflicts from ordinary application ports that should bypass inbound capture.
- Changed the sidecar disable example from the deprecated annotation form to the current `sidecar.istio.io/inject: "false"` pod label form.

## Review Notes
Some debugging commands assume the application image contains tools such as `curl`, `ss`, `iptables`, or shell utilities. In minimal or distroless images, an ephemeral debug container or a debug-tag proxy image may be needed.
