# Validation Summary: Troubleshooting Encapsulation in Cilium Networking

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- VXLAN
- Geneve
- Hubble
- eBPF/BPF maps
- Linux networking tools

## Sources Consulted
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium debug CLI command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- cilium-dbg monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- cilium-dbg BPF CT list command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Linux bpftool program documentation: https://kernel.googlesource.com/pub/scm/linux/kernel/git/jolsa/perf/+/refs/heads/bpf/license/tools/bpf/bpftool/Documentation/bpftool-prog.rst

## Issues Found
- The post used `cilium bpf tunnel list`, `cilium monitor`, `cilium endpoint list`, and `cilium metrics list` inside Cilium agent pods. Current Cilium documentation uses `cilium-dbg` for in-agent datapath and daemon inspection commands, so these commands were changed to `cilium-dbg`.
- The data path command comment said "Check BPF program status" while the command lists tunnel map entries, not loaded BPF programs. The comment was corrected.
- The configuration grep checked for `encap`, which is not the documented current configuration key family. It was changed to check `routing-mode` and `tunnel` options.
- The pod-to-service curl example used `http://kubernetes.default.svc:443`, which mixes HTTP with the Kubernetes API server HTTPS port. It was changed to `https://kubernetes.default.svc:443` with `-k` for a connectivity-oriented test.
- The verification section used `cilium endpoint list`, which is not part of the Kubernetes-facing Cilium CLI. It was changed to run `cilium-dbg endpoint list` in a Cilium pod.
- The troubleshooting section used outdated or invalid `cilium bpf` commands for connection tracking and BPF programs. These were changed to current `cilium-dbg bpf ct list`, `cilium-dbg map list`, documented Helm values for CT/map sizing, and `bpftool prog show` for loaded BPF programs.

## Review Notes
The main Cilium encapsulation explanation is accurate: Cilium defaults to VXLAN encapsulation when no routing configuration is provided, supports VXLAN and Geneve, and uses UDP 8472 and UDP 6081 respectively by default. Some diagnostic commands assume the Cilium pod includes the relevant debug tools and that `kubectl exec ds/cilium` selects a suitable agent pod; in larger clusters, operators may still prefer selecting the specific Cilium pod on the affected node.
