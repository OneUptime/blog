# Validation Summary: How to Get Envoy Access Logs for Debugging in Istio

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio
- Envoy access logs
- Kubernetes `kubectl logs`
- `istioctl proxy-config`
- Istio Telemetry API
- Istio DestinationRule load balancing
- JSON log filtering with `jq`

## Sources Consulted
- Istio Envoy access logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Envoy access log command operators and response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- The post said that omitting `-c istio-proxy` would get application container logs. Kubernetes may instead use the default-container annotation or first container, so this was changed to say `kubectl` may choose another container.
- The `istioctl proxy-config` examples used the Kubernetes shorthand `deploy/`. Updated them to `deployment/` to match the resource form shown in the official `istioctl` command examples.
- The default Istio access log breakdown omitted the connection termination details field. Added that field so the breakdown matches Istio's documented default access log format.
- The 503 response flag extraction command used `awk '{print $7}'`, which prints response code details in the default text format. Changed it to `awk '{print $6}'` to print response flags.
- The response flag list was labeled as common 503 response flags even though flags such as `UT` and `NR` commonly map to other response codes. Changed the label to common failure response flags and narrowed the `NR` explanation.
- The slow-request `awk` example used a heuristic over numeric fields. Changed it to use field 12, the duration field in Istio's default text access log format.
- The routing section referred to DestinationRule "session affinity settings". Changed this to "consistent hash load balancing settings" to match Istio's DestinationRule API terminology.
- The request tracing section implied Istio automatically propagates `x-request-id` across the full call chain. Updated it to clarify that applications must forward the header on outgoing requests.

## Review Notes
The examples assume Istio's default text or JSON access log format. Custom `meshConfig.accessLogFormat` settings can change field positions or JSON keys, so the parsing commands may need adjustment in clusters with customized access logs.
