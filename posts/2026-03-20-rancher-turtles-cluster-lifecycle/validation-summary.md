# Validation Summary: How to Manage CAPI Cluster Lifecycle with Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Rancher Turtles
- Cluster API (CAPI)
- Cluster API Provider RKE2 (CAPRKE2)
- `clusterctl`
- `kubectl`
- Kubernetes custom resources such as `Cluster`, `MachineDeployment`, and `clusters.management.cattle.io`

## Sources Consulted
- Rancher Turtles Rancher Setup: https://turtles.docs.rancher.com/turtles/stable/en/tutorials/rancher.html
- Rancher Turtles Troubleshooting: https://turtles.docs.rancher.com/turtles/stable/en/troubleshooting/troubleshooting.html
- Rancher Turtles Cluster Resource Relationships: https://turtles.docs.rancher.com/turtles/stable/en/user/cluster-resource-mapping.html
- Rancher Turtles Rancher Cluster Registration: https://turtles.docs.rancher.com/turtles/v0.26/en/user/rancher-cluster-registration.html
- Cluster API Provider RKE2 Getting Started: https://caprke2.docs.rancher.com/01_user/01_getting-started.html
- Cluster API Provider RKE2 Docker example: https://caprke2.docs.rancher.com/03_examples/03_docker.html
- CAPRKE2 Docker cluster template: https://raw.githubusercontent.com/rancher/cluster-api-provider-rke2/main/examples/templates/docker/cluster-template.yaml
- Cluster API `clusterctl generate yaml` reference: https://cluster-api.sigs.k8s.io/clusterctl/commands/generate-yaml
- Cluster API `clusterctl get kubeconfig` reference: https://release-1-7.cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig

## Issues Found
- The post used the outdated Rancher Turtles namespace `rancher-turtles-system`. Updated it to `cattle-turtles-system`, which is the current namespace used when Rancher Turtles is embedded in Rancher v2.13+.
- The post checked `kubectl get providers -A`, but current Rancher Turtles workflows manage providers through the `CAPIProvider` resource. Updated this to `kubectl get capiproviders -A`.
- The YAML example was not a working CAPI manifest: it used placeholder kinds like `InfraCluster`, mixed deprecated API versions, and omitted the provider-specific resources required for a functional cluster. Replaced it with a workflow that generates a real manifest from the official CAPRKE2 Docker template and then labels the resulting CAPI cluster for Rancher auto-import.
- The verification commands used ambiguous `clusters` shortcuts inside an environment that contains multiple different `Cluster` CRDs. Updated them to fully qualified CAPI resources such as `clusters.cluster.x-k8s.io` and related resource groups.
- The Rancher import-status check targeted `clusters.provisioning.cattle.io` in `fleet-default`, which reflects older Rancher/Turtles behavior. Updated it to `kubectl get clusters.management.cattle.io`, matching current Rancher Turtles import behavior.
- The scale example referenced a non-existent generic MachineDeployment name. Updated it to `worker-md-0`, which matches the official CAPRKE2 Docker template used in the corrected workflow.
- The `clusterctl get kubeconfig` example omitted the namespace even though Cluster API clusters are namespace-scoped. Updated it to include `--namespace capi-clusters`.
- The troubleshooting commands used the outdated core CAPI namespace `capi-system`. Updated the controller log command to `cattle-capi-system`, matching current Rancher Turtles troubleshooting guidance.

## Review Notes
- The corrected creation flow is now explicitly Docker-provider-based because a provider-agnostic `Cluster` manifest is not runnable on its own; CAPI requires provider-specific infrastructure and control plane resources.
- The title and description mention upgrades and deletion, but this post’s concrete walkthrough still primarily covers creation, import, verification, and scaling. Upgrade and deletion workflows are documented separately in Rancher Turtles and Cluster API references.
