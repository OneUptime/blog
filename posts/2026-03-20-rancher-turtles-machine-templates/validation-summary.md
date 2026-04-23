# Validation Summary: How to Configure CAPI Machine Templates

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Turtles
- Rancher Manager
- Cluster API (CAPI)
- Cluster API Provider RKE2 (CAPRKE2)
- Docker infrastructure provider for Cluster API
- Kubernetes
- `kubectl`
- `clusterctl`

## Sources Consulted
- Rancher Turtles Rancher setup docs: https://turtles.docs.rancher.com/turtles/stable/en/tutorials/rancher.html
- Rancher Turtles cluster registration docs: https://turtles.docs.rancher.com/turtles/v0.26/en/user/rancher-cluster-registration.html
- Rancher Turtles troubleshooting docs: https://turtles.docs.rancher.com/turtles/stable/en/troubleshooting/troubleshooting.html
- Rancher Turtles CAPIProvider reference: https://turtles.docs.rancher.com/turtles/stable/en/reference/capiprovider.html
- Cluster API book, concepts: https://main.cluster-api.sigs.k8s.io/user/concepts.html
- Cluster API book, updating machine infrastructure and bootstrap templates: https://cluster-api.sigs.k8s.io/tasks/updating-machine-templates
- Cluster API book, clusterctl commands: https://cluster-api.sigs.k8s.io/clusterctl/commands/commands
- Cluster API book, get kubeconfig: https://release-1-7.cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Cluster API provider contract for v1beta2 control planes: https://main.cluster-api.sigs.k8s.io/developer/providers/contracts/control-plane
- CAPRKE2 API version reference: https://caprke2.docs.rancher.com/05_reference/01_api_versions.html
- CAPRKE2 Docker template example: https://raw.githubusercontent.com/rancher/cluster-api-provider-rke2/main/examples/templates/docker/cluster-template.yaml

## Issues Found
- The original post used outdated Rancher Turtles namespaces (`rancher-turtles-system` and `capi-system`) for current Rancher-integrated installations. I updated the commands to use `cattle-turtles-system` and `cattle-capi-system`, which match the current stable Rancher Turtles documentation.
- The provider check command was too generic for current Rancher Turtles usage. I replaced `kubectl get providers -A` with `kubectl get capiproviders.turtles-capi.cattle.io -A` to match the documented `CAPIProvider` resource used by Rancher Turtles.
- The main YAML example was not a valid machine-template configuration. It used the deprecated shape for references, a non-existent `InfraCluster` kind, and an outdated `RKE2ControlPlane` API version. I replaced it with a current CAPI v1beta2 and CAPRKE2 v1beta2 example that includes `DockerCluster`, `RKE2ControlPlane`, `DockerMachineTemplate`, `MachineDeployment`, and `RKE2ConfigTemplate`.
- The original example did not actually demonstrate how machine templates are configured. I corrected the overview and example so the post now shows the control plane template reference at `RKE2ControlPlane.spec.machineTemplate.spec.infrastructureRef` and the worker template reference at `MachineDeployment.spec.template.spec.infrastructureRef`.
- The Rancher import verification command targeted `clusters.provisioning.cattle.io`, which current Rancher Turtles docs describe as legacy and not automatically created for new Turtles-managed clusters. I updated the verification step to check `clusters.management.cattle.io` instead.
- The common operations section did not reflect machine-template update behavior. I replaced the generic worker example with commands that scale the `MachineDeployment` in the correct namespace and patch the `MachineDeployment` to point at a new machine template revision, which matches Cluster API’s immutable-template workflow.
- The kubeconfig retrieval command omitted the namespace even though the revised example uses a dedicated namespace. I added `--namespace capi-clusters` so the command works as shown.
- The troubleshooting commands referenced the wrong namespaces for current Rancher Turtles installs and did not include the RKE2 control plane controller. I corrected the namespaces and added the `rke2-control-plane-system` log command.

## Review Notes
- The example now uses the Docker infrastructure provider because it is the simplest official provider-specific machine template example to show end-to-end. On AWS, Azure, or vSphere, the machine template kind changes to the corresponding provider resource such as `AWSMachineTemplate`, `AzureMachineTemplate`, or `VSphereMachineTemplate`.
- The post now reflects current v1beta2-style reference fields (`apiGroup`/`kind`/`name`) instead of older `apiVersion`-based object references.
- Rancher Turtles documentation currently recommends avoiding the Kubernetes `default` namespace for CAPI cluster resources. The example was moved to `capi-clusters` to align with that guidance.
