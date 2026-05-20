# Validation Summary: How to Enforce Resource Quotas with ArgoCD and OPA

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Open Policy Agent
- Gatekeeper
- Rego
- Helm
- Kustomize
- kubectl
- argocd CLI
- yq
- jq

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Gatekeeper installation documentation for v3.15.x: https://open-policy-agent.github.io/gatekeeper/website/docs/v3.15.x/install/
- Gatekeeper v3.15.1 Helm chart values: https://github.com/open-policy-agent/gatekeeper/blob/v3.15.1/charts/gatekeeper/values.yaml
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper handling constraint violations documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper policy library required resources template: https://open-policy-agent.github.io/gatekeeper-library/website/validation/containerresources/
- Kubernetes resource quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes resource requests and limits documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- The post described enforcing Kubernetes resource quotas, limit ranges, and resource request policies, but the examples enforce Gatekeeper admission policies for resource requests and limits, not Kubernetes `ResourceQuota` or `LimitRange` objects. Updated the description and introductory wording to match the implementation.
- The Gatekeeper Helm `valuesObject` used invalid or misplaced chart values for Gatekeeper v3.15.1: `audit.replicas`, nested `audit.auditInterval`, `logDenials`, and top-level `exemptNamespaces`. Updated them to valid chart values: top-level `auditInterval`, `logDenies`, and `controllerManager.exemptNamespaces`; removed the unsupported audit replica setting.
- The required-resources ConstraintTemplate said it checked all containers but only checked init containers for requests, not limits. Added the missing init-container limit check.
- The resource ratio policy compared CPU quantities incorrectly when values used different units, such as `500m` and `2`. Added CPU-to-millicore conversion before calculating the ratio.

## Review Notes
- The maximum resource and ratio Rego examples intentionally handle the CPU and memory units shown in the post. A production-grade policy should either rely on a thoroughly tested library policy or expand quantity parsing to cover the full Kubernetes quantity grammar.
- `valuesObject` is supported by current Argo CD Application specs, and `ServerSideApply=true`, `CreateNamespace=true`, sync waves, and `argocd app get --show-operation` are current documented Argo CD features.
