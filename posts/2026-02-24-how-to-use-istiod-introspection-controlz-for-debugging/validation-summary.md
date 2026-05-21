# Validation Summary: How to Use Istiod Introspection (ControlZ) for Debugging

## Status
validated

## Post Type
Technical guide / debugging tutorial

## Technologies Covered
- Istio
- Istiod
- ControlZ
- istioctl
- kubectl
- Kubernetes NetworkPolicy
- Go runtime diagnostics

## Sources Consulted
- Istio Istiod Introspection docs: https://istio.io/latest/docs/ops/diagnostic-tools/controlz/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debug endpoints integration guide: https://preliminary.istio.io/latest/docs/ops/integrations/integration-guide/debug-endpoints/
- Istio security best practices for control-plane ports: https://preliminary.istio.io/latest/docs/ops/best-practices/security/
- Istio harden Docker container images docs: https://istio.io/latest/docs/ops/configuration/security/harden-docker-images/
- Istio ControlZ source: https://github.com/istio/istio/tree/master/pkg/ctrlz
- Istio XDS debug endpoint source: https://github.com/istio/istio/blob/master/pilot/pkg/xds/debug.go

## Issues Found
- The ControlZ REST API examples used camelCase fields (`outputLevel`, `stackTraceLevel`, `logCallers`). Current Istio ControlZ JSON uses snake_case fields (`output_level`, `stack_trace_level`, `log_callers`), so the examples would not update log levels as written. Updated all payloads and the example response.
- The logging scope list included scopes that are not present in current Istio (`networking`, `grpcAdapter`). Replaced them with current scopes such as `authn`, `kube`, and `push`, and updated the VirtualService debugging example to use `push` or `ads`.
- The debug endpoint examples included endpoints that are not present in current Istio (`/debug/config_distribution`, `/debug/authenticationz`) and used the obsolete `/debug/endpointz`. Replaced them with current endpoints: `/debug/adsz`, `/debug/authorizationz`, and `/debug/endpointShardz`.
- The "list all debug endpoints" command used `/debug`, which returns the HTML debug index rather than JSON. Updated it to `/debug/list` so the surrounding statement about JSON output is correct.
- The security section implied debug endpoints are only reachable through port-forwarding or from inside the Istiod pod. Updated it to reflect current Istio behavior: debug endpoints require authentication for non-localhost requests by default.
- The `kubectl exec ... curl` examples depend on `curl` being present in the Istiod container. Added a distroless-image caveat and pointed readers to the port-forwarding form when `curl` is unavailable.

## Review Notes
The post remains accurate as a practical Istiod debugging guide after the fixes. The debug endpoint authentication details are current for recent Istio versions but may differ in older installations where `ENABLE_DEBUG_ENDPOINT_AUTH=false` is configured.
