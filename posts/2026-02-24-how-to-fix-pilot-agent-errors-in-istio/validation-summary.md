# Validation Summary: How to Fix Pilot-Agent Errors in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- pilot-agent / Istio agent
- Envoy sidecar proxy
- Istiod
- Kubernetes
- SDS and workload certificates
- Istio sidecar annotations and ProxyConfig
- Istio DNS proxying

## Sources Consulted
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Application Requirements, including sidecar and control plane ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio DNS Proxying guide: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio Debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Debug Endpoints integration guide: https://preliminary.istio.io/latest/docs/ops/integrations/integration-guide/debug-endpoints/
- Istio pilot-discovery command reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio Observability Problems guide, for clock-skew-related troubleshooting context: https://istio.io/latest/docs/ops/common-problems/observability-issues/

## Issues Found
- The post suggested checking Istiod reachability with `curl -s https://istiod.istio-system.svc:15012/debug/connections -k`. Port 15012 is Istiod's secure gRPC XDS/CA port, not a normal HTTP endpoint for that path. I replaced this with `istioctl proxy-status <pod-name>.my-namespace`, which is the supported Istio CLI check for proxy control-plane sync state.
- The post said pilot-agent restarts the container when Envoy dies. Pilot-agent detects Envoy exit, but Kubernetes restarts the sidecar container after the container exits. I corrected the wording.
- The post said `signal: killed` usually means Envoy ran out of memory. That is a common cause, but not the only cause. I changed the wording to "often" to avoid overdiagnosing.
- The bootstrap environment variable check used `env | grep -i istio` but then listed `POD_NAME` and `POD_NAMESPACE`, which that command would not match. I updated the command to `grep -E 'ISTIO|POD_'` and changed "required" variables to "useful" variables because some metadata fields, such as network or mesh ID, depend on installation topology.
- The readiness checks said the endpoint should return HTTP 200, but the command used `curl -s` and did not print the status code. I updated both readiness examples to print the HTTP status code with `curl -s -o /dev/null -w "%{http_code}\n"`.

## Review Notes
Some diagnostic commands depend on tools being present inside the `istio-proxy` image. Distroless proxy images may not include shell utilities such as `ps`, `curl`, `ss`, or `nslookup`; using the debug image, ephemeral containers, or `istioctl` can be necessary in those environments.
