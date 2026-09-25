# Validation Summary: How to Choose Pod Anti-Affinity vs Topology Spread for High Availability

## Status
validated

## Post Type
Technical guide with Kubernetes pod-template configuration examples.

## Technologies Covered
- Kubernetes scheduling and high availability
- Required and preferred inter-pod anti-affinity
- Pod topology spread constraints and failure-domain labels
- Deployment rolling updates
- PodDisruptionBudgets
- YAML pod-template configuration

## Sources Consulted
- Kubernetes: Assigning Pods to Nodes — https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes: Pod Topology Spread Constraints — https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes: Deployments — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes: Disruptions — https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Author profile link checked — https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Both YAML examples parsed successfully with PyYAML. Field names, nesting, topology keys, selectors, and scheduling policy values match the official documentation. These are pod-template fragments, not standalone manifests; a complete workload must supply metadata, matching pod labels, containers, and other required fields. No deprecated fields were identified.
- Required hostname anti-affinity supports the stated one-matching-replica-per-host behavior. The default namespace scope and conditional restriction imposed by LimitPodHardAntiAffinityTopology are correctly described. Preferred anti-affinity does not guarantee separation.
- The spread example correctly combines hard zone distribution with soft hostname distribution. Six matching replicas can reach 2/2/2 under the stated eligibility and capacity assumptions. The description of maxSkew relative to the global minimum is correct. Spread counts matching pods in the incoming pod's namespace.
- Domain eligibility is distinct from available CPU or memory. A failed or resource-exhausted domain can still affect scheduling calculations, depending on node labels and inclusion policies. The recommended failure tests appropriately account for this distinction. Omitting minDomains does not require three zones; configuring that field on releases before Kubernetes 1.30 requires checking feature availability.
- Scheduling constraints do not continuously repair placement. Anti-affinity's IgnoredDuringExecution behavior does not evict pods after relevant label changes, and topology spread does not automatically rebalance after pod removal. The article describes scheduling contracts and does not claim automatic rebalancing.
- The three-host rollout stall follows from required anti-affinity matching both revisions, one surge replica, and zero unavailable replicas. The proposed capacity and rollout-setting alternatives are valid. Revision-specific selectors must be designed consistently; existing broad anti-affinity terms can still block new pods during a transition.
- The PodDisruptionBudget explanation correctly distinguishes supported voluntary evictions from Deployment rollout controls and involuntary disruptions.
- All four Kubernetes documentation links resolve to the intended resources. The author link resolves to the named GitHub profile. There are no terminal commands or explicit Kubernetes release claims to validate.
- Validation consisted of official-documentation review and local YAML parsing. No live cluster scheduling, rollout, or failure experiment was performed. README.md was left unchanged.
