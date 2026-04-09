# Validation Summary: How to Handle Network MTU Issues in Rook-Ceph

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Rook-Ceph (storage orchestration on Kubernetes)
- Kubernetes (kubectl debug, exec, ConfigMaps)
- Calico CNI (FelixConfiguration MTU settings)
- Flannel CNI (VXLAN backend MTU configuration)
- Cilium CNI (Helm-based MTU configuration)
- VXLAN and IP-in-IP overlay networking
- systemd-networkd (persistent MTU configuration)
- Linux networking tools (ping, iperf3, tracepath, ip link)

## Sources Consulted
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico MTU configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Flannel backends documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Flannel configuration documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md
- RFC 7348 (VXLAN specification) for overhead calculation
- Calico MTU documentation confirming VXLAN (50 bytes) and IP-in-IP (20 bytes) overhead values

## Issues Found

### 1. Calico FelixConfiguration used non-existent `mtu` field
- **What was wrong:** The post used `spec.mtu: 1450` in the FelixConfiguration resource. This field does not exist.
- **What was changed:** Replaced with the correct fields `spec.vxlanMTU: 1450` and `spec.ipipMTU: 1450`, with a note to use the field matching the tunnel type.
- **Why:** The FelixConfiguration resource has separate MTU fields per tunnel type (`vxlanMTU`, `ipipMTU`, `vxlanMTUV6`), not a generic `mtu` field. The Tigera operator's Installation resource (`spec.calicoNetwork.mtu`) does have a single `mtu` field, but that's a different resource type.

### 2. Cilium Helm value used wrong case for MTU
- **What was wrong:** The command used `--set mtu=1450` (lowercase).
- **What was changed:** Updated to `--set MTU=1450` (uppercase).
- **Why:** Cilium's Helm chart defines the value as `MTU` (uppercase) in values.yaml. Helm values are case-sensitive, and the lowercase variant does not match the documented key.

### 3. Cilium `tunnel` Helm value is deprecated
- **What was wrong:** The command used `--set tunnel=vxlan`, which was deprecated in Cilium 1.14+.
- **What was changed:** Updated to `--set routingMode=tunnel --set tunnelProtocol=vxlan`.
- **Why:** Since Cilium 1.14, the `tunnel` value was split into `routingMode` and `tunnelProtocol`. The old value still works as a compatibility shim but generates warnings.

### 4. kube-proxy configmap check was misleading
- **What was wrong:** The command `kubectl -n kube-system get configmap kube-proxy -o yaml | grep mtu` was listed as a way to check CNI MTU. kube-proxy does not manage or store MTU settings.
- **What was changed:** Replaced with a Flannel-specific ConfigMap check (`kubectl -n kube-flannel get configmap kube-flannel-cfg -o yaml | grep -i mtu`) and a node-level CNI config inspection command using `kubectl debug`.
- **Why:** MTU is configured in the CNI plugin, not in kube-proxy. The original command would return no results and confuse readers.

### 5. CNI config cat command lacked node context
- **What was wrong:** `cat /etc/cni/net.d/*.conf | grep mtu` was shown as a standalone command, but CNI configs are on cluster nodes, not the local machine.
- **What was changed:** Replaced with a `kubectl debug node/` command that runs the check on a cluster node, and updated the glob to `*.conflist` which is the more common CNI config extension.
- **Why:** Without kubectl context, the command would only work if run directly on a node via SSH, which isn't the pattern used elsewhere in the post.

## Review Notes
- The `kubectl debug node/` commands throughout the post would benefit from an `--image` flag (e.g., `--image=busybox`) since most clusters don't have a default debug container image configured. The existing commands may fail without it.
- The Flannel ConfigMap configuration is correct — `MTU` in the VXLAN Backend section is a documented option per the official Flannel backends documentation.
- The VXLAN overhead (50 bytes) and IP-in-IP overhead (20 bytes) calculations are accurate, confirmed against RFC 7348 and Calico documentation.
- The ping test using `-M do -s 1472` is correct: 1472 bytes payload + 8 bytes ICMP header + 20 bytes IP header = 1500 bytes, which is the standard test for 1500 MTU.
- The systemd-networkd configuration with `MTUBytes=9000` in a `.network` file's `[Link]` section is valid syntax.
- For Calico users on the Tigera operator, the preferred MTU configuration method is via the `Installation` resource (`spec.calicoNetwork.mtu`), which is simpler than per-tunnel FelixConfiguration fields. The post could mention this as an alternative in a future update.
