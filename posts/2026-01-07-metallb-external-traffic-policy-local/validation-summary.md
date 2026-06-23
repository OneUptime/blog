# Validation Summary: How to Set Up MetalLB with External Traffic Policy Local

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes LoadBalancer and NodePort external traffic policy
- MetalLB
- MetalLB Layer 2 mode
- Kubernetes Deployments, readiness probes, and liveness probes
- kubectl
- nginx container deployment

## Sources Consulted
- Kubernetes documentation: Using Source IP - https://kubernetes.io/docs/tutorials/services/source-ip/
- MetalLB documentation: Installation - https://metallb.universe.tf/installation/
- MetalLB documentation: Configuration - https://metallb.universe.tf/configuration/
- MetalLB documentation: Usage and traffic policies - https://metallb.universe.tf/usage/
- MetalLB documentation: Layer 2 concepts - https://metallb.universe.tf/concepts/layer2/
- MetalLB documentation: Troubleshooting - https://metallb.universe.tf/troubleshooting/
- MetalLB documentation: Release notes - https://metallb.universe.tf/release-notes/

## Issues Found
- The post used the deprecated `metallb.universe.tf/loadBalancerIPs` annotation prefix. Changed it to the current `metallb.io/loadBalancerIPs` prefix used by MetalLB documentation.
- The MetalLB install command referenced `v0.14.8`. Updated it to `v0.16.1`, matching the current official manifest examples consulted during review.
- The Layer 2 traffic diagrams and explanation implied that MetalLB distributes L2 traffic across multiple nodes. Updated the diagrams and wording to reflect that Layer 2 mode uses one eligible announcing node for a service IP, and with `externalTrafficPolicy: Local`, that node must have a local endpoint.
- The pod distribution section said traffic is sent to nodes that have pods running. Clarified that, in Layer 2 mode, traffic goes to one eligible announcing node and only local endpoints on that receiving node get traffic.
- The health-check section overstated automatic service health checks. Reworded it to focus on endpoint readiness and MetalLB speaker eligibility for Local-policy services.
- The monitoring section claimed `kubectl get endpoints` checks connection counts and referred to kube-proxy metrics before showing `kubectl get pods`. Reworded it to describe endpoint registration and pod node placement accurately.
- The NodePort troubleshooting note implied NodePort access prevents client IP preservation. Updated it to explain that NodePort testing must target a node with a local endpoint when using `externalTrafficPolicy: Local`.

## Review Notes
The Kubernetes and MetalLB manifests use current API versions for the covered resources. The article focuses on MetalLB Layer 2 mode; BGP mode has different load-spreading behavior and is intentionally not expanded here to avoid changing the post structure.
