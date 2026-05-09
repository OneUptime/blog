# Validation Summary: How to Troubleshoot Top-of-Rack Router Peering with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- Top-of-Rack router peering
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: BGPConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico documentation: calicoctl get command - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl node status command - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes documentation: kubectl quick reference - https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Kubernetes documentation: kubectl get reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get

## Issues Found
No technical issues found.

## Review Notes
The commands shown are valid. `calicoctl get bgpconfiguration default -o yaml` uses a valid Calico resource type and output flag, and `kubectl get nodes -o wide` and `kubectl get pods -n calico-system` are valid Kubernetes commands. The `calico-system` namespace is correct for operator-based Calico installations; installations using manifests or older layouts may place Calico pods in a different namespace such as `kube-system`.
