# Validation Summary: How to Troubleshoot IP-in-IP in Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes
- IP-in-IP/IPIP encapsulation
- VXLAN encapsulation
- Linux networking tools (`ip`, `tcpdump`)
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico MTU documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl command reference for `exec`, `get`, and JSONPath output: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- IANA Assigned Internet Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003

## Issues Found
- The cross-subnet test defined `POD1_NODE` and `POD2_NODE` but used an empty `nodeName` in both `kubectl run --overrides` values. I changed the overrides to use the corresponding variables so the pods are scheduled onto the intended nodes.
- The test read `pod-b`'s IP immediately after creating the pods, which could race pod scheduling and startup. I added `kubectl wait --for=condition=Ready` for both pods before reading the IP and running the ping.

## Review Notes
The Calico IPPool fields, `ipipMode` values, `CrossSubnet` behavior, protocol 4/IPIP description, and MTU overhead values are consistent with the current Calico documentation and the authoritative protocol references. The post assumes the selected nodes are in different subnets and that direct `spec.nodeName` scheduling is acceptable in the target cluster.
