# Validation Summary: How to Replicate Workloads Across Multiple Clusters in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Fleet
- Rancher multi-cluster management
- Kubernetes
- GitOps
- Helm
- Kustomize
- kubectl

## Sources Consulted
- Fleet docs: Mapping to Downstream Clusters — https://fleet.rancher.io/how-tos-for-users/gitrepo-targets
- Fleet docs: GitRepo Resource — https://fleet.rancher.io/reference/ref-gitrepo
- Fleet docs: `fleet.yaml` reference — https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet docs: Custom Resources Spec — https://fleet.rancher.io/reference/ref-crds
- Fleet docs: List of Deployed Resources — https://fleet.rancher.io/reference/ref-resources
- Fleet docs: Status Fields — https://fleet.rancher.io/reference/ref-status-fields
- Fleet docs: Creating a Deployment — https://fleet.rancher.io/tutorials/tut-deployment
- Fleet docs: Troubleshooting — https://fleet.rancher.io/troubleshooting
- Kubernetes docs: Assigning Pods to Nodes — https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes API source docs: `PodAffinityTerm` — https://pkg.go.dev/k8s.io/kubernetes@v1.35.3/pkg/apis/core#PodAffinityTerm

## Issues Found
- The cluster-labeling example used `cluster.provisioning.cattle.io`, but Fleet target selectors operate on Fleet `Cluster` resources in the same workspace namespace. I changed the commands to label `clusters.fleet.cattle.io` in `fleet-default`.
- The verification step queried `BundleDeployment` objects in `fleet-default`, but Fleet creates `BundleDeployment` resources in per-cluster `cluster-fleet-...` namespaces. I changed the command to `kubectl get bundledeployments.fleet.cattle.io -A`.
- The sample status output did not reflect the documented GitRepo status structure. I replaced it with a representative example using documented fields such as `readyClusters`, `desiredReadyClusters`, `display.readyBundleDeployments`, and `resourceCounts`.
- The drift section implied Fleet automatically reverts drift by default and suggested checking a `DriftCorrected` event. Fleet documents drift correction behind `correctDrift`, with `enabled: false` by default. I updated the post to explicitly enable `correctDrift` and to inspect documented GitRepo status instead of relying on an undocumented event reason.
- The Helm values example included a `podAntiAffinity` term without a `labelSelector`. In Kubernetes, a null `PodAffinityTerm.labelSelector` matches no Pods, so that rule would not have any effect. I removed that block to keep the example technically valid and generic.

## Review Notes
- The post is technically accurate after the fixes above and aligns with current Fleet documentation as of 2026-04-23.
- `forceSyncGeneration` must be set to a new higher number each time you want to force another manual redeployment.
