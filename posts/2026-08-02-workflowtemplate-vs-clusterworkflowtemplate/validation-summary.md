# Validation Summary: WorkflowTemplate vs. ClusterWorkflowTemplate: Choosing the Right Reuse Boundary

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Argo Workflows
- Kubernetes custom resources
- `WorkflowTemplate` and `ClusterWorkflowTemplate`
- Argo CLI
- Kubernetes RBAC and service accounts
- YAML
- Multi-tenancy and namespace isolation
- GitOps

## Sources Consulted

- [Argo Workflows: WorkflowTemplates](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
- [Argo Workflows: ClusterWorkflowTemplates](https://argo-workflows.readthedocs.io/en/latest/cluster-workflow-templates/)
- [Argo Workflows: Service accounts](https://argo-workflows.readthedocs.io/en/latest/service-accounts/)
- [Argo Workflows: Workflow RBAC](https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/)
- [Argo Workflows: Workflow restrictions](https://argo-workflows.readthedocs.io/en/latest/workflow-restrictions/)
- [Argo Workflows: Installation scopes](https://argo-workflows.readthedocs.io/en/latest/installation/)
- [Argo Workflows: Field reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Argo Workflows: `argo submit` CLI reference](https://argo-workflows.readthedocs.io/en/latest/cli/argo_submit/)
- [Argo Workflows: Security model](https://argo-workflows.readthedocs.io/en/latest/security/)
- [Kubernetes: RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Docker Official Image: Alpine](https://hub.docker.com/_/alpine)

## Issues Found

No technical issues found.

## Review Notes

- All nine fenced YAML snippets parse successfully.
- The complete `templateRef` examples and the namespaced and cluster-scoped `workflowTemplateRef` forms passed offline linting with Argo CLI v4.0.5. The `--from`, `--namespace`, and `-p` options were also checked against current CLI help and the official CLI reference.
- The `argoproj.io/v1alpha1` API version remains current for the resources shown, and `alpine:3.23` is an available Docker Official Image tag as of the validation date.
- The examples assume that the `team-a` namespace, referenced reusable resources, and `workflow-runner` service account exist. In a real installation, that service account also needs the permissions required by the workload and the Argo executor; for Argo Workflows v3.4 and later, the documented executor minimum is `create` and `patch` on `workflowtaskresults.argoproj.io`.
