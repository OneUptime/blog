# Validation Summary: How to Diagnose Why Traffic is Not Reaching Your Service in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- kubectl
- istioctl
- Istio VirtualService and DestinationRule
- Istio PeerAuthentication and AuthorizationPolicy
- Istio Telemetry API

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod with proxy-config: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio check-inject documentation: https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio istioctl describe documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio Envoy access logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/

## Issues Found
- Replaced `kubectl get endpoints` with an EndpointSlice query because the Kubernetes Endpoints API is deprecated in Kubernetes 1.33+ and EndpointSlices are the current service endpoint API.
- Added the missing `-n my-namespace` flag to `kubectl exec deploy/my-service` and `kubectl logs deploy/my-service` examples so they operate on the namespace used throughout the post.
- Updated `istioctl proxy-config` examples from `deploy/my-service` to the documented `deployment/my-service` resource form.
- Replaced the `pilot-agent request GET listeners` example for checking application ports. That command queries Envoy listeners, not the application container's declared ports, so the post now uses `kubectl get deploy ... jsonpath` to inspect container ports.
- Clarified Istio port protocol selection. Istio does not strictly require every Service port name to use `<protocol>-<suffix>` because it can automatically detect HTTP and HTTP/2 and Kubernetes `appProtocol` can also be used, but explicit protocol selection does follow the `<protocol>[-<suffix>]` convention.
- Replaced the outdated `istioctl authn tls-check` command with `istioctl x describe pod`, which is documented for identifying mTLS/TLS conflicts in current Istio documentation.
- Replaced the access-log enablement command. `pilot-agent request POST 'logging?level=debug'` changes proxy logging level and does not enable Envoy access logs. The post now shows the recommended Telemetry API configuration for enabling Envoy access logs.

## Review Notes
The guide is technically relevant and accurate after the corrections above. Some examples remain intentionally generic and require substituting real pod, deployment, container, namespace, host, and service names.
