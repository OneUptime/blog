# Validation Summary: Trigger WorkflowTemplates Across Namespaces with Argo Events

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Argo Events Sensors and Argo Workflow triggers
- Argo Workflows, Workflows, and WorkflowTemplates
- Kubernetes namespaces, ServiceAccounts, Roles, and RoleBindings
- Workflow executor RBAC and WorkflowTaskResult resources
- Workflow controller scope and managed namespaces
- `kubectl auth can-i` and Kubernetes impersonation

## Sources Consulted

- [Argo Events Argo Workflow trigger documentation](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Events service-account documentation](https://argoproj.github.io/argo-events/service-accounts/)
- [Argo Events API reference](https://argoproj.github.io/argo-events/APIs/)
- [Argo Events data-filter documentation](https://argoproj.github.io/argo-events/sensors/filters/data/)
- [Argo Events Argo Workflow trigger implementation at reviewed commit 77cb8cb](https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/pkg/sensors/triggers/argo-workflow/argo-workflow.go)
- [Argo Events example Sensor RBAC at reviewed commit 77cb8cb](https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/examples/rbac/sensor-rbac.yaml)
- [Argo Workflows WorkflowTemplate documentation](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
- [Argo Workflows ClusterWorkflowTemplate documentation](https://argo-workflows.readthedocs.io/en/latest/cluster-workflow-templates/)
- [Argo Workflows service-account documentation](https://argo-workflows.readthedocs.io/en/latest/service-accounts/)
- [Argo Workflows workflow RBAC documentation](https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/)
- [Argo Workflows managed-namespace documentation](https://argo-workflows.readthedocs.io/en/latest/managed-namespace/)
- [Argo Workflows workflow-restrictions documentation](https://argo-workflows.readthedocs.io/en/latest/workflow-restrictions/)
- [Argo Workflows user-override validation at reviewed commit e0b6328](https://github.com/argoproj/argo-workflows/blob/e0b632812367ad2f2e44c661104e08d717617cbb/workflow/util/merge.go)
- [Kubernetes RBAC documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes authorization and API-access checks](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- [Kubernetes `kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes user-impersonation documentation](https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/)

## Issues Found

- The Sensor Role granted `get` on Workflows and `get` on the named WorkflowTemplate, although the documented and implemented `submit` path only creates the Workflow and lists it by labels. The workflow controller resolves `workflowTemplateRef`. Removed both unnecessary `get` permissions, retained only `create` and `list` on Workflows, and changed the corresponding authorization check from `get workflowtemplates` to `list workflows`.
- The embedded Workflow repeated `serviceAccountName`, even though the referenced WorkflowTemplate already defines it. Current Argo Workflows rejects `serviceAccountName` as a security-sensitive user override when `templateReferencing` is `Strict` or `Secure`. Removed the redundant field from the submitted Workflow so the WorkflowTemplate remains authoritative and the example works with those restrictions.
- The controller-scope explanation suggested an explicit set of managed namespaces. The documented modes are cluster-wide or namespace-scoped, with the latter watching its installation namespace or one separate managed namespace. Corrected the wording.
- The Official Documentation list linked to Service Account Secrets while describing service-account configuration and RBAC. Replaced it with the directly relevant Argo Workflows Service Accounts page.

## Review Notes

- The YAML blocks parse successfully and use current `argoproj.io/v1alpha1`, `rbac.authorization.k8s.io/v1`, and core `v1` APIs and fields.
- Argo Events source confirms that an embedded Workflow namespace overrides the Sensor namespace, while an omitted namespace falls back to the Sensor namespace. It also confirms that `submit` adds Sensor/trigger labels and lists the submitted Workflow with those labels.
- A namespaced `workflowTemplateRef` has no namespace field and is resolved in the Workflow's namespace. Cross-namespace reusable templates require a `ClusterWorkflowTemplate` and `clusterScope: true`, which is outside this post's stated scope.
- The `WorkflowTaskResult` executor permissions (`create` and `patch`) are the documented minimum for Argo Workflows v3.4 and later.
- A RoleBinding in `payments-prod` may bind a ServiceAccount from `argo-events`; this does not require a ClusterRoleBinding.
- The image digest is intentionally a nonfunctional placeholder, and the post correctly instructs readers to replace it with a real approved digest.
- Permission needs can increase if trigger arguments, trigger policy, or the installed Argo releases change; the post correctly tells readers to validate the exact operation and release.
- All links in the corrected Official Documentation section returned HTTP 200 during validation.
