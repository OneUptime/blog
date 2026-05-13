# Validation Summary: How to Configure IP-in-IP in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- IP-in-IP
- VXLAN
- Linux networking tools
- kubectl
- calicoctl

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking configuration: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico networking option guide: https://docs.tigera.io/calico/latest/networking/determine-best-networking
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes assigning Pods to Nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- IANA protocol numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- RFC 2003, IP Encapsulation within IP: https://datatracker.ietf.org/doc/html/rfc2003

## Issues Found
- The IPPool example set both `ipipMode: CrossSubnet` and `vxlanMode: Never`. Calico's current IPPool resource reference documents `ipipMode` and `vxlanMode` as mutually exclusive fields, and the official IP-in-IP examples set `ipipMode` without also setting `vxlanMode`. Removed `vxlanMode: Never` from the YAML.
- The cross-subnet test commands defined `POD1_NODE` and `POD2_NODE` but did not use them; the `nodeName` override was an empty string. Updated the `kubectl run` commands to set `spec.nodeName` from the variables.
- The `kubectl run --overrides` examples did not include `apiVersion` in the inline JSON. The Kubernetes kubectl reference shows `--overrides` JSON including an `apiVersion`, so the examples now include `"apiVersion":"v1"`.

## Review Notes
- `kubectl` and `calicoctl` were not installed in the local environment, so command verification was performed against official documentation rather than local CLI help.
- The IP-in-IP protocol number, cross-subnet behavior, IPIP overhead, VXLAN overhead comparison, and MTU guidance are consistent with the consulted authoritative sources.
