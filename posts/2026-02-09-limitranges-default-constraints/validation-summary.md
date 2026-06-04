# Validation Summary: How to Configure LimitRanges for Default Resource Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes LimitRange
- Kubernetes ResourceQuota
- Kubernetes Pod resource requests and limits
- Kubernetes PersistentVolumeClaim storage constraints
- kubectl
- Kyverno ClusterPolicy validation
- GitOps templating with envsubst

## Sources Consulted
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes LimitRange API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes CPU LimitRange task: https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/cpu-constraint-namespace/
- Kubernetes memory LimitRange task: https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/memory-constraint-namespace/
- Kubernetes storage LimitRange task: https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes admission controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes LimitRanger admission plugin source: https://raw.githubusercontent.com/kubernetes/kubernetes/master/plugin/pkg/admission/limitranger/admission.go
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The post said resource specifications are required whenever ResourceQuotas are active. Kubernetes only requires requests or limits when quota is enabled for resources such as CPU and memory. Updated the statement to qualify it as ResourceQuotas for CPU or memory requests and limits.
- The Kyverno example used `spec.validationFailureAction`, which Kyverno marks as deprecated. Updated the example to use `validate.failureAction: Enforce` under the rule.
- The Kyverno example used the older direct `match.resources` style. Updated it to the current documented `match.any[].resources` structure.
- The post claimed the Kyverno policy enforces explicit resources before LimitRange defaults apply. Kubernetes admission runs mutation/defaulting before validation webhooks, and the LimitRanger plugin can mutate Pods with defaults. Updated the wording to say the policy enforces resources on admitted Pods and that LimitRange defaults may satisfy the policy before Kyverno validation runs.

## Review Notes
- The Kubernetes LimitRange examples use the stable `apiVersion: v1` API and valid `LimitRangeItem` fields: `default`, `defaultRequest`, `max`, `min`, `maxLimitRequestRatio`, and `type`.
- The kubectl examples use valid command forms, but kubectl was not installed in the local environment, so command validation was performed against the official Kubernetes kubectl reference instead of local `--help` output.
