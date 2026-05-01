# Validation Summary: How to Provision Kubernetes Clusters with Elemental

## Status
validated

## Post Type
Guide

## Technologies Covered
- Elemental / SUSE Rancher Prime: OS Manager
- Rancher cluster provisioning
- Kubernetes
- RKE2
- `kubectl`

## Sources Consulted
- SUSE OS Manager `MachineInventorySelectorTemplate` reference: https://documentation.suse.com/cloudnative/os-manager/latest/en/references/machineinventoryselectortemplate-reference.html
- SUSE OS Manager `MachineInventorySelector` reference: https://documentation.suse.com/cloudnative/os-manager/1.5/en/machineinventoryselector-reference.html
- SUSE OS Manager `Cluster` reference: https://documentation.suse.com/cloudnative/os-manager/1.5/en/cluster-reference.html
- SUSE Edge Elemental quickstart (`Create downstream clusters` / UI flow): https://documentation.suse.com/en-us/suse-edge/3.3/html/edge/quickstart-elemental.html
- Kubernetes `kubectl` quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Official Elemental operator `MachineInventorySelector` type: https://github.com/rancher/elemental-operator/blob/main/api/v1beta1/machineselector_types.go
- Official Elemental operator `MachineInventorySelectorTemplate` type: https://github.com/rancher/elemental-operator/blob/main/api/v1beta1/machineselectortemplate_types.go
- Official Elemental operator `MachineInventory` type: https://github.com/rancher/elemental-operator/blob/main/api/v1beta1/machineinventory_types.go

## Issues Found
- The post used `MachineInventorySelector` as the user-created resource for cluster provisioning. Rancher Elemental cluster provisioning uses `MachineInventorySelectorTemplate`, which defines the selector criteria and is referenced from `spec.rkeConfig.machinePools[].machineConfigRef`. I updated the description, introduction, Step 2 resource kind and schema, and the conclusion accordingly.
- Step 2 only created one selector object, while the cluster YAML referenced two template names (`cp-selector-template` and `worker-selector-template`). I replaced the example with two `MachineInventorySelectorTemplate` definitions so the YAML now matches the resources created earlier in the post.
- The Rancher UI flow was inaccurate. The documented Elemental flow is through **OS Management** > **Inventory of Machines** > **Actions** > **Create Elemental Cluster**, not **Cluster Management** > **Create** > **Elemental**. I corrected Step 3 to match the official UI workflow.
- The monitoring commands used incorrect resource and field references. I replaced `kubectl get cluster` with `kubectl get clusters.provisioning.cattle.io`, replaced the invalid `MachineInventory.spec.machineRef` lookup with `MachineInventorySelector.status.machineInventoryRef`, and updated event sorting to the documented `.metadata.creationTimestamp` field.
- The description referred to "Rancher cluster templates", but the post uses Rancher provisioning `Cluster` resources rather than the legacy cluster-template feature. I corrected that terminology.

## Review Notes
- The `kubernetesVersion` field format shown in the YAML example is correct, but the exact RKE2 or K3s version must match the Rancher-supported versions for the Rancher release in use.
