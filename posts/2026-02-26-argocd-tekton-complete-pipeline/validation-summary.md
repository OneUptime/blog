# Validation Summary: How to Create a Complete Tekton + ArgoCD Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tekton Pipelines
- Tekton Triggers
- Argo CD
- Kubernetes
- Kaniko
- GitHub webhooks
- GitOps CI/CD

## Sources Consulted
- Tekton Pipelines Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton Pipelines Workspaces documentation: https://tekton.dev/docs/pipelines/workspaces/
- Tekton Pipelines documentation for task results and pipeline task ordering: https://tekton.dev/docs/pipelines/pipelines/
- Tekton Triggers Interceptors documentation: https://tekton.dev/docs/triggers/interceptors/
- Tekton Triggers API reference: https://tekton.dev/docs/triggers/triggers-api/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Kaniko maintained replacement documentation: https://github.com/osscontainertools/kaniko

## Issues Found
- The Kaniko task declared a `docker-config` workspace but tried to mount it with a Kubernetes `volumeMounts` entry that did not correspond to an explicitly defined volume. Tekton workspaces support `mountPath`, so the task now mounts the `docker-config` workspace at `/kaniko/.docker`, where Kaniko expects registry credentials.
- The Kaniko image used `gcr.io/kaniko-project/executor:latest`, from the original Google Kaniko project that was archived in 2025. Updated it to the maintained replacement image `ghcr.io/osscontainertools/kaniko:latest`.
- The GitHub interceptor reference omitted the current `ClusterInterceptor` kind and `triggers.tekton.dev` API version shown in Tekton's current interceptor documentation. Added both fields.
- The TriggerBinding used `$(body.repository.ssh_url)` for cloning the source repository, but the example pipeline does not provide SSH credentials for that clone step. Changed it to `$(body.repository.clone_url)` so the example works for public GitHub repositories without additional source-repo SSH setup.

## Review Notes
- The snippets are examples and still assume supporting Kubernetes objects exist, including the Argo CD `platform` project, Tekton installation manifests in the platform repo, the trigger service account and RBAC, webhook secret, registry secret, and deployment repository SSH key.
- The extracted YAML snippets parse successfully after the fixes.
