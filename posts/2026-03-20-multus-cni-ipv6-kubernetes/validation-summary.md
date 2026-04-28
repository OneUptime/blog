# Validation Summary: How to Configure Multus CNI for IPv6 in Kubernetes

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Multus CNI (k8snetworkplumbingwg/multus-cni)
- Kubernetes (NetworkAttachmentDefinition CRD, Pod annotations)
- CNI plugins: macvlan, ipvlan
- CNI IPAM plugins: static, dhcp
- IPv6 networking
- kubectl
- ping6 / iputils

## Sources Consulted
- Multus CNI repository and docs: https://github.com/k8snetworkplumbingwg/multus-cni
- Multus daemonset deployment file: https://github.com/k8snetworkplumbingwg/multus-cni/blob/master/deployments/multus-daemonset.yml
- Network Plumbing Working Group spec for `k8s.v1.cni.cncf.io/networks` and `network-status` annotations: https://github.com/k8snetworkplumbingwg/multi-net-spec
- containernetworking/plugins (macvlan, ipvlan, static, dhcp IPAM): https://github.com/containernetworking/plugins
- CNI specification (cniVersion 0.3.1): https://github.com/containernetworking/cni/blob/main/SPEC.md
- RFC 3849 (IPv6 documentation prefix 2001:db8::/32)
- RFC 4291 (IPv6 address textual representation: hex digits 0-9, a-f only)

## Issues Found
- Invalid IPv6 addresses using `2001:db8:net2::...`. The literal `net2` is not valid hexadecimal (`n` and `t` are not hex digits 0-9/a-f), so per RFC 4291 these strings are not valid IPv6 addresses and the `static` IPAM/CNI config would be rejected. Replaced all occurrences of `2001:db8:net2::` with `2001:db8:2::` (still inside the RFC 3849 documentation prefix `2001:db8::/32`). Affected lines:
  - Step 2 macvlan NAD: `address` and `gateway` fields.
  - Step 5 static pod annotation: `ips` field.
  - Step 6 expected `network-status` example output.
  - Step 6 `ping6` connectivity test.

## Review Notes
- The CNI `dhcp` IPAM plugin requires the `dhcp` daemon (`/opt/cni/bin/dhcp daemon`) to be running on each node; this is a host-side prerequisite the post does not call out, but it is a deployment detail rather than a technical inaccuracy.
- The CNI `dhcp` IPAM plugin's IPv6/DHCPv6 support is limited compared to IPv4; in many real deployments operators use SLAAC or a dedicated DHCPv6 setup. The example is syntactically correct but may need environment-specific tuning.
- `cniVersion: "0.3.1"` is supported by Multus and the referenced reference plugins; newer values such as `0.4.0` or `1.0.0` are also valid choices for current installations.
- `ping6` is provided by `iputils` and is present in the `nicolaka/netshoot` image; on some modern distros `ping -6` is the preferred form, but `ping6` still works inside that image.
- The `k8s.v1.cni.cncf.io/networks` and `k8s.v1.cni.cncf.io/network-status` annotation keys, the `NetworkAttachmentDefinition` CRD (`k8s.cni.cncf.io/v1`), and the `interface`/`ips`/`namespace` fields all match the multi-net spec.
