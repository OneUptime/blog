# Validation Summary: How to Configure Pod Topology Spread Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduling
- Pod topology spread constraints
- Deployments and StatefulSets
- Node affinity and pod anti-affinity
- PodDisruptionBudgets
- kubectl

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: JSONPath Support - https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: kubectl Reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The `minDomains` section described the field as Kubernetes 1.25+ and said pods will not schedule when fewer than three zones are available. Current Kubernetes documentation says `minDomains` is generally available in Kubernetes 1.30, was available earlier behind the `MinDomainsInPodTopologySpread` feature gate, and causes the scheduler to treat the global minimum as 0 when eligible domains are fewer than `minDomains`. Updated the heading and explanation to reflect that some pods can still schedule until adding more would exceed `maxSkew`.
- The `nodeTaintsPolicy: Honor` explanation said tainted nodes are excluded from domain count. Updated it to clarify that nodes with taints the pod does not tolerate are excluded.
- The multiple spread constraints example implied an ordered "first, then" evaluation and a guaranteed final placement. Kubernetes combines multiple constraints with logical AND and scheduling can still depend on capacity and other predicates, so the comments and result wording were softened.
- The best-practice dry-run command used the incomplete `kubectl --dry-run` form. Updated it to `kubectl apply --dry-run=server -f manifest.yaml`, matching current kubectl flag values.

## Review Notes
All YAML snippets in the post parse successfully. `kubectl` is not installed in this review environment, so CLI behavior was checked against the official kubectl reference instead of local `kubectl --help` output.
