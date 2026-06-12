# Validation Summary: How to Use Tekton Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tekton Triggers (EventListener, TriggerTemplate, TriggerBinding, ClusterTriggerBinding)
- Tekton Pipelines (PipelineRun)
- Kubernetes (Ingress, Secret, ServiceAccount, Role, ClusterRole, RoleBinding, ClusterRoleBinding)
- CEL (Common Expression Language) interceptor
- GitHub, GitLab, Bitbucket Server webhook interceptors
- kubectl, openssl, ngrok

## Sources Consulted
- Tekton Triggers official documentation: https://tekton.dev/docs/triggers/
- Tekton CEL interceptor reference: https://tekton.dev/docs/triggers/cel_expressions/
- Tekton Triggers EventListener docs: https://tekton.dev/docs/triggers/eventlisteners/
- Tekton Triggers ClusterInterceptors docs: https://tekton.dev/docs/triggers/clusterinterceptors/
- Tekton Triggers source: https://github.com/tektoncd/triggers/blob/main/pkg/interceptors/cel/cel.go
- Tekton Triggers interceptors docs: https://github.com/tektoncd/triggers/blob/main/docs/interceptors.md
- cel-go ext package: https://pkg.go.dev/github.com/google/cel-go/ext
- GitHub webhook events documentation
- GitLab webhook events documentation
- Atlassian Bitbucket Server webhook events documentation

## Issues Found

### Issue 1: Bitbucket interceptor configuration was internally inconsistent
The Bitbucket Interceptor section combined `secretRef` (a Bitbucket Server-only feature — Bitbucket Cloud does not support webhook secret validation through this interceptor) with `eventTypes: ["repo:push"]` (which is the Bitbucket Cloud event name; the Bitbucket Server equivalent is `repo:refs_changed`).

**Fix applied:** Updated the example to be consistent with Bitbucket Server (since `secretRef` is shown for production-grade validation). Changed the event type from `repo:push` to `repo:refs_changed`, added a clarifying comment noting the Bitbucket Server vs Bitbucket Cloud distinction so readers using Bitbucket Cloud know to omit `secretRef` and keep `repo:push`.

## Review Notes

- **CEL `.last()` method**: Verified via Tekton CEL source that Tekton Triggers registers both `ext.Strings()` and `ext.Lists()`, so list methods like `.first()` and `.last()` and string methods like `.lowerAscii()`, `.replace()`, and `.substring()` are valid. The CEL expressions throughout the post are correct.
- **API versions**: The post uses `triggers.tekton.dev/v1beta1` (current main API for Triggers) and `tekton.dev/v1beta1` for PipelineRun. `tekton.dev/v1` is now the recommended version for Tekton Pipelines (stable since v0.50.0), but `v1beta1` remains supported and functional. No change made since both work, but readers may want to migrate to `tekton.dev/v1` going forward.
- **Ingress annotation**: The example uses `kubernetes.io/ingress.class: nginx` annotation, which is deprecated in favor of the `spec.ingressClassName` field. The annotation still works on most ingress controllers and is widely used, so no change applied.
- **EventListener `spec.serviceAccountName`**: Used at the top level — this is still supported in the v1beta1 API. The newer pattern uses `spec.resources.kubernetesResource.spec.template.spec.serviceAccountName`, but the top-level field continues to work.
- **GitHub/GitLab webhook payload field references** (e.g., `body.after`, `body.pull_request.head.sha`, `body.object_attributes.last_commit.id`, `body.checkout_sha`) all correctly match the documented webhook JSON payload structures.
- **RBAC ClusterRoles** referenced in the complete example (`tekton-triggers-eventlistener-roles`, `tekton-triggers-eventlistener-clusterroles`) are the standard ClusterRoles installed by `release.yaml` and are correctly used.
