# Validation Summary: How to Build a Tekton Pipeline That Runs Integration Tests Against Ephemeral

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Tekton Pipelines
- Kubernetes namespaces
- Kubernetes RBAC
- Kubernetes ResourceQuota
- Kubernetes Deployments, StatefulSets, Services, and readiness probes
- kubectl
- Node.js npm integration test execution
- PostgreSQL Docker image

## Sources Consulted
- Tekton Pipeline API reference: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton variable substitution documentation: https://tekton.dev/docs/pipelines/variables/
- Tekton Pipelines deprecations: https://tektoncd-pipeline.mintlify.app/migration/deprecations
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes namespaces and DNS documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
- PostgreSQL official Docker image documentation: https://hub.docker.com/_/postgres

## Issues Found
- The Tekton examples used `apiVersion: tekton.dev/v1beta1`, which is deprecated for Task, TaskRun, Pipeline, and PipelineRun resources. Updated the Tekton Task and Pipeline examples to `tekton.dev/v1`.
- The namespace creation task treated `purpose=integration-test,managed-by=tekton` as if it could be inserted directly under `metadata.labels`, but Kubernetes labels are a key/value map in object metadata. Replaced the single label string parameter with explicit `label-purpose` and `label-managed-by` parameters and rendered them as valid YAML label keys.
- The RBAC example created a ResourceQuota but did not grant access to `resourcequotas`. Added the missing core API `resourcequotas` rule.
- The prerequisites example created the ServiceAccount in `tekton-pipelines` without explaining that Tekton TaskRun pods must use a ServiceAccount in their execution namespace. Added a short clarification to create it in the PipelineRun namespace and noted that the example uses `tekton-pipelines`.
- The `run-tests` task used `$(tasks.status)` in a normal Task step `when` expression. Tekton documents `$(tasks.status)` as available only in `finally` tasks, so the expression would not work there. Removed the invalid `when` block.

## Review Notes
The remaining examples are illustrative and reference external or custom Tasks such as `git-clone`, `kaniko`, `wait-for-deployment`, `send-notification`, `build-image`, and `run-test-suite`; those Task definitions are not included in the post, so their parameter contracts could not be fully validated from the article alone. The examples now use current Tekton APIs and valid Kubernetes YAML, but production pipelines should also pin tool images instead of using `latest` and avoid hard-coded database credentials.
