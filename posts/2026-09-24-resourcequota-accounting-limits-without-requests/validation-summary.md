# Validation Summary: How ResourceQuota Accounts for Container Limits Without Requests

## Status
validated

## Post Type
Technical troubleshooting guide with a Pod manifest and command-line examples.

## Technologies Covered
- Kubernetes v1.36 Pod API defaulting and container CPU and memory resources
- ResourceQuota accounting and admission
- LimitRange defaults and constraints
- kubectl server-side dry-run
- YAML, shell commands, and jq

## Sources Consulted
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#requests-and-limits): resource units, request and limit semantics, scheduling, and missing-request defaulting.
- [Kubernetes v1.36.0 Pod defaulting source](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/apis/core/v1/defaults.go): per-resource copying for regular and init containers, and the distinction between Pods and Pod templates.
- [Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/): CPU and memory quota keys, aliases, and accounting for non-terminal Pods.
- [Limit Ranges](https://kubernetes.io/docs/concepts/policy/limit-range/): defaulting, minimums, maximums, ratios, and multiple-LimitRange behavior.
- [Configure Default CPU Requests and Limits for a Namespace](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/cpu-default-namespace/): explicit limits take precedence over the namespace default request when the request is omitted.
- [Kubernetes v1.36.0 LimitRanger source](https://github.com/kubernetes/kubernetes/blob/v1.36.0/plugin/pkg/admission/limitranger/admission.go): mergeContainerResources fills only missing request and limit keys.
- [Kubernetes API dry-run rules](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run): admission, validation, persistence, authorization, and webhook side-effect requirements.
- [Kubernetes v1.36.0 quota admission source](https://github.com/kubernetes/kubernetes/blob/v1.36.0/staging/src/k8s.io/apiserver/pkg/admission/plugin/resourcequota/controller.go): checkRequest runs before the dry-run branch skips quota usage updates.
- [kubectl create reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/): server dry-run, filename, namespace, and JSON output options.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/): resource listing, namespace, and YAML output options.
- [Pod API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/): Pod manifest fields, container resources, command, and restart policy.
- [Official jq manual](https://jqlang.org/manual/): array iteration and object construction shorthand.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The technical reference links resolve to the intended documentation or versioned source; the Pod API reference used during review redirects to its current location.
- Confirmed that omitted CPU and memory request keys are defaulted independently from corresponding explicit limits. Existing requests are preserved, including requests populated before LimitRange admission.
- Confirmed the arithmetic: two containers at 750m each contribute 1500m; adding that to 3000m produces 4500m, exceeding a 4000m request quota. Their limits also total 1500m for an applicable limits.cpu quota.
- Confirmed that a LimitRange default request of 100m does not replace a request already defaulted from an explicit 750m limit. If both CPU fields are absent, the described defaults instead yield a 100m request and 750m limit.
- Confirmed that server dry-run checks quota but does not update quota usage or persist the Pod. A Deployment dry-run cannot validate admission of future Pods. Dry-run webhooks must meet the documented side-effect rules, and authorization is still required.
- Parsed the YAML with PyYAML, checked both shell snippets with bash -n, and executed the jq filter against the parsed sample successfully. The manifest uses the stable core/v1 Pod API and valid resource quantities.
- No live Kubernetes admission request or container image execution was performed. Runtime outcomes depend on the target namespace, permissions, admission policies, available quota, and image availability. The post already explains how to inspect actual admission results.
- The implementation claim was checked against the explicitly linked v1.36.0 source. The post appropriately excludes Pod-level budgets, sidecars, init-container accounting, and in-place resize from its simplified calculation. RuntimeClass Pod overhead, when present, also needs to be included in effective Pod resource accounting; the sample does not specify a RuntimeClass.
- Rollout calculations should include every concurrent Pod that still counts toward applicable quotas, including overlap and non-terminal terminating Pods. The post's instruction to account for concurrent Pods and every applicable quota is correct.
