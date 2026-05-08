# Validation Summary: Configuring Cilium Masquerading

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF masquerading
- iptables masquerading
- Cilium CLI
- kubectl

## Sources Consulted
- Cilium masquerading documentation: https://docs.cilium.io/en/stable/concepts/networking/masquerading/
- Cilium 1.16.5 Helm values reference from the official Cilium repository: https://raw.githubusercontent.com/cilium/cilium/v1.16.5/install/kubernetes/cilium/README.md
- Cilium 1.16.5 Helm chart values from the official Cilium repository: https://raw.githubusercontent.com/cilium/cilium/v1.16.5/install/kubernetes/cilium/values.yaml
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Cilium `cilium-dbg bpf config list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_config_list/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/

## Issues Found
- The Helm values block was labeled `cilium-masquerade-values.yaml`, but the `helm upgrade` command applied `cilium-values.yaml`. Updated the command to use `cilium-masquerade-values.yaml` so the example applies the file it just created.
- The comment above `ipMasqAgent.enabled: false` implied it configured masquerade CIDRs. Updated it to clarify that enabling the eBPF ip-masq-agent is only needed for multiple exclusion CIDRs.
- The comment above `ipv4NativeRoutingCIDR` described a generic non-masquerade CIDR. Updated it to match Cilium's documented native routing CIDR semantics: traffic to that pre-routed network is not SNATed.
- The BPF configuration inspection command used `cilium bpf config list`, but the documented in-agent command is `cilium-dbg bpf config list`. Updated the command accordingly.
- The `cilium connectivity test --test pod-to-pod,pod-to-service` example used a comma-separated selector that is not the documented Cilium CLI syntax. Updated it to use two `--test` flags with scenario selectors: `/pod-to-pod` and `/pod-to-service`.
- The endpoint inspection command used `cilium endpoint list`, but endpoint listing is documented under the in-agent `cilium-dbg endpoint list` command. Updated the command to execute `cilium-dbg endpoint list` in the Cilium DaemonSet.

## Review Notes
The Helm values are valid for Cilium 1.16.5, and the high-level explanation of IPv4 masquerading, eBPF-based masquerading, and iptables-based masquerading matches the official Cilium documentation. The example `ipv4NativeRoutingCIDR: "10.0.0.0/8"` is syntactically valid, but operators must replace it with a CIDR that is actually routed by their environment; setting it too broadly can intentionally disable SNAT for destinations that the underlay cannot route back to pod IPs.
