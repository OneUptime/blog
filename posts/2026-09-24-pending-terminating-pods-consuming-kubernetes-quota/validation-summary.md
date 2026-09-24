# Validation Summary: How to Find Pending and Terminating Pods Consuming Namespace Quota

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and jq reports.

## Technologies Covered
- Kubernetes Pods, lifecycle phases, deletion metadata, finalizers, and workload controllers.
- ResourceQuota compute accounting, object counts, scopes, and reconciliation.
- Pod resource requests, init containers, restartable sidecars, overhead, Pod-level resources, and in-place resizing.
- kubectl, Bash, and jq.

## Sources Consulted
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes v1.36.0 Pod quota evaluator, retrieved directly from the official repository: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.36.0/pkg/quota/v1/evaluator/core/pods.go
- Kubernetes v1.36.0 resource calculation helpers: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.36.0/staging/src/k8s.io/component-helpers/resource/helpers.go
- Kubernetes v1.36.0 ResourceQuota controller: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.36.0/pkg/controller/resourcequota/resource_quota_controller.go
- Kubernetes Pod Lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Finalizers: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes ReplicaSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/
- Official jq manual: https://jqlang.org/manual/

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post is technically relevant and contains three executable diagnostic examples.
- Confirmed that the v1.36.0 evaluator counts stored Pod objects through count/pods before checking lifecycle eligibility. Failed and Succeeded Pods do not contribute compute usage; Pending Pods do not need a node assignment to qualify. The pods resource follows the compute eligibility check.
- Confirmed the precise deletion rule in QuotaV1Pod: both deletion metadata fields must exist, and the current time must be strictly later than deletionTimestamp plus deletionGracePeriodSeconds. This is an evaluator cutoff, not a guarantee of object removal or immediate quota reconciliation.
- Confirmed that Terminating scope is based on a nonnegative spec.activeDeadlineSeconds, and that PriorityClass scope matches the Pod priority class. Overlapping quota usage must not be added as independent consumption.
- Verified that the evaluator delegates resource accounting to PodRequests and PodLimits. These helpers account for init containers, restartable sidecars, overhead, and applicable Pod-level and resize resources. Feature gates and server version can affect behavior, as the post cautions.
- Verified kubectl get, namespace selection with -n, and JSON output with -o json against the official command reference. All three Bash blocks passed bash -n. The exact jq filters ran successfully against synthetic ResourceQuota and Pod lists and empty lists.
- Pod fixtures covered Pending, Running, Succeeded, and Failed phases; deleting and nondeleting objects; absent owner references and init containers; absent optional resource fields; and zero-second deletion grace periods. Checked that the inventory retained all Pods, the candidate filter selected Pending or deleting Pods, and resource quantities remained strings.
- The candidate report is deliberately an inspection aid, not a sorted ranking or quota calculator. It does not expose resize status or every scope input; full Pod JSON may be needed for deeper investigations.
- Checked lifecycle, controller replacement, finalizer cleanup, and asynchronous quota reconciliation guidance against official documentation and controller source. No deprecated commands or API fields were identified in the examples.
- The article's Kubernetes documentation links resolve to the intended resources. The GitHub source page could not be rendered by the web tool, but its exact v1.36.0 file was successfully retrieved from the official raw repository URL. The author profile is attribution, not technical evidence.
- No live Kubernetes cluster was used. Runtime checks validate shell syntax and jq behavior with representative data; quota semantics were verified through official documentation and versioned implementation source. The review does not claim an end-to-end cluster test.
