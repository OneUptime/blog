# Validation Summary: How to Handle Resource Comparison for CRDs in ArgoCD

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Argo CD diff customization
- Argo CD resource customizations and health checks
- Kubernetes CustomResourceDefinitions and custom resources
- Kubernetes CRD versioning and conversion
- kubectl JSONPath output
- Operator-managed Kubernetes resources

## Sources Consulted
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/diffing/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes CRD versioning documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes CustomResourceDefinition documentation, including status subresource behavior: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes `kubectl get` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Zalando Postgres Operator manifest documentation for the `acid.zalan.do/v1` `postgresql` kind: https://opensource.zalando.com/postgres-operator/docs/reference/cluster_manifest.html
- Referenced OneUptime link checked for plausibility: https://oneuptime.com/blog/post/2026-02-26-argocd-ignore-server-side-fields/view

## Issues Found
- The post stated that CRD `status` fields are compared by default. Argo CD's documented default is `resource.compareoptions.ignoreResourceStatusField: all`, so top-level `status` is ignored by default. Updated the wording to cover cases where that default is changed or status-like data is written outside top-level `status`.
- The blanket ignore example used `resource.customizations.ignoreDifferences.all` to ignore `/status`. Replaced it with the documented `resource.compareoptions` setting for global status diff behavior.
- The warning implied `status` can be meaningful desired configuration. Kubernetes treats `status` as controller-owned state, so the warning was revised to caution against enabling status comparison.
- The CRD version conversion command read `.status.storedVersions`, which records historical storage versions rather than the current storage version. Replaced it with a JSONPath query over `.spec.versions[?(@.storage==true)]`.
- The `knownTypeFields` example used unsupported `Opaque` type values and described the feature as declaring a status subresource. Replaced it with the documented use case: mapping an embedded `core/v1/PodSpec` field for Argo Rollouts-style CRDs.
- The diff normalization section said Argo CD uses custom Lua scripts for diff normalization. Changed this to JSON pointers, JQ path expressions, and managed field managers, which are the documented mechanisms for ignore-difference normalization.
- The two Zalando Postgres manifests were in one YAML code block without a document separator. Added `---` so the example remains valid multi-document YAML.

## Review Notes
Local `argocd` and `kubectl` binaries were not installed in this environment, so CLI syntax was verified against official command references rather than local `--help` output. The article still uses "CRD" colloquially in places where "custom resource" would be more precise, but the technical examples remain understandable in context.
