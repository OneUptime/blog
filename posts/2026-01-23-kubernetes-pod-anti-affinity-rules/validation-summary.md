# Validation Summary: How to Set Up Pod Anti-Affinity Rules for Distribution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes pod anti-affinity
- Kubernetes scheduler
- Kubernetes topology spread constraints
- Kubernetes Deployments
- Kubernetes PodDisruptionBudgets
- kubectl

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Command line tool (kubectl), output formats and custom columns - https://kubernetes.io/docs/reference/kubectl/
- Kubernetes documentation: kubectl drain - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: Admission Control, LimitPodHardAntiAffinityTopology - https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/

## Issues Found
- The "Check zone distribution" command attempted to read `topology.kubernetes.io/zone` from Pod metadata labels. Kubernetes topology zone labels are Node labels, and Pods do not automatically get those labels. Changed the command to list Nodes with the zone label using `kubectl get nodes -L topology.kubernetes.io/zone`.
- Pattern 4 used required pod anti-affinity across zones with `replicas: 6`. Required anti-affinity with `topologyKey: topology.kubernetes.io/zone` allows at most one matching Pod per zone, so that example would require six separate zones. Changed the replica count to 3 and added a concise comment that the pattern requires at least as many zones as replicas.
- Pattern 4 said "Prefer different nodes within zone", but the required zone anti-affinity prevents matching Pods from sharing a zone. Changed the comment to "Also prefer different nodes."

## Review Notes
- The examples use current Kubernetes API versions: `apps/v1` for Deployments and `policy/v1` for PodDisruptionBudgets.
- The hard zone anti-affinity examples are valid, but they are capacity-sensitive: every Node should consistently carry the selected topology label, and required anti-affinity can leave Pods Pending when there are fewer topology domains than replicas.
- Some clusters may enable the disabled-by-default `LimitPodHardAntiAffinityTopology` admission controller, which rejects required pod anti-affinity topology keys other than `kubernetes.io/hostname`.
