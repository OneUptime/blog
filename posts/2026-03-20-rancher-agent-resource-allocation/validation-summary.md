# Validation Summary: How to Configure Rancher Agent Resource Allocation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher agents (`cattle-cluster-agent`, `cattle-node-agent`, `rancher-system-agent`)
- Fleet / `fleet-agent`
- Kubernetes
- `kubectl`
- Rancher `provisioning.cattle.io/v1` Cluster configuration

## Sources Consulted
- Rancher Agents: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- Registered Clusters troubleshooting: https://ranchermanager.docs.rancher.com/v2.14/troubleshooting/other-troubleshooting-tips/registered-clusters
- RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- K3s Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/k3s-cluster-configuration
- Fleet resource limits: https://documentation.suse.com/cloudnative/continuous-delivery/v0.15/en/how-tos-for-operators/resource-limits.html
- Rancher provisioning Cluster API types: https://github.com/rancher/rancher/blob/main/pkg/apis/provisioning.cattle.io/v1/cluster_types.go
- Rancher generated provisioning cluster CRD: https://github.com/rancher/rancher/blob/main/pkg/crds/yaml/generated/provisioning.cattle.io_clusters.yaml
- Rancher cluster agent template source: https://github.com/rancher/rancher/blob/main/pkg/systemtemplate/template.go
- `kubectl set resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes resource metrics pipeline: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline

## Issues Found
- The post used `kubectl patch --type=merge` to update container resources. For Kubernetes objects with pod template container lists, JSON merge patch can replace the entire `containers` array. I replaced those examples with `kubectl set resources`, which is the documented safe CLI for updating requests and limits on Deployments and DaemonSets.
- The Rancher cluster-spec example used incorrect YAML keys for agent resources. I replaced the invalid `cattle-cluster-agent:` block with the documented Rancher fields `spec.clusterAgentDeploymentCustomization.overrideResourceRequirements` and `spec.fleetAgentDeploymentCustomization.overrideResourceRequirements`.
- The post treated `cattle-node-agent` as a generic downstream Rancher component. Current Rancher documentation distinguishes `cattle-node-agent` for Rancher-created RKE clusters and `rancher-system-agent` for Rancher-provisioned RKE2/K3s nodes. I corrected the introduction, component table, and node-agent section to reflect that scope.
- The scheduling section advised patching a `nodeSelector` onto `cattle-cluster-agent`. Rancher already applies preferred scheduling rules for control plane nodes and documents `cattle.io/cluster-agent=true` as the supported way to prefer a node when control-plane labels are not visible. I replaced the unsupported patch example with the documented node label approach.
- The Fleet namespace in the monitoring section was incorrect. I changed `fleet-system` to `cattle-fleet-system` and updated the monitoring commands to the documented `kubectl top pod` form, with a note that Metrics Server is required and Fleet checks are conditional on Fleet being installed.
- The conclusion made an unsupported sizing recommendation tied to cluster and workload counts. I replaced it with Rancher’s documented baseline request for `cattle-cluster-agent` (`50m` CPU, `100Mi` memory) and guidance to scale from observed usage.

## Review Notes
- Live commands were not executed against a Rancher-managed cluster because no cluster context was provided; command correctness was validated against official Kubernetes and Rancher documentation and Rancher source/CRD definitions.
- The `cattle-node-agent` guidance is only relevant for legacy Rancher-created RKE clusters. Current Rancher-managed RKE2/K3s clusters use `rancher-system-agent` on the node instead.
