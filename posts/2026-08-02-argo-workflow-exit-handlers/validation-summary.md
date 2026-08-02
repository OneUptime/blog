# Validation Summary: How to Use Argo Workflow Exit Handlers for Cleanup and Failure Notifications

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered

- Argo Workflows and the `Workflow` custom resource
- Argo Workflow exit handlers (`spec.onExit`)
- Argo lifecycle hooks
- Argo CLI (`argo stop`, `argo terminate`, `argo get`, and `argo logs`)
- Kubernetes Secrets, service accounts, RBAC, owner references, and garbage collection
- Argo retry strategies, artifact garbage collection, Pod garbage collection, and Workflow TTL strategies
- YAML Workflow manifests
- Python 3.13 webhook notification code
- Alpine Linux container images

## Sources Consulted

- [Argo Workflows: Exit Handlers](https://argo-workflows.readthedocs.io/en/latest/walk-through/exit-handlers/)
- [Argo Workflows: Workflow Variables](https://argo-workflows.readthedocs.io/en/latest/variables/)
- [Argo Workflows: Lifecycle Hooks](https://argo-workflows.readthedocs.io/en/latest/lifecyclehook/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Argo Workflows: Retries](https://argo-workflows.readthedocs.io/en/latest/retries/)
- [Argo CLI: `argo stop`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_stop/)
- [Argo CLI: `argo terminate`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_terminate/)
- [Argo CLI: `argo logs`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_logs/)
- [Argo Workflows: Artifacts and Artifact Garbage Collection](https://argo-workflows.readthedocs.io/en/latest/walk-through/artifacts/)
- [Argo Workflows: Service Accounts](https://argo-workflows.readthedocs.io/en/latest/service-accounts/)
- [Argo Workflows: Security](https://argo-workflows.readthedocs.io/en/latest/security/)
- [Argo Workflows v4.0.8 release](https://github.com/argoproj/argo-workflows/releases/tag/v4.0.8)
- [Kubernetes: Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes: Garbage Collection](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)

## Issues Found
No technical issues found.

## Review Notes

- The complete Workflow manifest passed strict offline linting with the Argo Workflows v4.0.8 CLI.
- The YAML parsed successfully, and the embedded Python notification script compiled successfully.
- The referenced `alpine:3.23` and `python:3.13-alpine` image tags currently resolve to published container manifests.
- `example.com/storage-cleaner:1.8.0` is intentionally illustrative and must be replaced with a real cleanup image. The `workflow-notifier` Secret and its `url` and `token` keys must also exist before running the example.
- With `retryStrategy.limit: "3"`, Argo permits up to three retry attempts in addition to the original attempt.
