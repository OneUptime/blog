# Validation Summary: How to Prevent Two HPAs from Fighting Over the Same Workload

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands, a Python inventory script, and a Kubernetes YAML configuration.

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler (HPA), autoscaling/v2, and Deployments
- Kubernetes scale subresources, Pod selectors, and resource identity
- CPU resource metrics and external queue metrics
- kubectl, Bash, jq, and Python 3
- Operators, admission policies, and GitOps replica ownership

## Sources Consulted
- Kubernetes HPA concepts, algorithm, multiple metrics, and replica management: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes v1.35.0 HPA controller implementation, particularly selector validation: https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/horizontal.go
- HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- HPA walkthrough, including external queue metrics: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Deployment API and scale endpoint: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes object identity: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- kubectl get command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl describe command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- kubectl apply and server dry-run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Validating Admission Policy and available expression inputs: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes operator pattern: https://kubernetes.io/docs/concepts/extend-kubernetes/operator/
- jq manual, including raw output and TSV formatting: https://jqlang.org/manual/
- Python JSON loading: https://docs.python.org/3/library/json.html#json.load
- Python defaultdict: https://docs.python.org/3/library/collections.html#collections.defaultdict
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post is technically relevant and uses supported autoscaling/v2 and apps/v1 APIs.
- Confirmed that the pinned v1.35.0 controller lists Pods in the HPA namespace, checks registered HPA selectors, emits an AmbiguousSelector warning, and sets ScalingActive=False when multiple HPAs select those Pods. The post correctly treats this as runtime detection, rather than an API uniqueness constraint. The pinned release is an implementation reference, not a claim to be the latest release.
- Executed the exact Python example against a synthetic inventory. It detected two targets with different versions in the same API group and kept different namespaces, API groups, and kinds separate. The alternate version in this fixture tests string normalization, not current server support for that version. The post already calls out omitted API versions, custom targets, and overlapping selectors as requiring further review.
- Executed the exact jq expression against that inventory and verified five output rows. All Bash blocks passed bash -n syntax checks. Checked kubectl flags and the Deployment scale URL against official references.
- Reviewed every YAML field against the HPA API reference and compared the external metric configuration with the official queue example. AverageValue of "40" expresses a target of 40 queued jobs per replica, subject to the configured bounds and HPA behavior. The metric name and label selector depend on the installed adapter.
- CPU utilization scaling also requires CPU requests on the relevant containers and a working resource metrics API. These are deployment prerequisites; the post assumes existing CPU and queue autoscaling configurations.
- The maximum metric recommendation is subject to bounds, scaling policies, and stabilization. Metric retrieval errors can prevent downscaling while still allowing scale-up from a usable metric. This is consistent with the post's recommendation to preserve existing behavior settings.
- Cross-object admission enforcement needs a suitable inventory and concurrency design. Operator reconciliation can recreate managed HPAs, so correcting source configuration is appropriate. Other replica writers also need coordination.
- Verified the post's external links and the multiple-metrics section anchor. The author URL redirects to the expected GitHub profile.
- No live Kubernetes cluster validation or server dry-run was performed; kubectl is unavailable locally. PyYAML is also unavailable, so YAML validation was a manual API-field review rather than a parser or server check. Runtime metrics, RBAC access, and load behavior remain environment-dependent checks.
