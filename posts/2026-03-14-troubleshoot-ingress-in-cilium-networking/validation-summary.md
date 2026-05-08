# Validation Summary: Troubleshooting Ingress in Cilium Networking

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium Ingress Controller
- Cilium Gateway API support
- Cilium CLI and cilium-dbg
- Hubble
- Kubernetes kubectl
- eBPF/BPF maps
- Envoy

## Sources Consulted
- Cilium Kubernetes Ingress Support: https://docs.cilium.io/en/stable/network/servicemesh/ingress/
- Cilium Gateway API Support: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gateway-api/
- Cilium CLI status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI config command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- cilium-dbg monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- cilium-dbg bpf ct list command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium Helm Reference: https://docs.cilium.io/en/latest/helm-reference/
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium policy verdict examples with Hubble: https://docs.cilium.io/en/stable/security/policy-creation/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The introduction attributed header manipulation directly to Cilium Ingress. Cilium documentation describes Ingress as supporting HTTP/HTTPS routing and TLS behavior, while Gateway API provides native request/response manipulation such as header modification. Updated the wording to distinguish Ingress from Gateway API capabilities.
- Several in-pod Cilium daemon/debug commands used the cluster-management `cilium` CLI (`cilium bpf`, `cilium monitor`, `cilium endpoint`, and `cilium metrics`). Current Cilium command references expose these daemon-level commands as `cilium-dbg`, so the examples were updated to use `kubectl exec ... -c cilium-agent -- cilium-dbg ...`.
- The BPF tunnel-map example was not a current command in the reviewed Cilium command reference. Replaced it with `cilium-dbg bpf lb list`, which is relevant to ingress/service load-balancing inspection.
- The pod-to-service connectivity test used HTTP against `kubernetes.default.svc:443`. The Kubernetes API service on port 443 is HTTPS, so the command was corrected to use `https://` with `curl -k`.
- The external connectivity example used plain HTTP to `1.1.1.1`, which is not a reliable HTTP endpoint. Updated it to use Cloudflare's HTTPS trace endpoint on `1.1.1.1`.
- The Hubble policy-verdict example used `--type policy-verdict`. Cilium's policy-verdict examples use the `-t policy-verdict` event-type filter, so the command was updated.
- The verification section used `cilium endpoint list`, which is not part of the reviewed Cilium cluster-management CLI reference. Updated it to use `cilium-dbg endpoint list` through the Cilium agent pod.
- The troubleshooting section referenced `cilium bpf ct list global` and `cilium bpf prog list`, which were not valid current commands in the reviewed references. Updated the CT map command to `cilium-dbg bpf ct list` and replaced the unsupported program-complexity advice with current metrics and status checks.

## Review Notes
The guide is technically relevant and generally accurate after the command corrections. Some examples remain intentionally generic, such as `app=target`, and require readers to substitute labels that exist in their own cluster.
