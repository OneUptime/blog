# Validation Summary: How to Migrate to IP-in-IP in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source IPPool resources
- Kubernetes
- IP-in-IP encapsulation
- VXLAN encapsulation
- kubectl
- calicoctl
- Linux networking tools (`ip`, `tcpdump`)

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico calicoctl apply documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/

## Issues Found
- The IPPool example set both `ipipMode: CrossSubnet` and `vxlanMode: Never`. Current Calico IPPool documentation states that `ipipMode` and `vxlanMode` cannot be set at the same time, so I removed `vxlanMode: Never` from the IP-in-IP example.
- The cross-subnet test commands defined `POD1_NODE` and `POD2_NODE` but did not use them; the `nodeName` override was an empty string. I changed the overrides to set `spec.nodeName` to the selected node variables so the example actually schedules pods on the intended nodes.
- The BusyBox `kubectl run` examples passed `sleep 3600` as container arguments, which relies on the image entrypoint and may not keep the pod running as intended. I added `--command -- sleep 3600` so Kubernetes sets `sleep` as the container command, matching the kubectl reference behavior.

## Review Notes
The remaining technical claims match the consulted documentation: IP-in-IP uses an additional 20-byte IPv4 header, IPv4 VXLAN uses 50 bytes of overhead, `CrossSubnet` limits encapsulation to traffic crossing subnet boundaries, and `calicoctl apply -f` is a valid way to apply Calico resource manifests. In a real migration, operators should also check the existing pool CIDR, node subnet detection, and cluster MTU before applying changes.
