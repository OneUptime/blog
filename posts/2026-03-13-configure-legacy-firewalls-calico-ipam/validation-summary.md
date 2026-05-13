# Validation Summary: Configure Legacy Firewalls with Calico IPAM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico IPAM
- Calico IPPool resources
- calicoctl
- Kubernetes namespaces, pod annotations, node labels, and pod scheduling
- Enterprise firewall IP allowlisting

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico CNI plugin annotations reference: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post implied that Calico IPPool node selectors route or place pod allocations by themselves. Calico's `nodeSelector` limits which nodes can allocate from the pool, but Kubernetes scheduling still needs to place workloads on matching nodes. Updated the wording and the test pod command to include a `nodeSelector` for the DMZ zone.
- The conclusion used "guarantee" too broadly. Updated it to clarify that new pods receive approved IPs when they are scheduled onto matching nodes.
- The `calicoctl patch` command used the long `--patch` form, which is valid, but the official Calico example uses `-p`. Updated the command to match the official documented form and compact JSON patch style.

## Review Notes
- The IPPool API version, `cidr`, `ipipMode`, `natOutgoing`, `disabled`, and `nodeSelector` fields match the current Calico IPPool resource schema.
- The `cni.projectcalico.org/ipv4pools` namespace annotation is valid, but the referenced IPPool must already exist and must exactly match a configured IPPool resource.
- Disabling an IPPool prevents new allocations from that pool; it does not change IPs already assigned to existing pods.
