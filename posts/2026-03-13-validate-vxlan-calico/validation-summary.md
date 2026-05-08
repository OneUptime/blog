# Validation Summary: How to Validate VXLAN in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- VXLAN
- Linux networking commands
- kubectl
- calicoctl

## Sources Consulted
- Calico Open Source IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Open Source Node resource documentation: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico Open Source MTU documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- RFC 7348, VXLAN: https://www.rfc-editor.org/rfc/rfc7348

## Issues Found
- The VTEP neighbor check used `arp -n | grep "vxlan"`, which is not a reliable way to show VXLAN device neighbor entries. Changed it to `ip neigh show dev vxlan.calico`, which queries neighbor entries for the VXLAN interface directly.
- The Calico VTEP information check used `kubectl get nodes`, but `ipv4VXLANTunnelAddr` and `vxlanTunnelMACAddr` are fields on Calico Node resources. Changed the command to `calicoctl get node -o yaml | grep -E "ipv4VXLANTunnelAddr|vxlanTunnelMACAddr"`.
- The `kubectl run` examples passed `sleep 3600` without `--command`, which makes those values container arguments rather than the command. Added `--command -- sleep 3600` and included `apiVersion: v1` in the JSON overrides to match kubectl override requirements.
- The Mermaid subgraph declarations used free-form titles that can be parsed ambiguously. Changed them to explicit subgraph IDs with display labels.

## Review Notes
The Calico IPPool fields `vxlanMode`, `ipipMode`, and `natOutgoing` are valid, and VXLAN default UDP port 4789 and IPv4 VXLAN 50-byte MTU overhead are supported by the consulted sources. Calico documentation recommends cross-subnet encapsulation where possible to reduce overhead, but `vxlanMode: Always` is technically valid for the guide's validation scenario.
