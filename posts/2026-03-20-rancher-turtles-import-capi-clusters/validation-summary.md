# Validation Summary: How to Import CAPI Clusters into Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Rancher Turtles
- Cluster API (CAPI)
- Kubernetes
- kubectl
- clusterctl

## Sources Consulted
- Rancher Cluster API (CAPI) with Rancher Turtles overview: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/cluster-api
- Rancher Turtles Rancher Setup: https://turtles.docs.rancher.com/turtles/stable/en/tutorials/rancher.html
- Rancher Turtles Rancher Cluster Registration: https://turtles.docs.rancher.com/turtles/v0.26/en/user/rancher-cluster-registration.html
- Rancher Turtles Cluster Resource Relationships: https://turtles.docs.rancher.com/turtles/stable/en/user/cluster-resource-mapping.html
- Rancher Turtles Troubleshooting: https://turtles.docs.rancher.com/turtles/stable/en/troubleshooting/troubleshooting.html
- Cluster API `clusterctl get kubeconfig` command: https://release-1-7.cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Cluster API scaling docs: https://main.cluster-api.sigs.k8s.io/tasks/automated-machine-management/scaling

## Issues Found
- The post used `rancher-turtles-system` for the current Rancher Turtles system namespace. Updated the commands to `cattle-turtles-system`, which is the namespace documented for current Rancher-managed installations.
- The provider check used `kubectl get providers -A`, but Rancher Turtles manages installed providers through the `CAPIProvider` custom resource. Updated the command to `kubectl get capiproviders -A`.
- The main import example showed applying a generic `Cluster` manifest with placeholder types like `InfraCluster` and `RKE2ControlPlane`. Replaced it with the supported auto-import workflow: labeling the namespace or the existing `clusters.cluster.x-k8s.io` resource with `cluster-api.cattle.io/rancher-auto-import=true`.
- The post relied on unqualified `cluster` and `clusters` commands in an environment that also contains Rancher and Fleet `Cluster` resources. Updated verification commands to use fully qualified Cluster API resource names where needed.
- The Rancher import status check looked at `cluster.provisioning.cattle.io` in `fleet-default`. Updated it to `clusters.management.cattle.io`, which Rancher Turtles creates when auto-import succeeds.
- The kubeconfig example omitted the cluster namespace. Updated `clusterctl get kubeconfig` to pass `--namespace default`, matching Cluster API's namespaced cluster model.
- The troubleshooting commands used outdated namespaces for the Turtles and core CAPI controllers. Updated them to `cattle-turtles-system` and `cattle-capi-system` based on the current troubleshooting documentation.
- The comment `Return to management cluster` after `unset KUBECONFIG` overpromised what that command does. Revised it to describe returning to the default kubeconfig instead.

## Review Notes
- Rancher Turtles documentation now notes that starting with Rancher `v2.13`, Rancher Turtles is installed by default as a Rancher system chart.
- Current Rancher Turtles guidance recommends using a dedicated namespace for CAPI clusters instead of `default`; the post remains technically valid with `default`, but a dedicated namespace would be cleaner in practice.
- Auto-import occurs after the CAPI cluster reaches `ControlPlaneAvailable=True`; the post now reflects that behavior.
