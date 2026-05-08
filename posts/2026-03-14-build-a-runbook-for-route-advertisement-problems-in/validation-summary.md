# Validation Summary: Building a Runbook for Route Advertisement Problems in Calico BGP

## Status
validated

## Post Type
Operational runbook / troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BIRD
- Linux routing
- IPIP and VXLAN encapsulation
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico `calicoctl node status` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico troubleshooting and diagnostics documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico troubleshooting commands documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico system requirements for required ports and interfaces: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging task guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- BusyBox command documentation for `wget` option compatibility: https://busybox.net/downloads/BusyBox.html

## Issues Found
- The BusyBox client command used `wget --timeout=5`. BusyBox `wget` commonly documents the short timeout form as `-T SEC`, so the command was changed to `wget -qO- -T 5` in both connectivity checks.
- The BIRD diagnostic command selected the first `calico-node` pod in the namespace, which could inspect the wrong node during a node-specific BGP incident. It now selects the `calico-node` pod scheduled on `FAILING_NODE` and explicitly targets the `calico-node` container.
- The Calico namespace was hard-coded in all BGP diagnostics. The command block now uses `CALICO_NS=calico-system` and notes that non-operator-managed installs may use `kube-system`.
- The runbook treated VXLAN tunnel checks as part of Calico BGP route-advertisement troubleshooting. Calico documentation states that VXLAN-only overlays do not use BGP, so the BGP path now focuses on IPIP and points VXLAN-only clusters to separate VXLAN/UDP 4789 troubleshooting.
- The BGP configuration checklist said `asNumber` should be consistent across the cluster. Calico supports default and per-node AS numbers, so the text now says to verify the expected default local AS number while accounting for per-node overrides.
- The IP pool checklist and missing-routes troubleshooting omitted `disableBGPExport`, which directly controls whether an IP pool's routes are exported over BGP. The post now includes that field.

## Review Notes
The remaining commands are valid as a generic runbook, but several are environment-dependent: operator-managed and manifest-based Calico installations may use different namespaces, and `kubectl debug node/...` behavior depends on RBAC, cluster policy, and the debug image capabilities. The initial connectivity test still requires the operator to confirm the two test pods landed on different nodes before interpreting the result as a cross-node failure.
