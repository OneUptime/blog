# Validation Summary: How to configure Kustomize replicas for environment-specific scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- Kubernetes Deployments
- Kubernetes StatefulSets
- Kubernetes ReplicaSets and ReplicationControllers
- Horizontal Pod Autoscaler
- Kubernetes resource requests and limits
- Kubernetes topology spread constraints and pod anti-affinity

## Sources Consulted
- Kustomize replicas reference: https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/site/content/en/docs/Reference/API/Kustomization%20File/replicas.md
- Kustomize Kustomization type source: https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/api/types/kustomization.go
- Kustomize Replica type and transformer source: https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/api/types/replica.go
- Kustomize default replica field specs: https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/api/internal/konfig/builtinpluginconsts/replicas.go
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
- The post used the deprecated Kustomize `bases` field in overlay examples. Replaced `bases` with `resources` throughout the snippets because current Kustomize source marks `bases` as deprecated and recommends `resources`.
- The post described Kustomize `replicas` support as covering Deployments, StatefulSets, and ReplicaSets only. Added ReplicationControllers because Kustomize's default replica field specs also include `ReplicationController`.
- The high availability example implied replica count alone spreads Pods across availability zones. Adjusted the wording and added a note that topology spread constraints or pod anti-affinity are needed to enforce zone placement.
- The resource capacity explanation used `1GB` and `20GB` for Kubernetes memory quantities configured as `1Gi`. Updated the text to `1Gi` and `20Gi` to match Kubernetes binary memory quantity suffixes.
- The HPA section recommended setting `replicas` as an initial count while HPA manages the workload. Reworked the example to let HPA own the replica count through `minReplicas`, and removed the repeated `spec.replicas` source from the Kustomize overlay to avoid apply-time scaling conflicts.
- After replacing `bases` with `resources`, the HPA snippet would have had duplicate `resources` keys. Merged the base and `hpa.yaml` entries into a single `resources` list.
- The `namePrefix` zero-replica example targeted prefixed resource names in `replicas`. Updated it to target the base resource names, and verified with Kustomize v5.8.1 that the build output still applies the prefix and sets `replicas: 0`.

## Review Notes
The corrected examples use current Kustomize `kustomization.yaml` fields and Kubernetes `autoscaling/v2`. Local `kubectl` and `kustomize` were not installed initially, so Kustomize v5.8.1 was downloaded to a temporary directory to verify the `namePrefix` plus `replicas` behavior.
