# Validation Summary: How to Enable and Configure Vertical Pod Autoscaler in GKE to Right-Size

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Vertical Pod Autoscaler (VPA)
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Kubernetes resource requests and limits
- PodDisruptionBudget
- gcloud CLI
- kubectl
- Cloud Monitoring

## Sources Consulted
- GKE Vertical Pod autoscaling concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler
- GKE guide to scale container resource requests and limits with VPA: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/vertical-pod-autoscaling
- GKE Horizontal Pod autoscaling concepts and limitations: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/horizontalpodautoscaler
- Google Cloud SDK reference for `gcloud container clusters update`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK reference for `gcloud container clusters create`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/

## Issues Found
- The post said to verify GKE VPA by looking for `vpa-*` pods in `kube-system`. GKE runs VPA as managed control plane processes, so I replaced that check with cluster/API verification commands.
- The update modes section omitted the current `InPlaceOrRecreate` mode and described `Auto` as future-facing. I updated the list to include `InPlaceOrRecreate`, its GKE version requirement, and Preview status.
- The HPA/VPA example used HPA on CPU and VPA on memory. GKE documentation says not to combine HPA with VPA on CPU or memory outside supported multidimensional Pod autoscaling, so I changed the example to HPA on an external metric.
- The Cloud Monitoring metric search string was not aligned with current GKE documentation. I replaced it with the documented Metrics Explorer resource, category, and metric names.
- The best practices section overstated PDB behavior and said VPA adjusts requests, not limits. I clarified that PDBs provide an availability rule for evictions and that VPA can control requests only or requests and limits depending on `controlledValues`.
- The single-replica warning assumed a hard two-replica minimum. I softened it to a downtime warning for single-replica workloads because GKE's default `minReplicas` depends on version and can be overridden.

## Review Notes
The `gcloud` CLI is not installed in this workspace, so CLI flags were verified against official Google Cloud SDK documentation instead of local `--help` output. The post is technically valid after the targeted corrections above.
