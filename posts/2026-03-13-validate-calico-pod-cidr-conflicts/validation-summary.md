# Validation Summary: How to Validate Resolution of Calico Pod CIDR Conflicts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Calico IPAM
- Calico IPPool resources
- `calicoctl`
- Kubernetes pods and nodes
- `kubectl`
- Pod-to-pod and node-to-pod connectivity testing

## Sources Consulted
- Calico official documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico official documentation: Migrate from one IP pool to another - https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico official documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico official documentation: Configure calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico Enterprise official documentation: `calicoctl ipam check` - https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Kubernetes official documentation: `kubectl get` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes official documentation: `kubectl run` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes official documentation: `kubectl wait` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes official documentation: JSONPath support - https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
1. **Old CIDR pod check excluded `kube-system` and searched the whole wide output:** The original command could hide system pods that still had old pod IPs, and `grep` against `kubectl get pods -o wide` could match non-IP columns. Changed it to print namespace, name, and pod IP only, then match the configured prefix against the IP column.
2. **Node-to-pod test selected pod IPs incorrectly:** The original command used JSONPath across all pods without emitting line breaks, so `head -1` would not reliably select a single pod IP. It also assigned a node IP variable that was not used. Changed the snippet to select a node name, list running pod IPs with `custom-columns`, and take the first non-empty IP with `awk`.

## Review Notes
- `calicoctl ipam check` is documented in Calico Enterprise command reference as an IPAM consistency check against Kubernetes. Current Calico Open Source documentation emphasizes `calicoctl ipam show`, `release`, and `configure`; readers should confirm that their installed `calicoctl` distribution supports `ipam check`.
- The connectivity tests are syntactically valid for `kubectl run`, `kubectl wait`, `kubectl exec`, and `kubectl get`, but real results still depend on cluster policy, ICMP allowance, SSH access to nodes, and whether the selected pod accepts ICMP traffic.
