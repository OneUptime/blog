# Validation Summary: Run Cilium Status Checks

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Cilium CNI
- Cilium CLI (external `cilium-cli` and in-agent CLI / `cilium-dbg`)
- Hubble (observability layer)
- eBPF / BPF datapath
- Kubernetes (kubectl, DaemonSet exec)
- bpftool

## Sources Consulted
- Cilium CLI reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- `cilium-dbg bpf` subcommand reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf/
- `cilium-dbg map` subcommand reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_map/
- `cilium-dbg policy get` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_policy_get/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found

1. **In-agent commands shown without `kubectl exec` wrapping.** Steps 2, 3, and 4 used commands like `cilium endpoint list`, `cilium bpf ct list global`, `cilium policy get`, and `cilium monitor` as if they were part of the external `cilium-cli`. These are commands provided by the in-agent CLI (named `cilium`, aliased to `cilium-dbg` in 1.16+) which lives inside the Cilium agent pod. They will not run from a developer workstation that only has `cilium-cli` installed. Fixed by prefixing each in-agent invocation with `kubectl exec -n kube-system ds/cilium --` to match Step 5's pattern, and added a one-line note in Step 2 explaining the distinction.

2. **`cilium bpf map list` is not a valid command.** Cilium's `bpf` subcommand does not have a `map` subcommand; the documented map-inspection command is `cilium map list` (under the top-level `map` group, which exposes `list`, `get`, and `events`). Replaced `cilium bpf map list` with `cilium map list` in Step 3, in the Best Practices section, and in the Conclusion.

3. **`cilium bpf prog list` does not exist.** There is no `prog` subcommand under `cilium bpf`. Valid `cilium bpf` subcommands include `bandwidth`, `config`, `ct`, `endpoint`, `fs`, `ipcache`, `ipmasq`, `lb`, `metrics`, `multicast`, `nat`, `policy`, `sha`, `vtep`, etc. Replaced with `bpftool prog list` (the standard kernel BPF inspection tool, run on the node), which is the correct way to list loaded eBPF programs.

4. **`cilium policy get --name <policy-name> -n <namespace>` is incorrect.** The `cilium policy get` command does not accept `--name` or `-n` flags; it accepts only `-o/--output` (and `--help`) and takes optional label selectors as positional arguments. Replaced with `kubectl get cnp <policy-name> -n <namespace> -o yaml`, which is the correct way to inspect a specific CiliumNetworkPolicy by name and namespace.

## Review Notes

- The post's `cilium status` ASCII output is a representative example; the exact glyphs and components shown vary by Cilium version and installed features (e.g., Envoy DaemonSet only appears when Envoy is deployed as a separate DaemonSet, which is the default from 1.16+).
- Since Cilium 1.16 the in-agent binary was renamed to `cilium-dbg` to disambiguate it from the external `cilium-cli`. A `cilium` shim is still present inside the agent pod for backwards compatibility, so the post's `kubectl exec ... -- cilium ...` invocations continue to work; future revisions may want to switch to `cilium-dbg` explicitly.
- `kubectl exec -n kube-system ds/cilium -- ...` targets one pod of the DaemonSet (kubectl picks one). For diagnostics that must run on a specific node, the author may want to mention selecting the pod by node, e.g. via `kubectl get pod -n kube-system -l k8s-app=cilium -o wide` and then targeting that pod by name.
- `cilium policy get` is marked deprecated in the latest reference docs; viewing policies via `kubectl get cnp/ccnp` (Kubernetes-side) is the more durable approach going forward.
