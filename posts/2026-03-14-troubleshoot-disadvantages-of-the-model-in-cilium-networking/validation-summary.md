# Validation Summary: Troubleshooting Disadvantages of the Encapsulation Model in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- eBPF/BPF datapath debugging
- VXLAN encapsulation

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium debug CLI command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium debug CLI command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium debug CLI command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium debug CLI command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Kubernetes `kubectl debug` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The post used the external `cilium` CLI for in-agent datapath inspection commands such as `cilium bpf tunnel list`, `cilium monitor`, `cilium endpoint list`, and `cilium metrics list`. Current Cilium documentation uses `cilium-dbg` for these commands inside Cilium agent pods, so the commands were updated accordingly.
- The pod-to-service connectivity test used plain HTTP against `kubernetes.default.svc:443`. Port 443 is HTTPS, so the command was corrected to use `https://` with `curl -k`.
- The verification section used `cilium endpoint list`, which is not part of the external Cilium CLI command set. It was changed to execute `cilium-dbg endpoint list` inside the Cilium DaemonSet.
- The BPF map troubleshooting note used `cilium bpf ct list global`, but the current documented syntax is `cilium-dbg bpf ct list [cluster <identifier>]`. The command and sizing recommendation were updated to match current Cilium configuration names.
- The BPF program troubleshooting note used `cilium bpf prog list`, which is not a current documented Cilium debug CLI command. It was changed to `bpftool prog show` for loaded BPF program inspection.

## Review Notes
The guide is broadly accurate for Cilium encapsulation troubleshooting. Some commands still assume Cilium is installed in `kube-system` and that `kubectl exec` can select an appropriate Cilium DaemonSet pod; clusters with custom namespaces, labels, or multiple Cilium containers may need namespace, selector, or container-name adjustments.
