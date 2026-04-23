# Validation Summary: How to Replicate Workloads Across Clusters in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Fleet
- Rancher multi-cluster management
- Kubernetes
- Kustomize
- GitOps
- `kubectl`
- CockroachDB

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Git repository contents and per-cluster customization: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet custom resources reference: https://fleet.rancher.io/reference/ref-crds
- Fleet deployment validation guide: https://fleet.rancher.io/validate-fleet-cli
- Fleet namespaces documentation: https://fleet.rancher.io/0.14/namespaces
- Fleet source for `BundleDeployment` and cluster label constants: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/bundledeployment_types.go
- Fleet source for cluster label constants: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/cluster_types.go
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Amazon Route 53 documentation overview: https://aws.amazon.com/documentation-overview/route53/
- Cloudflare Load Balancing documentation: https://developers.cloudflare.com/load-balancing/

## Issues Found
- The opening explanation implied workload replication alone provides automatic failover. I changed it to state that continued availability also depends on routing traffic to a healthy cluster, which aligns with the later global load balancer guidance.
- The verification example queried `BundleDeployment` objects in `fleet-default` and used `.spec.stagedOptions.name` as the cluster field. That field does not exist in the current Fleet CRD, and `BundleDeployment` objects are stored in per-cluster namespaces rather than the `GitRepo` namespace. I replaced the command with `kubectl get bundledeployments.fleet.cattle.io -A -L fleet.cattle.io/cluster`, which matches Fleet’s resource model and uses the documented cluster label.
- The failover test recommended cordoning all nodes in a cluster. `kubectl cordon` only marks nodes unschedulable and does not evict existing pods, so it does not properly simulate cluster failover. I changed this to draining worker nodes, which is the correct Kubernetes maintenance operation for evacuating workloads.
- The final best-practice bullet described AWS Route 53 as a global load balancer. Route 53 is a DNS and traffic-routing service, so I changed the wording to refer to a global traffic management layer and named Cloudflare’s load-balancing product explicitly.

## Review Notes
- The Fleet examples using `fleet.cattle.io/v1alpha1`, `GitRepo.spec.targets`, `fleet.yaml` `targetCustomizations`, and `kustomize.dir` are consistent with current Fleet documentation.
- Fleet documentation has some version-specific nuance around targeting behavior and `overrideTargets`; this post’s pattern remains valid because it uses `GitRepo.targets` for cluster selection and `targetCustomizations` for per-target configuration.
