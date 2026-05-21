# Validation Summary: How to Create Runbooks Based on Istio Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Istio CLI (`istioctl`) and Pilot agent (`pilot-agent`)
- Kubernetes CLI (`kubectl`)
- Prometheus and PromQL
- Python
- Markdown runbooks
- TLS certificates and OpenSSL

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl describe diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Prometheus promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/

## Issues Found
- Replaced the outdated `istioctl authn tls-check` command with `istioctl experimental describe pod`, which is the current Istio diagnostic command documented for checking strict mTLS and TLS conflicts.
- Corrected `istioctl proxy-config` workload references from `deploy/...` to `deployment/...` so the examples match the current Istio command reference.
- Fixed malformed Markdown fencing around the Python example by using a four-backtick outer fence. The original fence would close early because the Python string literals contain Markdown code fences.
- Fixed generated runbook Markdown in the Python script by changing closing code fences from ```` ```bash ```` to ```` ``` ````.
- Updated the generator to derive the service name from the VirtualService host instead of assuming the VirtualService object name is also the Kubernetes Service and Deployment name.
- Updated DestinationRule matching in the generator to compare against VirtualService hosts instead of checking whether the VirtualService object name appears inside the DestinationRule host.

## Review Notes
The `kubectl get endpoints` command remains technically valid, but Kubernetes EndpointSlice resources are preferred for newer large-scale clusters. The post uses conventional `app=<service>` labels and matching Deployment names; generated runbooks may still need manual adjustment in environments with different labeling or workload naming conventions.
