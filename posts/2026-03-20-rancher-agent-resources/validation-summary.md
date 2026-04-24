# Validation Summary: How to Configure Rancher Agent Resource Allocation - Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Fleet
- kubectl
- Kubernetes resource requests and limits
- Rancher cluster agent scheduling customization

## Sources Consulted
- Rancher Agents: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- Registered Clusters: https://ranchermanager.docs.rancher.com/v2.13/troubleshooting/other-troubleshooting-tips/registered-clusters
- Enabling Cluster Agent Scheduling Customization: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/enable-cluster-agent-scheduling-customization
- Fleet Overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Fleet Resource Limits: https://fleet.rancher.io/how-tos-for-operators/resource-limits
- Kubernetes `kubectl set resources`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Kubernetes `kubectl patch`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- RFC 6902 JSON Patch: https://datatracker.ietf.org/doc/html/rfc6902
- Rancher provisioning API type reference: https://pkg.go.dev/github.com/rancher/rancher/pkg/apis/provisioning.cattle.io/v1
- RKE Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration/rancher-server-configuration/rke1-cluster-configuration

## Issues Found
- The introduction said every Rancher-managed cluster runs `cattle-node-agent` and `fleet-agent` alongside `cattle-cluster-agent`. I corrected this to reflect current Rancher behavior: `cattle-node-agent` is cluster-type specific, newer Rancher-provisioned clusters use `rancher-system-agent`, and Fleet runs in `cattle-fleet-system` when enabled.
- Step 1 used the wrong namespace for Fleet commands (`fleet-system`). I corrected the namespace to `cattle-fleet-system` and aligned the inspection commands with Fleet's documented deployment namespace.
- Steps 2 and 3 used JSON Patch `replace` operations against the `resources` field. I replaced those commands with `kubectl set resources`, because JSON Patch `replace` requires the target path to exist and Rancher documents that `cattle-cluster-agent` does not define default resource requests.
- Step 4 incorrectly described Rancher Helm/API configuration for downstream agent resources. I replaced it with the supported Rancher configuration fields: `clusterAgentDeploymentCustomization.overrideResourceRequirements` for Rancher cluster configuration and `spec.agentResources` on the Fleet `Cluster` resource.
- Steps 5 through 7 manually patched `nodeSelector`, `priorityClassName`, and `tolerations` on Rancher-managed deployments. I replaced these with Rancher-supported guidance: use the `cattle.io/cluster-agent=true` node label when control plane nodes are not visible, enable Rancher's scheduling customization feature for managed PriorityClass/PDB objects, and verify Rancher-managed tolerations instead of overwriting them.
- Step 8 described an environment-variable check as a websocket connectivity check. I corrected the wording so the command description matches what it actually verifies.

## Review Notes
- Example CPU and memory values in the post remain illustrative. Rancher documents a baseline request recommendation for `cattle-cluster-agent`, but production values should still be tuned from observed usage in the target environment.
- `cattle-node-agent` applies to legacy RKE clusters. Rancher RKE1 reached end of life on July 31, 2025, so newer Rancher-provisioned RKE2/K3s clusters use `rancher-system-agent` instead.
