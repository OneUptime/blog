# Validation Summary: How to Assign Pods to Specific Nodes on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration: `nodeLabels`, `nodeTaints`)
- Kubernetes pod scheduling primitives:
  - `nodeName` (direct assignment)
  - `nodeSelector` (label matching)
  - Node affinity (`requiredDuringSchedulingIgnoredDuringExecution`, `preferredDuringSchedulingIgnoredDuringExecution`)
  - Pod affinity and anti-affinity
  - Topology spread constraints
  - Tolerations
- Kubernetes workload kinds: Pod, Deployment, StatefulSet, Job
- Well-known Kubernetes labels (`topology.kubernetes.io/zone`, `topology.kubernetes.io/region`, `kubernetes.io/hostname`)
- kubectl CLI commands for debugging scheduling

## Sources Consulted
- Talos Linux machine config reference (`machine.nodeLabels`, `machine.nodeTaints`): https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Kubernetes "Assigning Pods to Nodes" documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes well-known labels, annotations and taints: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
No technical issues found.

The post's technical content is accurate:
- The Talos `machine.nodeLabels` block uses the correct field name and structure.
- The Talos `machine.nodeTaints` map uses the correct `key: "value:Effect"` string format expected by the Talos config schema.
- All Kubernetes affinity / anti-affinity YAML uses correct API fields (`requiredDuringSchedulingIgnoredDuringExecution`, `nodeSelectorTerms`, `matchExpressions`, `labelSelector`, `topologyKey`).
- Weights in `preferredDuringSchedulingIgnoredDuringExecution` are within the valid 1–100 range.
- Topology spread constraints use valid `maxSkew`, `topologyKey`, `whenUnsatisfiable` (`DoNotSchedule` / `ScheduleAnyway`), and `labelSelector` fields.
- Well-known labels (`topology.kubernetes.io/zone`, `topology.kubernetes.io/region`, `kubernetes.io/hostname`) are correctly named.
- The toleration example correctly matches the example taint using the default `Equal` operator.
- kubectl commands and flags (`--show-labels`, `-o custom-columns=...`, `describe`) are valid.

## Review Notes
- The StatefulSet example in the "Practical Example" section is intentionally abbreviated and omits required fields like `selector`, `serviceName`, and `volumeClaimTemplates`. This is acceptable for an illustrative snippet focused on affinity, but readers copy-pasting the example will need to add these fields before it applies.
- The `nodeName: worker-3` example correctly notes that this bypasses the scheduler and is unsuitable for production; this aligns with upstream guidance.
- The `nvidia.com/gpu: 1` resource limit requires the NVIDIA device plugin to be installed in the cluster — this is out of scope for the post but worth being aware of if a reader tries to run the ML training job example as-is.
- All techniques described are standard Kubernetes mechanisms; Talos Linux does not modify or restrict any of them, so the post's premise that "Talos supports every Kubernetes pod assignment technique" is accurate.
