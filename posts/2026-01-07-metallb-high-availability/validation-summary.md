# Validation Summary: How to Configure MetalLB for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB
- Kubernetes Deployments, DaemonSets, Services, NetworkPolicy, PodDisruptionBudget
- MetalLB IPAddressPool, L2Advertisement, BGPPeer, BFDProfile, BGPAdvertisement CRDs
- Prometheus Operator PodMonitor and PrometheusRule
- BGP, BFD, ARP/NDP, memberlist

## Sources Consulted
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB advanced L2 configuration documentation: https://metallb.universe.tf/configuration/_advanced_l2_configuration/
- MetalLB advanced BGP configuration documentation: https://metallb.universe.tf/configuration/_advanced_bgp_configuration/
- MetalLB Layer 2 concepts documentation: https://metallb.universe.tf/concepts/layer2/
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB v0.16.1 native manifest and CRD schemas: https://github.com/metallb/metallb/tree/v0.16.1/config
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The post incorrectly recommended running three MetalLB controller replicas for HA. MetalLB's controller is a singleton, so the controller example now uses one replica and explains that production installs should start from the official manifest or Helm chart.
- The controller and speaker manifests used older v0.14.8 image tags, metrics ports, and probe paths. Updated examples to v0.16.1-style ports and health/readiness endpoints.
- The controller example omitted required upstream environment variables and webhook certificate mounting. Added the memberlist deployment environment variables, pod name, and webhook certificate volume mount.
- The speaker example omitted `METALLB_POD_NAME`. Added it to match the official manifest shape.
- The memberlist secret discussion implied manual creation is always required. Updated it to note that recent official manifests can create the Secret automatically.
- The Layer 2 failure diagram used quorum terminology, which is inaccurate for MetalLB's stateless L2 announcer selection. Reworded it around eligible speakers.
- The failover test used `kubectl drain --ignore-daemonsets`, which does not stop DaemonSet speaker pods. Replaced it with removing the node from the L2Advertisement selector or testing an actual node/kubelet failure.
- The service example used the older `metallb.universe.tf/address-pool` annotation. Updated it to `metallb.io/address-pool`.
- The network partition test used NetworkPolicy to simulate a host-network speaker partition. Replaced the simulation with firewall-rule examples and clarified the NetworkPolicy caveat for hostNetwork pods.
- The BGP metrics example assumed a `speaker` Service and only `metallb_bgp_*` metrics. Updated it to port-forward the speaker DaemonSet and mention both native BGP and FRR-K8s metric prefixes.
- The monitoring example used a ServiceMonitor without defining a matching Service. Replaced it with a PodMonitor that targets MetalLB pods directly.
- The BFD alert used the old `metallb_bfd_session_up` metric. Updated it to `frrk8s_bfd_session_up` for current FRR-K8s mode.
- The controller PDB expected two available controller replicas. Updated it to protect the singleton controller with `minAvailable: 1`.
- The health check counted non-LoadBalancer services as pending and did not handle an empty `readyReplicas` field. Updated the shell snippet accordingly.

## Review Notes
The post is now technically valid as a tutorial, but production users should still prefer the official MetalLB manifest, Helm chart, Kustomize overlays, or Operator as the installation source, then layer local scheduling/resource patches on top.
