# Validation Summary: Avoid Mistakes When Configuring Static Pod IPs with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico CNI
- Calico IPAM
- Calico IPReservation
- calicoctl
- Kubernetes Deployments
- Kubernetes StatefulSets
- Kubernetes headless Services
- Kubernetes DNS
- Calico GlobalNetworkPolicy

## Sources Consulted
- Calico documentation: Use a specific IP address with a pod - https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico documentation: IPReservation resource - https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico documentation: calicoctl ipam overview - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam release - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes documentation: StatefulSets - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes documentation: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The post described static IP behavior in terms of pod restarts. This was corrected to refer to pods being deleted/recreated or rescheduled, because a container restart inside the same Pod does not require a new pod IP allocation.
- The post implied Calico automatically maps workload identity to a stable IP across replica lifecycle events. This was clarified to state that Calico can request a specific IP at pod creation time, but does not automatically assign unique static IPs per Deployment or StatefulSet replica.
- The first Deployment example used `apps/v1` without a required `.spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` so the YAML is syntactically valid while preserving the intended "wrong approach" behavior.
- The headless Service DNS comment used an incorrect example hostname and service name. Updated it to `myapp-0.myapp-headless.production.svc.cluster.local`, matching the StatefulSet name and governing headless Service.
- The IP reservation example used non-current `calicoctl ipam reserve --ip ... --handle ...` and `calicoctl ipam show --show-reserved` commands. Current Calico documentation lists `ipam show`, `ipam release`, and `ipam configure`, and documents reservations through the `IPReservation` resource. Replaced the command block with a valid `IPReservation` manifest.
- The release/re-reserve workflow suggested using `calicoctl ipam release` as part of normal pod recreation. This was removed because Calico documents `ipam release` for releasing previously assigned or leaked addresses and warns that it does not remove addresses from existing endpoints.
- Added Calico IPAM as a prerequisite, because Calico's specific IP assignment and `IPReservation` behavior require Calico IPAM.

## Review Notes
- `calicoctl` was not installed locally, so CLI behavior was checked against the official Calico command reference instead of local `--help` output.
- YAML snippets were parsed locally with PyYAML and all four YAML examples parsed successfully.
