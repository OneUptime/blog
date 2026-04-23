# Validation Summary: How to Create CAPI Clusters with Rancher Turtles

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Turtles
- Rancher Manager
- Cluster API (CAPI)
- Cluster API Provider RKE2 (CAPRKE2)
- Cluster API Provider AWS (CAPA)
- Cluster API Provider Docker (CAPD)
- Kubernetes
- `kubectl`
- `clusterctl`

## Sources Consulted
- Rancher Manager Cluster API overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/cluster-api/overview
- Rancher Turtles Rancher Cluster Registration: https://turtles.docs.rancher.com/turtles/v0.26/en/user/rancher-cluster-registration.html
- Rancher Turtles Cluster Resource Relationships: https://turtles.docs.rancher.com/turtles/stable/en/user/cluster-resource-mapping.html
- Cluster API book, concepts: https://main.cluster-api.sigs.k8s.io/user/concepts.html
- Cluster API book, `clusterctl init`: https://main.cluster-api.sigs.k8s.io/clusterctl/commands/init.html
- Cluster API book, `clusterctl generate cluster`: https://cluster-api.sigs.k8s.io/clusterctl/commands/generate-cluster.html
- Cluster API book, `clusterctl get kubeconfig`: https://release-1-5.cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Cluster API book, scaling: https://cluster-api.sigs.k8s.io/tasks/automated-machine-management/scaling.html
- CAPRKE2 API version reference: https://caprke2.docs.rancher.com/05_reference/01_api_versions.html
- CAPRKE2 Docker example: https://caprke2.docs.rancher.com/03_examples/03_docker.html
- CAPRKE2 AWS example: https://caprke2.docs.rancher.com/03_examples/01_aws.html

## Issues Found
- The introduction overstated Rancher Turtles behavior by saying CAPI clusters are imported automatically. I corrected it to reflect the documented requirement to add the `cluster-api.cattle.io/rancher-auto-import=true` label to the cluster or its namespace.
- The prerequisites were incomplete for the commands shown. I added `kubectl` and `clusterctl` because the post relies on both CLIs.
- The resource overview said a CAPI cluster requires `MachineDeployments`. I corrected that wording to describe the structure as typical instead, because control-plane-only clusters are valid Cluster API clusters.
- The Docker testing section mixed a generic Cluster API quickstart with Rancher Turtles guidance and did not show how auto-import is enabled. I replaced it with the current CAPRKE2 Docker template workflow and added the namespace auto-import label.
- The production example was not a valid current cluster manifest. It used `DockerCluster` for a production scenario, omitted the infrastructure and worker resources required to make the example work, and referenced the deprecated `controlplane.cluster.x-k8s.io/v1alpha1` API for `RKE2ControlPlane`. I replaced it with the documented CAPRKE2 AWS template generation flow.
- The monitoring commands used ambiguous resource names and omitted the namespace even though the example cluster is namespaced. I updated them to query the namespaced CAPI resources explicitly and added `--namespace capi-clusters` to `clusterctl get kubeconfig`.
- The Rancher verification command targeted `clusters.provisioning.cattle.io` in `fleet-default`, which Rancher Turtles now documents as legacy behavior. I changed it to query `clusters.management.cattle.io` using the documented CAPI owner labels.
- The scaling example targeted a worker `MachineDeployment` name that was never created by the example. I updated it to scale `production-cluster-md-0`, which matches the documented CAPRKE2 AWS template output, and added the namespace flag.
- The conclusion implied that auto-import applies to all clusters by default. I tightened the wording so it matches the label-driven workflow described in the documentation.

## Review Notes
- Current Rancher Turtles documentation increasingly emphasizes `ClusterClass` and topology-based examples with `v1beta2` APIs, but creating clusters from standard CAPI resources remains valid when you use supported provider templates and the Rancher auto-import label.
- The CAPRKE2 AWS example template is documented as air-gapped by default. For non air-gapped environments, the generated manifest should be adjusted to set `airGapped: false` before applying it.
- The Docker provider is appropriate for development and testing workflows, not for production cluster deployments.
