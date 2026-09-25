# Validation Summary: How to Use PriorityClasses Without Causing Cascading Pod Preemptions

## Status
validated

## Post Type
Technical guide with Kubernetes YAML configuration and kubectl inspection commands.

## Technologies Covered
- Kubernetes scheduling, Pod priority, and preemption
- PriorityClass and non-preempting workloads
- ResourceQuota and admission policy
- Deployments, ReplicaSets, Jobs, and autoscaling capacity planning
- PodDisruptionBudget and workload recovery
- kubectl and Kubernetes events

## Sources Consulted
- [Pod Priority and Preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/): class fields, priority values, queue ordering, preemption policy, and PDB limitations.
- [Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/): namespace admission limits, PriorityClass scope, supported resources, and rejection behavior.
- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/): template-triggered rollouts, surge, unavailable replicas, and temporary resource consumption.
- [Disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/): PDB coverage, controller replacement, graceful termination, and rolling update limitations.
- [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/): CPU and memory quantities and scheduling based on requests.
- [Validating Admission Policy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/): enforcement and resource scoping through admission policies and bindings.
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/): custom columns, all-namespace listing, and field selector flags.
- [Field Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/): support for filtering Event objects by reason.
- [kube-apiserver reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/): configurable event retention through --event-ttl.
- [Kubernetes v1.35.0 preemption implementation](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/scheduler/framework/preemption/preemption.go): confirms the Preempted event reason.
- [Kubernetes v1.35.0 scheduling implementation](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/scheduler/schedule_one.go): confirms the FailedScheduling event reason.

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all three YAML examples. They parse successfully, use stable API versions, and match the documented field structure. The class names, numeric priorities, boolean defaults, and preemption policy values are valid.
- The quota correctly targets application-critical pods in production and limits pod count, CPU requests, and memory requests. These are admission limits, not reserved node capacity. Matching workloads must supply the resource requests required by the quota, either explicitly or through applicable defaulting.
- Non-preempting PriorityClasses have been stable since Kubernetes v1.24; PriorityClass-scoped quotas have been stable since v1.17. No deprecated APIs were found. Queue priority is a preference, with scheduler backoff allowing lower-priority pods to run while a higher-priority pod cannot fit.
- The PDB explanation correctly distinguishes best-effort scheduler preemption protection from eviction API enforcement and Deployment rollout controls.
- The cascading failure scenario is a plausible conditional application behavior, not an automatic Kubernetes response: replica growth depends on configured autoscaling or another scaling action. The post appropriately uses conditional wording.
- Capacity and recovery guidance appropriately accounts for dependencies, eligible nodes, resource requests, termination delays, and rollout overlap. Terminating pods can temporarily consume resources beyond the nominal replica and surge counts.
- All three shell commands passed Bash syntax checking. Their flags, custom-column field paths, Event field selectors, and event reasons were checked against official documentation and upstream source.
- All four technical documentation links resolve to the intended official resources. The author profile URL is a plausible attribution link, not a technical source.
- This was a documentation, source, and local syntax review. No manifests were applied to a live cluster, and no live preemption or rollout experiment was performed.
- README.md required no changes.
