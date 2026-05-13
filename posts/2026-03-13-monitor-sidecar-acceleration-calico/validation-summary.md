# Validation Summary: How to Monitor Sidecar Acceleration in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (eBPF dataplane, sidecar acceleration)
- Kubernetes (kubectl, DaemonSet exec)
- eBPF / bpftool
- Service mesh sidecars (Istio Envoy, Linkerd)
- gRPC load testing (`ghz`)
- `calicoctl` / Felix configuration

## Sources Consulted
- [Accelerate Istio network performance — Calico Documentation](https://docs.tigera.io/calico/latest/networking/configuring/sidecar-acceleration)
- [Enabling the eBPF data plane — Calico Documentation](https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf)
- [Troubleshoot eBPF mode — Calico Documentation](https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf)
- [Configuring Felix — Calico Enterprise Documentation](https://docs.tigera.io/calico-enterprise/latest/reference/component-resources/node/felix/configuration)
- [ghz — gRPC benchmarking and load testing tool](https://ghz.sh/)
- [LesnyRumcajs/grpc_bench on GitHub](https://github.com/LesnyRumcajs/grpc_bench)

## Issues Found
1. **Invalid `calico-node` flag.** The original command `calico-node -show-bpf-map-sizes` is not a real flag. The Calico BPF inspection CLI is invoked as `calico-node -bpf <subcommand>` (real subcommands include `counters`, `conntrack`, `ipsets`, `nat`, `routes`, `ifstate`, etc.). Replaced with `calico-node -bpf counters dump` to inspect eBPF counters maintained by Felix.

2. **Incorrect verification command.** The original `kubectl exec test-pod -- cat /proc/net/if_inet6` does not verify that Calico eBPF acceleration is active — that kernel file only lists IPv6 interfaces and scope flags. Replaced with `calico-node -bpf ifstate dump`, which actually shows the eBPF program attachments on the node's interfaces.

3. **Missing `sidecarAccelerationEnabled` check.** Sidecar acceleration is a distinct FelixConfiguration field (`sidecarAccelerationEnabled`), separate from the general `bpfEnabled` flag. Extended the grep to include both fields so the verification matches the actual feature toggle.

4. **Non-standard benchmarking tool.** `grpc_bench` exists (LesnyRumcajs/grpc_bench) but it is a multi-language comparative benchmarking harness, not a single CLI you exec inside a pod. The standard standalone gRPC load tool is `ghz`. Replaced with a realistic `ghz` invocation (`--insecure -n 10000 --call helloworld.Greeter/SayHello`).

5. **eBPF program name prefix.** `bpftool prog show | grep calico` would miss most of Calico's eBPF programs because they use the `cali`/`cali_` prefix (e.g. `cali_tc_preambl`, `calico_tc_skb_ipv4_frag`), not a uniform `calico` prefix. Changed the grep to `grep -E 'cali'` so it matches both forms.

## Review Notes
- Per Tigera's own documentation, sidecar acceleration is **disabled by default and described as a development feature for evaluation purposes**, not recommended for production. The post's framing as "one of the most impactful performance optimizations" is more enthusiastic than the upstream guidance — readers should treat this as a lab/test-environment optimization.
- Sidecar acceleration is specifically designed for **Istio Envoy** sidecars (it uses eBPF sockmap/sockops to short-circuit local TCP between the app and Envoy on the same pod). The prerequisite list mentions Linkerd as an example, but the upstream feature targets Istio; Linkerd's proxy is not covered by Calico's sockmap acceleration in the documented way.
- The "30–50% latency improvement" figure in the introduction is an order-of-magnitude plausible claim for sockmap-style short-circuits but is not cited; results will vary significantly by workload.
- Sidecar acceleration uses `sockops`/`sk_msg` BPF program types attached to a cgroup, which is a different attach point from the Calico eBPF dataplane's TC programs — so `bpftool prog show` will list both kinds when both are active, and the `ifstate dump` only reflects the TC-attached dataplane programs.
