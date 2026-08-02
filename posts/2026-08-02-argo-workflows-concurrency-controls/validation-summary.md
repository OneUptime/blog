# Validation Summary: Controlling Argo Workflows Concurrency with parallelism, Semaphores, and Mutexes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo Workflows
- Kubernetes Workflow custom resources
- Kubernetes ConfigMaps and RBAC
- Argo CLI and kubectl
- Local and database-backed semaphores and mutexes
- PostgreSQL, MySQL, and MariaDB synchronization storage

## Sources Consulted
- Argo Workflows synchronization documentation: https://argo-workflows.readthedocs.io/en/latest/synchronization/
- Argo Workflows limiting parallelism documentation: https://argo-workflows.readthedocs.io/en/latest/parallelism/
- Argo Workflows field reference: https://argo-workflows.readthedocs.io/en/latest/fields/
- Argo Workflows controller ConfigMap reference: https://argo-workflows.readthedocs.io/en/latest/workflow-controller-configmap/
- Argo Workflows synchronization-limit API documentation: https://argo-workflows.readthedocs.io/en/latest/synchronization-config/
- Argo Workflows `argo get` CLI reference: https://argo-workflows.readthedocs.io/en/latest/cli/argo_get/
- Argo Workflows official parallelism examples: https://github.com/argoproj/argo-workflows/tree/main/examples
- Argo Workflows controller parallelism implementation: https://github.com/argoproj/argo-workflows/blob/main/workflow/controller/operator.go
- Argo Workflows lock-name implementation: https://github.com/argoproj/argo-workflows/blob/main/workflow/sync/lock_name.go
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found

1. **Workflow `parallelism` was described as a general node/execution limit.** The current Argo field reference defines `spec.parallelism` as the maximum number of concurrently executing Workflow Pods. Updated the introduction, boundary table, and fan-out explanation to use the precise Pod scope.

2. **Template `parallelism` inheritance was overstated.** The post claimed that nested templates inherit parent limits and that the tightest bound always determines effective concurrency. Argo limits direct child task or step executions at the template boundary, but Pods created inside an additionally invoked Steps or DAG template are not counted against the parent's template limit. Replaced the claim with the documented boundary behavior and clarified that nested templates need their own limit when appropriate, while `spec.parallelism` remains Workflow-wide.

3. **The Workflow-level semaphore snippet referenced an undefined ConfigMap key.** The ConfigMap defined only `database-writes`, but the later snippet referenced `batch-runs`, which would fail lock initialization because that key did not exist. Changed the Workflow-level example to reference the defined `database-writes` key.

4. **The local semaphore identity was incomplete.** The post said semaphore identity contained only a namespace and key. The controller's local ConfigMap lock name also includes the ConfigMap name, so references to different ConfigMaps do not identify the same local semaphore even if their namespaces and keys match. Updated the identity description accordingly.

5. **The multi-controller database-lock requirements omitted unique controller names.** Database-backed synchronization records identify participating controllers by `controllerName`; each controller must use a unique value. Added that requirement alongside the shared-database and synchronized-clock requirements.

## Review Notes
- All 11 YAML blocks parse as valid YAML. The complete Workflow passes Argo's current official validation package, and the partial snippets' field names and nesting match the current Workflow schema and official examples.
- The plural synchronization fields `mutexes` and `semaphores` are available in Argo Workflows v3.6 and later. Database mutexes and semaphores require v3.7 or later. The post uses the current forms correctly.
- ConfigMap semaphore updates are watched by default. Setting `WATCH_CONTROLLER_SEMAPHORE_CONFIGMAPS=false` disables runtime watching, in which case a controller restart is required to pick up changes.
- The `example.com` container images are clearly illustrative placeholders and must be replaced with deployable application images.
- The controller log command assumes the controller is a Deployment named `workflow-controller` in namespace `argo`; Helm release naming or a custom installation can change both values.
