# Validation Summary: Verify Pod Networking with Calico on GKE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Standard network policy enforcement
- Calico
- Kubernetes NetworkPolicy
- Kubernetes namespaces and pod labels
- `gcloud`
- `kubectl`
- `calicoctl`
- BusyBox test containers

## Sources Consulted
- Google Cloud GKE network policy documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Google Cloud GKE networking model documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/gke-compare-network-models
- Google Cloud GKE REST Cluster resource documentation: https://cloud.google.com/kubernetes-engine/docs/reference/rest/v1/projects.locations.clusters
- Google Cloud SDK `gcloud container clusters describe` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/describe
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes namespace documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Calico Kubernetes datastore documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore

## Issues Found
- The post described Calico availability too broadly for GKE. Updated the introduction to specify GKE Standard clusters that don't use GKE Dataplane V2, because GKE Dataplane V2 uses Cilium-based policy enforcement and Autopilot always uses Dataplane V2.
- The post referred to "GKE's Alias IP CNI." Updated this to "GKE's VPC-native networking model" because Alias IP ranges are part of GKE IP allocation, not a CNI name.
- The `gcloud container clusters describe` command used `networkConfig.enableNetworkPolicy`, which is not the documented Cluster API field. Changed it to `networkPolicy.enabled`.
- The Calico verification command checked for `calico-node` pods. Updated it to the GKE-documented readiness check, `kubectl get nodes -l projectcalico.org/ds-ready=true`, for clusters that don't use GKE Dataplane V2.
- The examples could race pod startup before `kubectl exec` or IP checks. Added `kubectl wait --for=condition=Ready` commands for the test pods.
- The BusyBox `wget` commands used the long `--timeout=5` option. Changed them to `-T 5`, which is compatible with BusyBox wget.
- The cross-namespace test comment called the same-namespace ingress policy a "deny-all policy." Updated the wording to "namespace isolation policy" to match what the NetworkPolicy actually does.

## Review Notes
The Kubernetes NetworkPolicy manifests are syntactically valid and use the stable `networking.k8s.io/v1` API. The `kubernetes.io/metadata.name` namespace label is documented by Kubernetes and is appropriate for selecting the external namespace on current GKE versions. The `calicoctl get workloadendpoint` commands are consistent with Calico's Kubernetes datastore model, where workload endpoints are backed by Kubernetes pods.
