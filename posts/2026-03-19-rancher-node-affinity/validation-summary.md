# Validation Summary: How to Set Node Affinity and Anti-Affinity in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes
- `kubectl`
- YAML manifests for Kubernetes workloads

## Sources Consulted
- Kubernetes: Assigning Pods to Nodes — https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes: `kubectl label` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes: Field Selectors — https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Rancher: Deploying Workloads — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/workloads-and-pods/deploy-workloads
- Rancher: Nodes and Machine Pools — https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/manage-clusters/nodes-and-machine-pools
- Rancher: Launching Kubernetes on New Nodes in an Infrastructure Provider — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider

## Issues Found
- The sample node labels in Step 1 did not satisfy the required node-affinity example in Step 2. I updated the label examples so some nodes actually match `environment=production` plus `hardware in (standard, high-memory)`.
- The zone anti-affinity example used `requiredDuringSchedulingIgnoredDuringExecution` with `topology.kubernetes.io/zone`. Kubernetes documents that hard pod anti-affinity is commonly limited by the `LimitPodHardAntiAffinityTopology` admission controller to `kubernetes.io/hostname`. I changed the example to `preferredDuringSchedulingIgnoredDuringExecution` and added a note explaining the hard-rule caveat.
- The zone-label examples only labeled a subset of nodes. Kubernetes documents that pod anti-affinity relies on consistent `topologyKey` labeling across nodes. I updated the example labels so all sample nodes have zone labels.
- Several Rancher UI instructions used unverified, version-specific button or tab labels. I replaced them with the documented `Nodes`, `Workloads`, and `Node Scheduling` flow so the guidance stays accurate across Rancher versions.
- The best-practices section used shorthand field names and referred to automating labels through node templates only. I corrected the field names to their full Kubernetes API names and generalized the Rancher automation guidance to provisioning workflows or node pools.

## Review Notes
- Rancher UI wording varies by release, so version-agnostic navigation is safer unless the post is pinned to a specific Rancher version.
- The article title uses “anti-affinity” broadly, but the body now correctly distinguishes node affinity from pod affinity and pod anti-affinity.
- Some workload image names are illustrative placeholders for scheduling examples rather than Rancher-specific requirements.
