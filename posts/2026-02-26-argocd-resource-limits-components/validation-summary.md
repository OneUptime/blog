# Validation Summary: How to Set Resource Limits for ArgoCD Components

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes resource requests and limits
- Kubernetes CLI (`kubectl`)
- Helm chart values
- Redis HA
- Dex

## Sources Consulted
- Kubernetes documentation: Resource Management for Pods and Containers, https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl reference: `kubectl set resources`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Argo CD documentation: High Availability and scaling guidance, https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo Helm chart values for `argo-cd`, https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- OneUptime linked article: How to Monitor ArgoCD Component Health, https://oneuptime.com/blog/post/2026-02-26-argocd-monitor-component-health/view

## Issues Found
- The introduction described the recommendations as "specific, tested recommendations." I changed this to "practical starting recommendations" because the exact sizing formulas are heuristic guidance rather than official Argo CD sizing guarantees.
- The post stated that setting limits too high "wastes cluster resources." Kubernetes scheduling is based on requests, not limits, so I changed this to say high limits can allow excessive node resource consumption during spikes.
- The API server section claimed that running behind a TLS-terminating load balancer reduces CPU usage by 20-30%. I removed the unsupported percentage and kept the technically accurate guidance that trusted TLS termination can reduce TLS work in the API server.
- The repo server section said Git clones are held in "memory/disk." Argo CD documents that the repo server clones repositories onto the local filesystem, `/tmp` by default, so I corrected that wording.
- The total resource request calculations for small, medium, and large deployments did not account correctly for replicas. I recalculated and updated them to approximately 1 CPU / 1.5Gi, 3 CPU / 3.7Gi, and 12 CPU / 14.6Gi respectively.
- The monitoring command comment said `kubectl top` checked usage versus limits, but `kubectl top pods --containers` reports current usage, not configured limits. I corrected the comment.
- The monitoring command comment said the JSON query checked CPU throttling, but it only reports readiness and restart counts. I corrected the comment to match the command behavior.

## Review Notes
The Argo CD Helm value paths used in the post match the current `argo-cd` chart structure. The sizing formulas remain operational heuristics and should be validated against real workload metrics before production rollout.
