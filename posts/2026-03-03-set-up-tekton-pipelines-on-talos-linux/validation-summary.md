# Validation Summary: How to Set Up Tekton Pipelines on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Tekton Pipelines
- Tekton Dashboard
- Tekton CLI
- Tekton Triggers
- Tekton Pruner
- Kaniko
- Go

## Sources Consulted
- Tekton Pipelines installation documentation: https://tekton.dev/docs/installation/pipelines/
- Tekton Dashboard installation documentation: https://tekton.dev/docs/dashboard/install/
- Tekton CLI documentation: https://tekton.dev/docs/cli/
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton Workspaces documentation: https://tekton.dev/docs/pipelines/workspaces/
- Tekton PipelineRuns documentation: https://tekton.dev/docs/pipelines/pipelineruns/
- Tekton Triggers installation documentation: https://tekton.dev/docs/installation/triggers/
- Tekton TriggerTemplates documentation: https://tekton.dev/docs/triggers/triggertemplates/
- Tekton TriggerBindings documentation: https://tekton.dev/docs/triggers/triggerbindings/
- Tekton EventListeners documentation: https://tekton.dev/docs/triggers/eventlisteners/
- Tekton Interceptors documentation: https://tekton.dev/docs/triggers/interceptors/
- Tekton Pruner documentation: https://tekton.dev/docs/pruner/
- Kubernetes docker-registry Secret documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Go release documentation: https://go.dev/doc/devel/release and https://go.dev/doc/go1.26
- Kaniko GitHub releases and archive notice: https://github.com/GoogleContainerTools/kaniko/releases
- Talos Linux configuration documentation: https://www.talos.dev/latest/reference/configuration/

## Issues Found
- Updated Tekton Pipelines and Dashboard install URLs from the older `storage.googleapis.com` paths to the current official `infra.tekton.dev` release manifest paths.
- Updated the Go task images from `golang:1.22` to `golang:1.26` to avoid showing an outdated Go release.
- Pinned the Kaniko executor image to `gcr.io/kaniko-project/executor:v1.24.0`, the last published Kaniko release, instead of using `latest`.
- Fixed the Kaniko Docker config Secret mount by mapping the standard Kubernetes `.dockerconfigjson` key to `/kaniko/.docker/config.json`.
- Removed the unused `docker-credentials` Tekton workspace bindings from the Task, Pipeline, PipelineRun, and TriggerTemplate examples because the Task uses a Kubernetes Secret volume directly.
- Fixed the PipelineRun log command to capture the generated PipelineRun name and pass it to `tkn pipelinerun logs`; the original command omitted the required run name.
- Moved `serviceAccountName` in the EventListener example to `spec.serviceAccountName`, matching the current v1beta1 EventListener API.
- Replaced the cleanup CronJob example because it used a `kubectl` image to run `tkn`, referenced an undefined service account, and would not work as written. The post now uses Tekton Pruner with an official ConfigMap-based retention policy.
- Corrected the cleanup command comment from deleting runs older than 24 hours to keeping the 10 most recent PipelineRuns.

## Review Notes
- The fenced YAML snippets were parsed successfully with PyYAML after the fixes.
- Kaniko is archived upstream as of June 2025. The pinned `v1.24.0` image is accurate for the example, but future revisions should consider BuildKit, Buildah, or another maintained image builder.
