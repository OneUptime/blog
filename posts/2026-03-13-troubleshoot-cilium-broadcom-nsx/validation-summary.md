# Validation Summary: Troubleshoot Cilium with Broadcom NSX

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- Broadcom NSX / VMware NSX
- Geneve and VXLAN overlays
- eBPF

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium ConfigMap configuration documentation: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium command reference for `cilium-dbg monitor`, `status`, and `debuginfo`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_debuginfo/
- Cilium CLI reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- Replaced references to the old `tunnel: disabled` style with `routing-mode: native` and `ipv4-native-routing-cidr`, which match current Cilium routing configuration documentation.
- Updated Cilium in-agent commands from `cilium` to `cilium-dbg` for `monitor`, `status`, and `debuginfo`, matching the current command reference for commands run inside the Cilium agent pod.
- Corrected the Cilium kernel requirement from `4.9+` to `5.10+ or an equivalent vendor kernel`, matching current Cilium system requirements.
- Fixed `kubectl run` examples to use `--command --` where the post intends to override the container command with `sleep` or `ping`.
- Changed the MTU test image from BusyBox to `nicolaka/netshoot` because the example uses `ping -M do`, which is an iputils-style option that is not consistently available in BusyBox ping.
- Replaced the pod IP extraction command with a JSONPath query so it reliably reads `.status.podIP` instead of depending on a fragile `kubectl get pods -o wide` column number.
- Updated the NSX Manager navigation note from older logical-switch wording to current segment and segment-port terminology.

## Review Notes
- The guidance to use native routing assumes the NSX-backed network can route Kubernetes PodCIDRs or that appropriate node routes are installed. `auto-direct-node-routes` is only appropriate when nodes have direct L2 reachability; routed multi-segment NSX designs may need explicit routing or a routing control plane instead.
