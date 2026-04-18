# Validation Summary: How to Configure VXLAN Overlay in Rancher

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rancher / RKE2
- VXLAN (Virtual Extensible LAN)
- Flannel CNI
- Calico CNI (Tigera Operator)
- Kubernetes pod networking
- Linux iproute2 (`ip link`, `bridge fdb`)
- iptables
- tcpdump

## Sources Consulted
- RKE2 networking / helm customization docs: https://docs.rke2.io/helm and https://docs.rke2.io/networking/basic_network_options
- rke2-canal chart values: https://github.com/rancher/rke2-charts/blob/main-source/packages/rke2-canal/charts/values.yaml
- Flannel backends documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Calico Installation operator API (`operator.tigera.io/v1`): https://docs.tigera.io/calico/latest/reference/installation/api
- RFC 7348 (VXLAN)
- Linux kernel VXLAN driver (UDP 8472 historical default vs. IANA 4789)

## Issues Found
- **RKE2 Helm resource kind** (Step 1): The example used `kind: HelmChart`, which deploys a new chart. To customize the built-in `rke2-canal` chart, the correct resource is `kind: HelmChartConfig`. Updated accordingly.
- **rke2-canal values structure** (Step 1): The example used flat top-level keys `flannel_backend: "vxlan"` and `flannel_iface: "eth0"`. The actual `rke2-canal` chart `values.yaml` uses a nested structure under a `flannel:` key (`flannel.backend`, `flannel.iface`). Updated to nested form.
- **Comment accuracy** (Step 1): The comment "Or in RKE2 HelmChart for Flannel" was misleading since `rke2-canal` is the Canal chart (Calico + Flannel). Rewrote the comment to clarify.

## Review Notes
- VXLAN 50-byte overhead claim is correct (outer IPv4 20 + UDP 8 + VXLAN 8 + inner Ethernet 14 = 50). Some sources cite 54 bytes when including the outer Ethernet header; the author's framing matches how Flannel/Calico derive their MTU (1500 − 50 = 1450), so it is internally consistent.
- Default UDP ports (Flannel 8472, Calico VXLAN 4789) are correct. 8472 is the Linux kernel historical default; 4789 is the IANA-assigned port per RFC 7348.
- `flannel.1` interface naming (VNI 1) and `bridge fdb show dev flannel.1` syntax are correct.
- Calico `Installation` config (`operator.tigera.io/v1`, `blockSize: 26`, `encapsulation: VXLAN`, `natOutgoing: Enabled`, `nodeSelector: all()`) is valid for the current Tigera operator.
- RKE2 `cni: flannel` + `flannel-backend: vxlan` config.yaml keys are valid; `vxlan` is the default backend when flannel is selected.
- Minor future caveat: RKE2 Flannel supports only `vxlan` and `wireguard-native` backends (not `host-gw`), so the host-gw comparison in the intro applies to upstream Flannel / k3s more than RKE2 itself. Not a technical error, just worth noting for readers deploying on RKE2 specifically.
