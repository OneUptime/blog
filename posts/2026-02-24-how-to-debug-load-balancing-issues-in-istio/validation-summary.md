# Validation Summary: How to Debug Load Balancing Issues in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- istioctl
- VirtualService
- DestinationRule
- Telemetry API

## Sources Consulted
- Istio documentation: Diagnose your Configuration with Istioctl Analyze - https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio documentation: Debugging Envoy and Istiod - https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio documentation: DestinationRule reference - https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio documentation: VirtualService reference - https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio documentation: Envoy Access Logs - https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio documentation: Telemetry reference - https://istio.io/latest/docs/reference/config/telemetry/
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Envoy documentation: Administration interface, clusters endpoint - https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html

## Issues Found
- The post said `istioctl proxy-config log <pod-name> --level http:debug,upstream:debug` enabled access logging for a pod. That command changes Envoy component log levels; it does not enable access logs. Replaced it with the Istio Telemetry API access logging configuration.
- The weighted routing section implied Istio normalizes weights only when they do not add up to 100. Updated the explanation to match the VirtualService reference: destinations receive `weight / sum(all weights)` requests.
- The consistent hash debugging command looked for `hashPolicy` inside cluster output, which can miss the route-level hash policy used for HTTP header, cookie, and query-parameter hashing. Updated the command to inspect route configuration and added a cluster-policy check for `RING_HASH` or `MAGLEV`.
- The sidecar injection check only inspected the legacy `istio-injection` namespace label. Updated it to show all namespace labels and mention the revisioned `istio.io/rev=<revision>` label used by revisioned control planes.
- The reset section recommended `kill -HUP 1` inside the sidecar to refresh configuration. Replaced it with `istioctl proxy-status` to check xDS sync state and a workload rollout restart after fixing the underlying connectivity or stale-proxy issue.

## Review Notes
The remaining commands are representative examples and use placeholder pod, service, namespace, and cluster names. Operators should substitute the actual service port in the Envoy cluster name, for example `outbound|9080||service.namespace.svc.cluster.local` when the service port is 9080 rather than 80.
