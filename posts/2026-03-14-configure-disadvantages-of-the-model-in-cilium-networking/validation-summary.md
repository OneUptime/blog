# Validation Summary: Configuring Disadvantages of the Encapsulation Model in Cilium

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF kube-proxy replacement
- VXLAN encapsulation and MTU configuration

## Sources Consulted
- Cilium routing documentation, encapsulation mode and VXLAN MTU overhead: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium v1.16.5 Helm values source, including `MTU`, `bpf.ctTcpMax`, `nodePort.enabled`, `kubeProxyReplacement`, `routingMode`, and `loadBalancer` values: https://raw.githubusercontent.com/cilium/cilium/v1.16.5/install/kubernetes/cilium/values.yaml
- Cilium kube-proxy replacement documentation, including NodePort and DSR/load balancer mode behavior: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium CLI connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium debug BPF config command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_config_list.html
- Kubernetes `kubectl exec` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The Helm value `mtu` was incorrect for the referenced Cilium 1.16.5 chart. Changed it to `MTU`, which is the chart value used in Cilium 1.16.5.
- The NodePort DSR configuration used `nodePort.mode: dsr`, which is not a valid Cilium Helm value. Replaced it with `kubeProxyReplacement: "true"` and `nodePort.enabled: true` to enable Cilium's eBPF kube-proxy replacement and NodePort implementation.
- The BPF connection tracking value `bpf.ctTCPMax` used incorrect casing. Changed it to `bpf.ctTcpMax`, matching the Cilium Helm chart.
- The native routing comment included the obsolete `tunnel: disabled` style. Removed it and left the current `routingMode: native` option.
- The Helm upgrade command referenced `cilium-values.yaml`, while the snippet defines `cilium-encap-mitigate-values.yaml`. Updated the command to use the matching filename and added `--reuse-values` so the partial override file does not unintentionally reset unrelated chart values.
- The BusyBox test command used GNU-style `wget --timeout=5`. Changed it to BusyBox-compatible `wget -T 5`.
- The BPF runtime config command used `cilium bpf config list`; current Cilium agent debugging command references use `cilium-dbg bpf config list`. Updated the command accordingly.
- The connectivity test passed multiple test selectors as one comma-separated value. Changed it to repeated `--test` flags, matching the documented string-array flag behavior.
- The endpoint inspection command used `cilium endpoint list` as if it were available from the workstation Cilium CLI. Updated it to run `cilium-dbg endpoint list` inside the Cilium DaemonSet.

## Review Notes
The core explanation that VXLAN encapsulation adds 50 bytes of overhead and reduces effective MTU is consistent with Cilium documentation. Native routing can reduce encapsulation overhead, but it requires the underlying network to route PodCIDRs correctly; the post already notes that topology dependency in troubleshooting.
