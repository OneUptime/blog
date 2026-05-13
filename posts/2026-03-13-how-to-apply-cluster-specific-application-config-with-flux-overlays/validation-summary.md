# Validation Summary: How to Apply Cluster-Specific Application Config with Flux Overlays

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux Kustomization
- Kustomize overlays and patches
- Kubernetes Deployments
- Kubernetes ConfigMaps
- Kubernetes Ingress
- Kubernetes HorizontalPodAutoscaler
- Kubernetes PodDisruptionBudget
- Kubernetes topology spread constraints

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kustomize API type reference: https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
- The Deployment examples set and patched `.spec.replicas` while an HPA targeted the same Deployment. Kubernetes documentation recommends not setting `.spec.replicas` when a HorizontalPodAutoscaler manages the workload. Removed the base `replicas` field, removed overlay replica patches, and adjusted nearby text/diagram labels to describe HPA bounds instead.
- The production Flux Kustomization example set `wait: true` together with `healthChecks`. Flux documents that `.spec.healthChecks` is ignored when `.spec.wait` is true. Removed `wait: true` from the production example so the listed health check is meaningful.
- The repository tree listed `config.env` files that were never referenced by any Kustomize generator or resource in the tutorial. Removed those unused files from the tree to keep the structure accurate.
- The common labels example used `commonLabels`, which Kustomize marks deprecated in favor of `labels`. Replaced it with the current `labels` syntax.

## Review Notes
YAML snippets were parsed locally after the edits. The local environment did not include the `kustomize`, `kubectl`, or `flux` CLIs, so command behavior was verified against official documentation rather than local CLI execution.
