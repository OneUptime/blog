# Validation Summary: How to Avoid Common Mistakes with Specific IP Assignment with Calico IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico IPAM
- Kubernetes
- calicoctl
- IPPool resources

## Sources Consulted
- Calico documentation: Use a specific IP address with a pod, https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico documentation: Configure the Calico CNI plugins, https://docs.tigera.io/calico/latest/reference/cni-plugin/configuration
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get

## Issues Found
- The prerequisite listed "Calico v3.20+ installed", but Calico's documented requirement for specific pod IP assignment is that the cluster uses Calico IPAM. Changed this prerequisite to "Calico installed with Calico IPAM enabled".
- The example only showed a normal IPPool. For specific IP assignment, Calico documents the `cni.projectcalico.org/ipAddrs` pod annotation, and the requested address must be in a configured Calico IP pool and not already in use. Added a minimal pod example using that annotation.
- The example pool did not reserve addresses from automatic assignment, which can allow Calico to allocate a desired static IP to another workload before it is manually requested. Added `nodeSelector: "!all()"` to reserve the pool for manual assignments, matching Calico's documented guidance.

## Review Notes
The `calicoctl get ippools -o yaml`, `calicoctl ipam show --show-blocks`, `calicoctl ipam check -o ipam-report.json`, and `kubectl get pods -A -o wide` commands are valid. The `blockSize: 26` and `natOutgoing: true` IPPool fields are valid for IPv4 pools. Future improvements could explain that the `ipAddrs` annotation must be present when the pod is created and supports only one IP address per IP family.
