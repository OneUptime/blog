# Validation Summary: How to Validate Specific IP Assignment with Calico IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- calicoctl
- Kubernetes pod annotations

## Sources Consulted
- Calico documentation: Use a specific IP address with a pod: https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico documentation: Configure the Calico CNI plugins: https://docs.tigera.io/calico/latest/reference/cni-plugin/configuration
- Calico documentation: IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show

## Issues Found
- The prerequisites listed a Calico version but did not state the required IPAM condition. Calico's documentation says specific pod IP assignment with `cni.projectcalico.org/ipAddrs` requires the cluster to use Calico IPAM, so the prerequisite was updated to make that requirement explicit.
- The example showed an IPPool only, not a pod requesting a specific IP address. Since the post is about validating specific pod IP assignment, the example was changed to a Kubernetes Pod manifest using the documented `cni.projectcalico.org/ipAddrs` annotation.

## Review Notes
The verification commands are valid according to Calico documentation. The requested IP in the example must be inside a configured Calico IP pool, must not already be in use, and the annotation must be present when the pod is created.
