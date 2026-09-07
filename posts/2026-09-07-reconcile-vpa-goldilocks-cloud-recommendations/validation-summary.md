# Validation Summary: Reconciling VPA, Goldilocks, and Cloud Rightsizing Advice

## Status

validated

## Post Type

Technical guide with an illustrative YAML comparison record and Kubernetes resource-management implementation details.

## Technologies Covered

- Kubernetes resource requests, limits, scheduling, init containers, sidecars, and Pod overhead
- Vertical Pod Autoscaler (VPA), recommendation status, update modes, and resource policies
- Horizontal Pod Autoscaler (HPA)
- Fairwinds Goldilocks
- Google Kubernetes Engine (GKE) vertical Pod autoscaling
- AWS Compute Optimizer and cloud infrastructure rightsizing
- YAML

## Sources Consulted

- [Kubernetes Vertical Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/) — recommender inputs, recommendation status, and update mechanisms.
- [Upstream VPA documentation](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler) — container-level scope and the explicit Pod-level resource incompatibility warning.
- [VPA API reference](https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/docs/api.md) — Off mode, target and bounds, minAllowed, maxAllowed, controlledResources, and controlledValues.
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md) — HPA interaction, incomplete OOM coverage, and scheduling constraints.
- [Kubernetes autoscaling overview](https://kubernetes.io/docs/concepts/workloads/autoscaling/) — horizontal and vertical scaling scope.
- [Kubernetes Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) — utilization-based scaling and the replica calculation.
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — CPU and memory quantities, requests versus limits, scheduling, and beta Pod-level resources.
- [Kubernetes sidecar containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/) — init and sidecar resource accounting and Pod overhead.
- [Kubernetes Limit Ranges](https://kubernetes.io/docs/concepts/policy/limit-range/) and [Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/) — admission constraints on resource settings.
- [Fairwinds Goldilocks project](https://github.com/FairwindsOps/goldilocks) and [official documentation](https://goldilocks.docs.fairwinds.com/) — workload VPA creation and dashboard presentation of recommendations.
- [GKE Vertical Pod autoscaling](https://cloud.google.com/kubernetes-engine/docs/concepts/verticalpodautoscaler) — managed container resource recommendations and updates.
- [AWS Compute Optimizer EC2 recommendations](https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ec2-recommendations.html) — instance-level scope, historical utilization, performance risk, and recommendation refreshes.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. All six documentation links resolve to the intended official resources; the author profile also resolves. Redirects do not require corrections.
- The YAML is an illustrative decision record, not a Kubernetes manifest or a cloud-provider API payload. Its custom field names and example sizing values are appropriate for that purpose. CPU quantities use millicores, and memory quantities use valid binary byte suffixes.
- The text resource equation is conceptual: the following line explicitly requires accounting for init behavior and Pod overhead. Exact scheduling calculations also depend on the workload's resource model, as the subsequent Pod-level resource paragraph explains.
- Off mode continues recommendation generation without applying recommendation values. The resource-policy fields and request-only versus request-and-limit behavior match the VPA API.
- The HPA denominator explanation and warning about simultaneously controlling the same resource match upstream guidance. Separate CPU/memory control is another supported option, but its omission does not invalidate the proposed custom/external metric approach.
- Pod-level resources are documented as beta since Kubernetes 1.34. Upstream VPA still explicitly warns that container recommendations can conflict with Pod-level budgets and prevent Pod creation. This claim should be rechecked when upgrading VPA because the linked master documentation is mutable.
- Quotas can reject resource changes; they do not necessarily reduce recommendations to fit available quota. The post appropriately treats them as constraints and includes scheduling failures in validation.
- Candidate selection, provenance collection, and service-outcome testing are operational guidance, not guaranteed optimizer algorithms. The numerical examples and median/highest-target heuristics require workload testing, as the post states.
- No executable program, terminal command, or deployable manifest is supplied. No live cluster or cloud workload test was performed; review covers documentation accuracy and the illustrative record rather than production performance.
