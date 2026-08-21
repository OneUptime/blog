# Validation Summary: Calculate Flannel VXLAN MTU for Clouds, VLANs, and VPNs

## Status
validated

## Post Type
Technical Guide / Networking Troubleshooting Guide

## Technologies Covered
- Kubernetes
- Flannel v0.28.9
- Flannel CNI plugin v1.9.1-flannel3
- Linux VXLAN
- IPv4 and IPv6 Path MTU Discovery
- VLAN, VPN, and nested-tunnel networking
- `kubectl`, iproute2, and iputils

## Sources Consulted
- [Flannel v0.28.9 release](https://github.com/flannel-io/flannel/releases/tag/v0.28.9), [backend documentation](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/backends.md#vxlan), [configuration reference](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md), and [MTU troubleshooting guidance](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/troubleshooting.md#data-plane).
- Flannel v0.28.9 Linux VXLAN source: [backend MTU parsing](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/vxlan/vxlan.go#L122-L178), [VXLAN device creation and reuse](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/vxlan/device.go#L49-L115), [device compatibility checks](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/vxlan/device.go#L275-L311), and the fixed [`encapOverhead`](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/vxlan/vxlan_network.go#L46-L48) used by the [reported MTU](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/vxlan/vxlan_network.go#L256-L258).
- [Flannel CNI plugin v1.9.1-flannel3 operation and delegate override behavior](https://github.com/flannel-io/cni-plugin/blob/v1.9.1-flannel3/README.md#operation) and [Linux delegate MTU source](https://github.com/flannel-io/cni-plugin/blob/v1.9.1-flannel3/flannel_linux.go).
- [Flannel v0.28.9 Kubernetes manifest](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml) for current resource names and CNI configuration.
- [RFC 7348: VXLAN frame format](https://www.rfc-editor.org/rfc/rfc7348.html#section-5), [RFC 768: UDP](https://www.rfc-editor.org/rfc/rfc768.html), [RFC 791: IPv4](https://www.rfc-editor.org/rfc/rfc791.html), and [RFC 8200: IPv6](https://www.rfc-editor.org/rfc/rfc8200.html).
- [RFC 8201: IPv6 Path MTU Discovery](https://www.rfc-editor.org/rfc/rfc8201.html#section-2) and [RFC 8899: Packetization Layer Path MTU Discovery](https://www.rfc-editor.org/rfc/rfc8899.html#section-2).
- iputils documentation for [`ping`](https://github.com/iputils/iputils/blob/master/doc/ping.xml) and [`tracepath`](https://github.com/iputils/iputils/blob/master/doc/tracepath.xml).
- Linux kernel documentation for [VXLAN](https://docs.kernel.org/networking/vxlan.html), [network-device MTU](https://docs.kernel.org/networking/netdevices.html#mtu), and [interface statistics](https://docs.kernel.org/networking/statistics.html).
- Kubernetes references for [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), [`kubectl rollout restart`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/), [`kubectl rollout status`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/), and [`kubectl exec`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/).
- Kubernetes documentation for [DaemonSet updates](https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/), [Pod disruptions and PDB behavior](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/), [field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/), and [JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/).
- Kubernetes documentation for the [network and Service proxy model](https://kubernetes.io/docs/concepts/services-networking/), [debugging Services](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/), and [container image pulls](https://kubernetes.io/docs/concepts/containers/images/).
- [Kubernetes declarative configuration](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/), [Helm upgrade](https://helm.sh/docs/helm/helm_upgrade/), and the [CNI bridge plugin source](https://github.com/containernetworking/plugins/blob/main/plugins/main/bridge/bridge.go).

## Issues Found
1. **Path MTU definition was reversed** - The post described the limiting value as the smallest packet the path can carry. Replaced this with the minimum Layer 3 MTU across the path, equivalently the largest IP packet that can traverse the path without fragmentation.
2. **Image pulls were presented as a pod-MTU symptom** - Kubernetes image pulls normally use kubelet and container-runtime node networking rather than the pod veth and Flannel overlay. Removed image pulls from the symptom list.
3. **The Flannel log command inspected only one DaemonSet pod** - Added `--all-pods=true` so interface-selection logs are collected from every Flannel pod. Also clarified that host-level `ip`, `tracepath`, `ping`, and `/run/flannel` checks must run on the relevant node or in a privileged node-debug session.
4. **IPv6 accounting was incomplete** - Clarified that IPv6 has a 40-byte base header, producing a common 70-byte VXLAN budget before extension headers. Documented that Flannel v0.28.9 still applies a fixed 50-byte deduction, so a 1500-byte IPv6 outer path requires a backend input of at most 1480; an input of 1480 produces `FLANNEL_MTU=1430`. Dual-stack must use one value safe for both families.
5. **`FLANNEL_MTU` was treated as unconditional** - Clarified that `subnet.env` supplies the CNI delegate's default MTU, but an explicit `delegate.mtu` overrides it.
6. **The rollout did not deploy changed source configuration and assumed every DaemonSet updates automatically** - Changed the instructions to apply the manifest or run a Helm upgrade before restarting Flannel. Added the `OnDelete` caveat because `rollout restart` does not replace those DaemonSet pods automatically.
7. **Restart plus pod recreation was incorrectly described as sufficient** - Flannel v0.28.9 can reuse an existing `flannel.1` or `flannel-v6.1` without updating its MTU because its compatibility check omits MTU. Added verification and reconciliation guidance, including `ip link set`, and required checking persistent bridge and veth MTUs before declaring the rollout complete.
8. **The disruption-budget advice was inaccurate** - PodDisruptionBudgets do not constrain controller-driven rolling updates, and direct Pod deletion bypasses them. Replaced this with controller rollout-strategy guidance for preserving availability.
9. **Pod commands lacked namespace and address-family precision** - Added `-n <namespace>` to `kubectl exec` examples and `-4` to the 1422-byte ping so the documented `1422 + 28 = 1450` calculation cannot accidentally run as IPv6.
10. **The ClusterIP diagnostic was too broad and assumed kube-proxy** - Required successful direct testing of every EndpointSlice backend before deprioritizing MTU, and changed the next step to Service, EndpointSlice, and service-proxy diagnosis, with kube-proxy identified as only the common implementation.

## Review Notes
- The 50-byte common IPv4 VXLAN calculation, `1472 + 28 = 1500` and `1372 + 28 = 1400` probe calculations, `Backend.MTU=1400` to `FLANNEL_MTU=1350` behavior, VPN double-subtraction warning, and VLAN MTU explanation were verified as correct.
- The current official Flannel resource names, ConfigMap JSONPath, Pod field selector, rollout commands, and documentation links were verified.
- The post was reviewed against Flannel v0.28.9, the latest release on 2026-08-21. Future releases may change the fixed VXLAN deduction or existing-device reconciliation behavior, so the post appropriately tells readers to inspect their pinned version.
- For IPv6 pod networking, the resulting link MTU must also satisfy IPv6's 1280-byte minimum. Advanced policy routing using marks, VRFs, source rules, or protocol-specific rules may require a more specific `ip route get` query or packet capture than the basic example.
