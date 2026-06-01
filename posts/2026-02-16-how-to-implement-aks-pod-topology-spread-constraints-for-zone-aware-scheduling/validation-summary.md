# Validation Summary: How to Implement AKS Pod Topology Spread Constraints for Zone-Aware Scheduling

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes scheduling
- Pod topology spread constraints
- Pod anti-affinity
- Deployments and StatefulSets
- kubectl
- jq
- Kyverno mutation policies
- PostgreSQL container image

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Microsoft Learn: Configure availability zones in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/reliability-availability-zones-configure
- Microsoft Learn: Scheduler configuration concepts for AKS - https://learn.microsoft.com/en-us/azure/aks/concepts-scheduler-configuration
- Microsoft Learn: Configure advanced scheduler profiles on AKS (preview) - https://learn.microsoft.com/en-us/azure/aks/configure-aks-scheduler
- Kyverno documentation: Mutate Rules - https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Docker Hub: postgres Official Image - https://hub.docker.com/_/postgres

## Issues Found
- The opening section overstated default Kubernetes scheduling behavior by saying the scheduler optimizes for resource utilization instead of distribution and may pack all pods into one zone. Updated it to reflect that Kubernetes has built-in best-effort topology spreading, but explicit hard constraints are still needed for production guarantees.
- The `maxSkew: 1` explanation said zones 2 and 3 only needed one pod before zone 1 could get a third. Corrected it because with three eligible zones and `DoNotSchedule`, zone 1 can only get a third pod after the other zones also have two matching pods.
- The dual spread explanation implied the hostname spread constraint operates strictly within each zone. Corrected the wording because multiple topology spread constraints are combined together, and the hostname constraint spreads across eligible nodes while the zone constraint keeps zone placement balanced.
- The PostgreSQL StatefulSet used the official `postgres:16` image without a required password configuration. Added `POSTGRES_PASSWORD` from a Kubernetes Secret so the container can initialize correctly.
- The verification commands claimed to show/count zones while one command only listed nodes and another counted pods by node. Updated the comments and replaced the count with commands that resolve each scheduled node's `topology.kubernetes.io/zone` label.
- The quick visual zone-counting loop referenced `env.nodes[]`, which was never defined for `jq`. Replaced it with a loop that gets the node names for each zone and counts pods whose `spec.nodeName` is in that list.
- The cluster-level scheduler section said AKS does not expose scheduler configuration directly. Updated it to reflect current Microsoft documentation: AKS scheduler profile configuration exists as a preview feature for Kubernetes 1.33 and later.
- The Kyverno mutation example used an invalid shape for substituting `request.object.spec.selector.matchLabels` into `labelSelector.matchLabels`. Updated the substitution to set `matchLabels` to the selector map and changed the match block to the current `match.any` style shown in Kyverno documentation.

## Review Notes
- `matchLabelKeys` is documented as beta and enabled by default in Kubernetes 1.27+, with behavior changes in Kubernetes 1.34 around explicit selector merging. The post is accurate for current Kubernetes, but older AKS clusters may need version and feature-gate checks.
- AKS scheduler profile configuration is currently preview documentation and not ideal as the primary production recommendation. The post now keeps Kyverno/admission-time mutation as the production-friendly fallback.
