# Validation Summary: Diagnosing Test Configuration Issues in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Hubble
- eBPF/BPF tooling
- iperf3
- jq

## Sources Consulted
- Cilium command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference for `cilium-dbg status`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium command reference for `cilium-dbg bpf nat list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list.html
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium performance tuning guide: https://docs.cilium.io/en/stable/operations/performance/tuning.html
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Flow API documentation: https://docs.cilium.io/en/stable/_api/v1/flow/README.html
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7.html

## Issues Found
- The post used `cilium config view`, which is not part of the current external Cilium CLI documented for Kubernetes management. Changed configuration collection to read the `cilium-config` ConfigMap with `kubectl`.
- The post used agent-local commands such as `cilium bpf`, `cilium endpoint`, and `cilium monitor`. Current Cilium documentation exposes these as `cilium-dbg` commands, typically run inside the Cilium agent pod. Updated the examples to run `cilium-dbg` through `kubectl -n kube-system exec ds/cilium -c cilium-agent --`.
- The audit grep patterns referenced configuration names that do not match current Cilium ConfigMap/Helm naming. Updated them to current keys such as `routing-mode`, `tunnel-protocol`, `bpf-host-legacy-routing`, `kube-proxy-replacement`, and `loadbalancer-acceleration`.
- The Helm example used the obsolete `tunnel=disabled` value. Current Helm documentation uses `routingMode=native` and `tunnelProtocol` for tunneling behavior. Removed `tunnel=disabled`.
- The Helm example enabled BPF host routing without also enabling BPF masquerading. Cilium's tuning guide lists eBPF masquerading and kube-proxy replacement as requirements for eBPF host routing. Added `--set bpf.masquerade=true`.
- The Hubble JSON examples selected fields at the top level, but `hubble observe -o json` wraps flow data under `.flow`. Updated the `jq` filters to use `.flow.verdict`, `.flow.source`, `.flow.destination`, and `.flow.drop_reason_desc`.
- The verification text said all items should show `PASS`, but `cilium status` reports status values such as OK rather than PASS. Updated the wording.
- The bpftrace example grouped by `args->action`, which is not portable across kernel tracepoint formats. Changed it to group by `probe` for a safer generic xdp_redirect count example.

## Review Notes
The performance-impact percentages in the post are workload-dependent and should be treated as illustrative benchmark ranges rather than universal guarantees. Native routing also requires an underlay capable of routing PodCIDRs, so the Helm example now states that requirement.
