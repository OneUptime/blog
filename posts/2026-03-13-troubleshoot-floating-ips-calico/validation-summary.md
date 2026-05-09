# Validation Summary: How to Troubleshoot Floating IPs with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Calico CNI
- Calico IPPool
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Add a floating IP to a pod - https://docs.tigera.io/calico/latest/networking/ipam/add-floating-ip
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl ipam overview - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes documentation: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The introduction described floating IPs as general IP address management for pod assignment. Updated it to match Calico's documented behavior: floating IPs are additional pod-facing addresses delivered to the real pod IP with NAT, and they must be within a configured IPPool for correct advertisement.
- The prerequisites implied generic Calico v3.20+ and IP pool setup were sufficient. Updated them to require the Calico CNI plugin with floating IP support enabled and IPPools that include the floating IPs.
- The configuration and example focused on a generic IPPool rather than configuring a pod to use a floating IP. Replaced the example with the documented Kubernetes pod annotation `cni.projectcalico.org/floatingIPs`.
- The verification commands included `calicoctl ipam check -o ipam-report.json`, which checks IPAM consistency but does not directly verify a pod floating IP annotation. Replaced it with commands that inspect pod placement, the floating IP annotation, and the specific IP with `calicoctl ipam show --ip`.
- The architecture diagram showed only normal IPAM allocation to a pod IP. Updated it to show the relationship between the IPPool, floating IP, and pod.

## Review Notes
Calico's current documentation notes that Kubernetes pod floating IPs are not supported for operator-managed Calico clusters. A future expansion of this post should call that out explicitly and show the CNI `feature_control.floating_ips` configuration stanza.
