# Validation Summary: How to Troubleshoot Rancher Turtles Cluster Provisioning

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Turtles
- Rancher Manager
- Cluster API (CAPI)
- clusterctl
- kubectl
- RKE2
- Kubernetes

## Sources Consulted
- Rancher Turtles Rancher setup: https://turtles.docs.rancher.com/turtles/stable/en/tutorials/rancher.html
- Rancher Turtles first cluster tutorial: https://turtles.docs.rancher.com/turtles/stable/en/tutorials/first-cluster.html
- Rancher Turtles troubleshooting guide: https://turtles.docs.rancher.com/turtles/stable/en/troubleshooting/troubleshooting.html
- Rancher Turtles ClusterClass guide: https://turtles.docs.rancher.com/turtles/stable/en/user/clusterclass.html
- Rancher Turtles cluster resource mapping: https://turtles.docs.rancher.com/turtles/stable/en/user/cluster-resource-mapping.html
- Rancher Turtles Rancher cluster registration: https://turtles.docs.rancher.com/turtles/v0.26/en/user/rancher-cluster-registration.html
- Rancher Turtles official Docker + RKE2 example cluster: https://raw.githubusercontent.com/rancher/turtles/main/examples/clusters/docker/rke2/cluster.yaml
- Rancher Turtles official Docker + RKE2 ClusterClass: https://raw.githubusercontent.com/rancher/turtles/main/examples/clusterclasses/docker/rke2/clusterclass-docker-rke2.yaml
- Cluster API `clusterctl describe cluster`: https://cluster-api.sigs.k8s.io/clusterctl/commands/describe-cluster.html
- Cluster API `clusterctl get kubeconfig`: https://release-1-7.cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Cluster API troubleshooting guide: https://release-1-8.cluster-api.sigs.k8s.io/user/troubleshooting
- Cluster API managed topology operations: https://cluster-api.sigs.k8s.io/tasks/experimental-features/cluster-class/operate-cluster.html?highlight=upgrade+cluster
- Cluster API upstream `describe cluster` command source: https://raw.githubusercontent.com/kubernetes-sigs/cluster-api/main/cmd/clusterctl/cmd/describe_cluster.go
- Cluster API upstream `get kubeconfig` command source: https://raw.githubusercontent.com/kubernetes-sigs/cluster-api/main/cmd/clusterctl/cmd/get_kubeconfig.go
- CAPRKE2 CRD for `RKE2ControlPlane`: https://raw.githubusercontent.com/rancher/cluster-api-provider-rke2/main/controlplane/config/crd/bases/controlplane.cluster.x-k8s.io_rke2controlplanes.yaml
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes field selectors reference: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The post used outdated Rancher Turtles namespaces and a generic provider query. I updated `rancher-turtles-system` to `cattle-turtles-system`, `capi-system` to `cattle-capi-system`, and changed the provider check to `kubectl get capiproviders -A` to match current Rancher Turtles behavior.
- The sample cluster manifest was not runnable as written. It used placeholder and outdated API details such as `InfraCluster`, `cluster.x-k8s.io/v1beta1`, and `controlplane.cluster.x-k8s.io/v1alpha1`. I replaced it with a current ClusterClass-based `Cluster` example using `cluster.x-k8s.io/v1beta2`, `topology.classRef`, and the official Docker + RKE2 prerequisites.
- The Rancher import-status command targeted legacy `cluster.provisioning.cattle.io` resources in `fleet-default`. Current Rancher Turtles creates `clusters.management.cattle.io` resources for auto-import, so I updated the verification command accordingly and filtered it by the documented ownership labels.
- The worker-scaling example assumed a direct `MachineDeployment` name that does not fit the current ClusterClass-managed example. I changed it to the supported `kubectl patch cluster ... /spec/topology/workers/machineDeployments/0/replicas` workflow documented for managed topologies.
- The troubleshooting section only referenced old controller namespaces and used event sorting via `.lastTimestamp`. I updated log collection to current namespaces, added CAPRKE2 controller logs, and changed event sorting to `.metadata.creationTimestamp`, which is consistently available.
- The post used `clusterctl` commands without listing `clusterctl` as a prerequisite. I added that prerequisite so the command examples are self-consistent.

## Review Notes
- Rancher Turtles documentation currently contains a mix of older v1beta1-style examples and newer v1beta2-style examples depending on the page and version. This review standardized the post on the current v1beta2 `Cluster` example format used in the official Rancher Turtles repository.
- `kubectl` and `clusterctl` were not installed in the local review workspace, so CLI flag validation was performed against official Kubernetes and Cluster API documentation plus upstream Cluster API command source.
