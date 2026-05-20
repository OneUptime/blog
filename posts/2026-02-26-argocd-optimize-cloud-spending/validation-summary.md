# Validation Summary: How to Optimize Cloud Spending with ArgoCD Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications and AppProjects
- GitOps
- Kubernetes ResourceQuota, LimitRange, CronJob, node affinity, and tolerations
- OPA Gatekeeper ConstraintTemplates and constraints
- Kustomize inline patches in Argo CD
- Prometheus Operator PrometheusRule
- PromQL cost alerting with custom cost-exporter metrics

## Sources Consulted
- Argo CD Project specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Kustomize inline patches: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD application metrics: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/metrics/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes node affinity documentation: https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Gatekeeper constraint matching documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA/Rego built-in functions reference: https://www.openpolicyagent.org/docs/policy-reference/builtins
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The scheduled cleanup CronJobs used the Argo CD image while also calling `kubectl` and `jq`; that image should not be assumed to include those tools. Replaced the script with direct `kubectl` operations against the Argo CD Application CRD and used a shell-capable Kubernetes tools image verified locally with Docker.
- The CronJob schedules were expressed as UTC equivalents for EST, which would drift during daylight saving time. Added `.spec.timeZone: America/New_York` and changed schedules to local 7 PM and 7 AM.
- The Gatekeeper CPU rule emitted a violation message without comparing requested CPU to the maximum, and `maxMemory` was declared but unused. Added CPU and memory comparison logic for common Kubernetes CPU and memory units.
- The storage class example comment incorrectly described the snippet as an Argo CD Project. Changed it to describe the actual Gatekeeper policy.
- The standalone Kustomize patch used `ANY_DEPLOYMENT` as a placeholder resource name, which would not target a real Deployment as written. Replaced it with the example deployment name used elsewhere in the post.
- The Argo CD inline Kustomize patch only added a spot toleration, which permits scheduling onto tainted spot nodes but does not require spot nodes. Added required node affinity and included the required Application `project` and `destination` fields.
- The Prometheus alert examples used metric names that looked like built-in Argo CD cost metrics, but Argo CD does not emit cost metrics. Updated the text and PromQL to make clear these are cost-exporter metrics labeled with Argo CD application/team labels.

## Review Notes
The examples are now syntactically valid YAML and align with the documented APIs. The Gatekeeper resource quantity parser intentionally covers common CPU and memory formats used in the examples (`m`, whole cores, `Mi`, and `Gi`); production policies may need broader Kubernetes quantity parsing.
