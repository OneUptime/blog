# Validation Summary: How to Handle MetalLB During Kubernetes Node Maintenance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MetalLB
- Kubernetes
- kubectl drain and node maintenance
- Layer 2 ARP/NDP advertisements
- BGP and ECMP routing
- BFD
- Prometheus and Grafana monitoring
- Bash automation scripts

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.universe.tf/concepts/layer2/
- MetalLB usage and traffic policies: https://metallb.universe.tf/usage/
- MetalLB configuration guide: https://metallb.universe.tf/configuration/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB Prometheus metrics: https://metallb.universe.tf/prometheus-metrics/
- MetalLB installation and FRR-K8s notes: https://metallb.universe.tf/installation/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- MetalLB upstream Kubernetes manifest labels: https://raw.githubusercontent.com/metallb/metallb/main/config/manifests/metallb-native.yaml

## Issues Found
- The post referenced a non-existent `metallb-state` ConfigMap for Layer 2 ownership. Replaced it with `ServiceL2Status` inspection commands, which are part of the current MetalLB API.
- The post implied `kubectl drain --ignore-daemonsets` evicts MetalLB speaker pods and directly triggers Layer 2/BGP failover. Updated the text and diagrams to clarify that drain ignores DaemonSet-managed speakers; failover or route withdrawal happens when the speaker/BGP backend stops, the node is powered down, or the node is removed from eligible announcers.
- The BGP status command used `birdcl`, which is obsolete for current MetalLB deployments. Replaced it with `ServiceBGPStatus` inspection.
- The post said all BGP nodes advertise service IPs. Updated this to "eligible nodes" to account for `externalTrafficPolicy`, node selectors, and advertisement configuration.
- The post described deleting a speaker pod as persistent IP migration. Added the DaemonSet recreation caveat and changed the guidance to verify status or remove the node from eligible announcers for planned migration.
- The post used old `metallb_bgp_*` metric names. Updated BGP Prometheus examples to current FRR-K8s `frrk8s_bgp_*` metrics.
- The speaker PDB section overstated what a PDB can do during normal node drains. Added a note that drain does not evict DaemonSet-managed speaker pods.
- The event filtering command used `reason!=Normal`, but event severity is represented by `type`. Updated it to `type!=Normal`.
- The Layer 2 recovery section stated that a returning node will not immediately take over IPs. Updated it to reflect MetalLB's stateless election behavior, where adding a node usually does not move an IP but can if the node becomes the first eligible announcer.
- The pool exhaustion section claimed temporary IP conflicts during maintenance. Reworded it to the accurate risk: service assignment failures when pools are exhausted.

## Review Notes
The examples assume the upstream MetalLB manifest labels (`app=metallb,component=speaker`). Helm installations may use `app.kubernetes.io/component=speaker`, so future improvements could show both selector variants.
