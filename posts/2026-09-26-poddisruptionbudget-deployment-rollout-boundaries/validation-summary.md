# Validation Summary: PodDisruptionBudgets and Deployment Rollouts: Protection and Limits

## Status
validated

## Post Type
Technical guide with Kubernetes configuration examples and diagnostic commands.

## Technologies Covered
- Kubernetes PodDisruptionBudget (`policy/v1`) and API-initiated eviction
- Deployments, ReplicaSets, and rolling update strategies
- Pod readiness, availability, and Service traffic
- Node maintenance, resource capacity, and high availability
- kubectl, Bash pipelines, YAML, and jq

## Sources Consulted
- [Kubernetes disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/) — eviction boundaries, direct deletion, involuntary disruptions, and rollout interaction.
- [API-initiated eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/) — eviction admission and rejection.
- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment) — strategy fields, percentage rounding, minimum readiness duration, and terminating Pods.
- [PDB configuration guide](https://kubernetes.io/docs/tasks/run-application/configure-pdb/) — selectors, minimum availability, health, and unhealthy-Pod eviction policy.
- [PodDisruptionBudget API reference](https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/) — configuration and status fields, including observed generation.
- [Deployment API reference](https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/) — Deployment configuration and replica status fields.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — resource selection, namespace selection, and JSON output.
- [kubectl drain reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/) — eviction-based draining and the deletion bypass option.
- [Kubernetes probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/) — readiness and Service traffic eligibility.
- [jq manual](https://jqlang.org/manual/#object-construction) — object construction and field access.
- [Author profile](https://github.com/nawazdhandala) — verified the post's author link resolves to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post is technically relevant and uses current API fields; no deprecated API usage was identified.
- Confirmed that eviction-based drains consult PDBs, while Deployment rolling replacements and direct deletions bypass their enforcement. Rollout unavailability can nevertheless reduce the budget available to a drain.
- With four healthy selected Pods and integer `minAvailable: 4`, no additional healthy-Pod eviction is permitted. The first Deployment strategy permits one unavailable replica; the second permits an extra replica while preserving four available replicas during planned replacement, subject to the stated operational assumptions.
- Confirmed that `minReadySeconds` governs rollout availability, not the start of Service traffic. Percentage unavailability rounds down and percentage surge rounds up. Terminating Pods can retain resources beyond the ordinary rollout population.
- Checked all three YAML blocks with a YAML parser. The Deployment blocks are explicitly fragments and require the remaining Deployment fields, as the post explains.
- The Bash block passed `bash -n`. Both exact jq filters executed successfully against an empty JSON fixture. The referenced status fields were checked against official API documentation; missing optional fields can appear as null in jq output.
- Verified the post's documentation URLs and Deployment section anchor. The author URL redirects normally to GitHub.
- This was a documentation and local syntax review. No live cluster rollout, eviction, or drain was performed. Executing the diagnostic commands requires kubectl access to the named resources in `production` and jq installed locally.
- PDB health uses Pod readiness, whereas Deployment availability also incorporates `minReadySeconds`. Unhealthy-Pod eviction depends on its separate policy, so zero allowed disruptions should not be interpreted as blocking every unhealthy-Pod eviction.
