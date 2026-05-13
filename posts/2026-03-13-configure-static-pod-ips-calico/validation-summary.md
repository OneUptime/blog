# Validation Summary: Configure Static Pod IPs with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes StatefulSets
- Calico CNI
- Calico IPAM
- Calico IPPool
- Calico IPReservation
- calicoctl

## Sources Consulted
- Calico documentation: Use a specific IP address with a pod - https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico documentation: Configure the Calico CNI plugins - https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico documentation: IP pool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: IP reservation resource - https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes documentation: StatefulSet concepts - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The original post described Calico as assigning and persisting static pod IPs with node affinity. Calico's documented mechanism is a pod creation-time annotation that requests a specific IP from Calico IPAM; node affinity is not the mechanism that makes the IP static. Updated the explanation and best practices accordingly.
- The IPPool example used `10.244.200.0/28` without setting `blockSize`. Calico's default IPv4 block size is `/26`, and an IPPool CIDR must be large enough to fit a block. Changed the example pool to `10.244.200.0/26`.
- The target IP verification commands checked `10.244.1.100-102`, while the examples assigned `10.244.200.1`. Updated the commands to check the IPs used by the post.
- The post implied a dedicated pool alone prevents static IP conflicts. Calico can still automatically allocate addresses from a normal pool, so added an `IPReservation` example for the specific static IPs.
- The pod example used the `messaging` namespace but did not create it. Added an idempotent namespace creation command before applying the pod.
- The StatefulSet section implied that a shared `ipv4pools` annotation provides static per-replica IP assignment. That annotation only restricts the pool used for allocation and does not guarantee the same exact IP after recreation. Updated the section title, text, and comments to reflect that limitation.
- The conclusion still referenced node affinity as required for static IP retention. Updated it to match the corrected Calico IPAM annotation and IPReservation workflow.

## Review Notes
- Exact per-replica static IP assignment is awkward with a single StatefulSet pod template because all replicas share the same annotations. A future post could discuss alternatives such as stable StatefulSet DNS names, Services, or generating per-pod manifests when exact pod IPs are unavoidable.
