# Validation Summary: How to Debug Istio Control Plane Issues with Logs

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio
- Istiod
- Envoy xDS
- Kubernetes
- kubectl
- istioctl
- Prometheus metrics

## Sources Consulted
- Istio official documentation: Debugging Envoy and Istiod - https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio official command reference: istioctl - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio official documentation: Component logging - https://istio.io/latest/docs/ops/diagnostic-tools/component-logging/
- Istio source: Istiod debug handlers - https://github.com/istio/istio/blob/master/pilot/pkg/xds/debug.go
- Istio source: ControlZ logging scope API - https://github.com/istio/istio/blob/master/pkg/ctrlz/topics/scopes.go

## Issues Found
- The description of `istioctl proxy-status` states was inaccurate for `STALE` and `NOT SENT`. Updated it to match Istio's documentation: `STALE` means Istiod sent an update but has not received an acknowledgement, `NOT SENT` usually means there was nothing to send, and a missing proxy means it is not connected to Istiod.
- The service discovery section used `/debug/endpointz?servicePort=8080` as if it filtered endpoints for a specific service. Istio marks `/debug/endpointz` obsolete and maps it to the endpoint shard dump, and the current handler does not filter by `servicePort`. Replaced it with `/debug/endpointShardz` and described it as checking endpoint shards.
- The Kubernetes endpoint check used only the legacy `endpoints` resource. Updated it to check `EndpointSlice` objects by service label, which is the current Kubernetes endpoint discovery API used in modern clusters.
- The metric command labeled "Number of connected proxies" grepped `pilot_xds_pushes`, which counts xDS pushes. Changed it to grep the `pilot_xds` gauge, which Istio documents as the number of endpoints connected to Pilot using XDS.
- The "Push time" metric used `pilot_proxy_convergence_time`, which is convergence/ack timing rather than the direct xDS push duration metric. Changed it to `pilot_xds_push_time`.
- The CA certificate command assumed the default self-signed CA secret. Added wording to make that scope explicit.
- The `/debug/edsz` comment called it the internal EDS registry. Updated the wording to "internal EDS configuration" to better match Istio's debug handler behavior.

## Review Notes
The post is technically relevant and the remaining commands are consistent with Istio's documented `istioctl` usage, Istiod ControlZ scope APIs, and current debug endpoint handlers. `kubectl` and `istioctl` were not installed in the local environment, so CLI syntax was checked against official references and Istio source rather than local `--help` output.
