# Validation Summary: Trigger a ClusterWorkflowTemplate from Argo Events Without Duplication

## Status

validated

## Post Type

Technical guide / Kubernetes configuration tutorial

## Technologies Covered

- Argo Events Sensors and Argo Workflow triggers
- Argo Events dependency filters and trigger parameterization
- Argo Workflows and `ClusterWorkflowTemplate`
- Kubernetes custom resources and namespaces
- Kubernetes RBAC, Roles, ClusterRoles, and service accounts
- Argo CLI and `kubectl`

## Sources Consulted

- [Argo Workflows: Cluster Workflow Templates](https://argo-workflows.readthedocs.io/en/latest/cluster-workflow-templates/)
- [Argo Workflows: Workflow Templates](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
- [Argo Workflows: Workflow Restrictions](https://argo-workflows.readthedocs.io/en/latest/workflow-restrictions/)
- [Argo Workflows: `argo submit` CLI reference](https://argo-workflows.readthedocs.io/en/latest/cli/argo_submit/)
- [Argo Workflows: Workflow RBAC](https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/)
- [Argo Events: Argo Workflow Trigger](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Events: Service Accounts](https://argoproj.github.io/argo-events/service-accounts/)
- [Argo Events: Trigger Parameterization](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Events: API Reference](https://argoproj.github.io/argo-events/APIs/)
- [Argo Events trigger implementation at reviewed commit](https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/pkg/sensors/triggers/argo-workflow/argo-workflow.go)
- [Argo Workflows v3.7.9 Kubernetes-client cluster-template access check](https://github.com/argoproj/argo-workflows/blob/v3.7.9/util/rbac/rbac.go)
- [Argo Workflows v3.7.9 Kubernetes API client setup](https://github.com/argoproj/argo-workflows/blob/v3.7.9/pkg/apiclient/argo-kube-client.go)
- [Argo Workflows v3.7.9 workflow-template resolution and stored spec](https://github.com/argoproj/argo-workflows/blob/v3.7.9/workflow/controller/operator.go)
- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

## Issues Found

- The Sensor's cluster-scoped RBAC granted only `get` on one named `ClusterWorkflowTemplate`. In Kubernetes-client mode, the Argo CLI checks for `get`, `list`, and `watch` on `clusterworkflowtemplates` before enabling cluster-template resolution, so the example would fail validation. Changed the ClusterRole to grant those three read verbs.
- The post claimed that `resourceNames` provided a narrow solution for the submission path. Kubernetes requires a matching `metadata.name` field selector for resource-name-restricted `list` or `watch`, but the Argo CLI access check does not use one. Removed `resourceNames` and documented that this mode creates a cluster-wide template-read trust boundary, with the Kubernetes resource trigger identified as the narrower alternative.
- The namespaced Workflow Role included `get`, although an Argo Workflow `submit` trigger requires `create` and `list`. Removed the unnecessary verb to match the current Argo Events service-account guidance.
- The entrypoint statement implied that every submittable `ClusterWorkflowTemplate` must define its own entrypoint. Clarified that the template must define it when the thin Workflow does not supply one.
- The post treated the thin Workflow's `serviceAccountName` override as unconditional. Current Argo Workflows v4 `templateReferencing: Strict` and `Secure` modes reject that field by default. Added the version-specific caveat and the valid alternatives.

## Review Notes

- `workflowTemplateRef.clusterScope: true`, the Sensor trigger structure, event data filter, parameter destination paths, generated Workflow labels, direct `argo submit --from clusterworkflowtemplate/...` command, and `kubectl auth can-i` syntax were verified as current and correct.
- Argo's documentation confirms that creating a Workflow from a `ClusterWorkflowTemplate` through `workflowTemplateRef` is supported in v2.9 and later.
- The container image digests are intentionally non-runnable placeholders; the post already instructs readers to replace them with real approved digests.
- All YAML configuration blocks parse successfully after the corrections.
