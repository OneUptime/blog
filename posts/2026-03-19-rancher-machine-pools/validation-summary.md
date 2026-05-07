# Validation Summary: How to Set Up Machine Pools for Cluster Provisioning

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- K3s
- Kubernetes
- Cluster API
- MachineHealthCheck
- `kubectl`
- cloud-init

## Sources Consulted
- Rancher: Creating an Amazon EC2 Cluster - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/create-an-amazon-ec2-cluster
- Rancher: RKE2 Cluster Configuration Reference - https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher: Nodes and Machine Pools - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/manage-clusters/nodes-and-machine-pools
- Cluster API Book: Configure a MachineHealthCheck - https://cluster-api.sigs.k8s.io/tasks/automated-machine-management/healthchecking.html
- Cluster API Book: Scaling Nodes - https://cluster-api.sigs.k8s.io/tasks/automated-machine-management/scaling
- Cluster API Book: Labels and Annotations - https://cluster-api.sigs.k8s.io/reference/api/labels-and-annotations
- Kubernetes: Labels and Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- cloud-init: Module reference - https://cloudinit.readthedocs.io/en/stable/reference/modules.html

## Issues Found
- The Rancher cluster-creation flow listed the provider selection before choosing the `RKE2` or `K3s` provisioning path. It was corrected to match the current Rancher provider guides.
- The version example used a wildcard-style value (`v1.28.x+rke2r1`) that is not an actual Rancher UI selection. It was corrected to say to choose a supported Rancher-listed release.
- The machine-pool advanced-options example used undocumented generic fields (`Max Unhealthy`, `Machine Deploy Strategy`, `Max Surge`, `Max Unavailable`) in the Rancher UI section. It was corrected to Rancher's documented `Auto Replace` and `Drain Before Delete` options.
- The cloud-init example was too broadly presented as generic machine-pool behavior and applied sysctl settings inconsistently. It was corrected to note that cloud-init or user-data support is provider-dependent, and the example now writes sysctl settings to `/etc/sysctl.d` and applies them with `sysctl --system`.
- The labels example used reserved Kubernetes prefixes (`node.kubernetes.io/*`) and manually assigned topology-style labels. It was corrected to use safe user-defined label keys.
- The MachineHealthCheck manifest used the deprecated `cluster.x-k8s.io/v1beta1` shape and selected `cluster.x-k8s.io/pool-name`, which is for `MachinePool` resources rather than `MachineDeployment`-owned machines. It was corrected to the current `v1beta2` schema with a `cluster.x-k8s.io/deployment-name` selector.
- The rolling-update snippet was valid Cluster API YAML, but it was presented as if it were a Rancher form field. It was clarified that this configuration applies when managing the underlying Cluster API `MachineDeployment` directly.
- The deletion section implied nodes are always drained before a machine pool is removed. It was corrected to note that this depends on `Drain Before Delete` being enabled.

## Review Notes
- `Rancher v2.6 or later` remains broadly true for feature availability, but the Rancher documentation is version-sensitive and the v2.6 docs are archived. Exact UI fields and supported Kubernetes versions vary by Rancher release.
- The direct `kubectl` examples assume the Rancher-managed provisioning resources are in `fleet-default`, which is typical for Rancher-provisioned downstream clusters. Operators should verify the namespace in their management cluster before scripting against it.
