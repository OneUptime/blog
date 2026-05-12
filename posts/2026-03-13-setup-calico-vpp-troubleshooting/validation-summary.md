# Validation Summary: How to Set Up Calico VPP Troubleshooting Step by Step

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico VPP (projectcalico/vpp-dataplane)
- VPP (Vector Packet Processing) and `vppctl` CLI
- Kubernetes (kubectl, DaemonSet, ConfigMap)
- DPDK / SR-IOV
- VPP packet tracing (`trace add`, dpdk-input, virtio-input nodes)
- VPP FIB / NAT44 / IP neighbor subsystems

## Sources Consulted
- Calico VPP data plane troubleshooting docs: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico VPP technical details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP DaemonSet manifest: https://github.com/projectcalico/vpp-dataplane/blob/master/yaml/base/calico-vpp-daemonset.yaml
- Calico VPP agent/manager config source: https://github.com/projectcalico/vpp-dataplane/blob/master/config/config.go
- FD.io VPP CLI reference: https://s3-docs.fd.io/vpp/24.10/cli-reference/index.html

## Issues Found

1. **Wrong pod selector label.** Step 1 used `-l app=calico-vpp-node`, but the upstream DaemonSet manifest sets the label as `k8s-app: calico-vpp-node` (both on the pod template and the selector). The `app=` form would return no pods. Changed the selector to `-l k8s-app=calico-vpp-node`.

2. **Non-existent environment variable in the debug ConfigMap.** Step 5 set `CALICOVPP_DEBUG_ENABLE: "true"`, but no such variable is defined in `config/config.go`. The actual debug variable is `CALICOVPP_DEBUG` and it expects a JSON object (`CalicoVppDebugConfigType` with fields like `servicesEnabled`, `gsoEnabled`), not a boolean string. `CALICOVPP_LOG_LEVEL` is the real knob for raising verbosity (parsed by `logrus.ParseLevel`, so valid values are `panic`/`fatal`/`error`/`warn`/`info`/`debug`/`trace`). Removed the bogus `CALICOVPP_DEBUG_ENABLE` line, kept `CALICOVPP_LOG_LEVEL: "debug"`, and added a note that the live ConfigMap must be patched (not replaced) because it already carries `CALICOVPP_INTERFACES`, `CALICOVPP_INITIAL_CONFIG`, and `CALICOVPP_CONFIG_TEMPLATE`.

## Review Notes
- Container names (`vpp` and `agent`) and namespace (`calico-vpp-dataplane`) are correct per the upstream DaemonSet.
- VPP CLI commands used (`show version`, `show interface`, `show interface addr`, `show ip fib`, `show ip neighbor`, `show nat44 sessions`, `trace add <node> <count>`, `show trace`, `clear trace`) are all valid VPP CLI syntax. Both `show ip neighbor` (singular) and `show ip neighbors` (plural) are accepted by VPP.
- `trace add virtio-input 100` is correct for tap interfaces (VPP drives Linux taps via the virtio driver). For pod-side memif interfaces the equivalent input node is `memif-input`, and for tun-mode pod interfaces it is `tun-input` — worth mentioning in a future revision if the cluster is configured with memif/tun rather than the default tap setup.
- The official maintained helper script `calivppctl` (ships with the VPP image) provides shortcuts like `calivppctl vppctl <node>` and `calivppctl log -vpp <node>`. Not strictly required for this post, but worth pointing readers to in a follow-up.
