# Validation Summary: Troubleshooting Cilium Masquerading

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium masquerading / SNAT
- Cilium CLI and cilium-dbg
- Hubble
- Kubernetes kubectl
- eBPF/BPF maps
- iptables NAT

## Sources Consulted
- Cilium Masquerading documentation: https://docs.cilium.io/en/stable/concepts/networking/masquerading/
- Cilium CLI status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI config command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- cilium-dbg command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium-dbg/
- cilium-dbg status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- cilium-dbg monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- cilium-dbg bpf nat list command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list.html
- cilium-dbg bpf ipmasq list command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ipmasq_list.html
- cilium-dbg bpf ct list command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium Helm Reference: https://docs.cilium.io/en/latest/helm-reference/
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The data-path inspection section used `cilium bpf tunnel list` as a BPF program check. That command is not the current daemon debug interface and tunnel state is not the right primary masquerading signal. Replaced it with `cilium-dbg status | grep Masquerading`, `cilium-dbg bpf nat list`, and `cilium-dbg bpf ipmasq list`.
- Several daemon-local Cilium commands used the cluster-management `cilium` CLI (`cilium monitor`, `cilium endpoint`, and `cilium metrics`). Current Cilium command references expose these as `cilium-dbg` commands inside the Cilium agent pod, so the examples were updated to use `kubectl exec ... -c cilium-agent -- cilium-dbg ...`.
- The pod-to-service connectivity test used HTTP against `kubernetes.default.svc:443`. The Kubernetes API service on port 443 is HTTPS, so the command was corrected to use `https://` with `curl -k`.
- The external connectivity example used plain HTTP to `1.1.1.1`, which is not a reliable HTTP endpoint. Updated it to use Cloudflare's HTTPS trace endpoint on `1.1.1.1`.
- The Hubble policy-verdict example used `--type policy-verdict`. Cilium's monitor event-type filter is documented as `-t, --type`, and Cilium examples commonly use `-t policy-verdict`, so the command was updated.
- The verification section used `cilium endpoint list`, which is not part of the reviewed Cilium cluster-management CLI reference. Updated it to use `cilium-dbg endpoint list` through the Cilium agent pod.
- The troubleshooting section referenced `cilium bpf ct list global` and `cilium bpf prog list`, which were not valid current commands in the reviewed references. Updated the CT map command to `cilium-dbg bpf ct list`, named the relevant `bpf.ctTcpMax` and `bpf.ctAnyMax` Helm values, and replaced the unsupported program-complexity advice with current metrics and daemon status checks.

## Review Notes
The guide is technically relevant and accurate after the command corrections. The examples are intentionally generic and require readers to substitute existing workload labels such as `app=target` in their own cluster.
