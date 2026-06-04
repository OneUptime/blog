# Validation Summary: How to Use Affinity Assistant for Workspace Volume Affinity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes volume access modes
- Kubernetes `emptyDir` volumes
- Tekton Pipelines
- Tekton Workspaces
- Tekton Affinity Assistant
- `kubectl`

## Sources Consulted
- Tekton Affinity Assistants documentation: https://tekton.dev/docs/pipelines/affinityassistants/
- Tekton Workspaces documentation: https://tekton.dev/vault/pipelines-main/workspaces/
- Tekton additional configuration documentation: https://tekton.dev/docs/pipelines/additional-configs/
- Tekton deprecations documentation: https://tekton.dev/docs/pipelines/deprecations/
- Tekton Pipeline API reference: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton Pod templates documentation: https://tekton.dev/vault/Pipelines-main/podtemplates/
- Tekton labels and annotations documentation: https://tekton.dev/docs/pipelines/labels/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- Replaced deprecated `tekton.dev/v1beta1` Pipeline and PipelineRun examples with `tekton.dev/v1`, because Tekton documents `v1beta1` Task, TaskRun, Pipeline, and PipelineRun APIs as deprecated in favor of `v1`.
- Replaced the removed `disable-affinity-assistant` feature flag with the current `coschedule: "workspaces"` feature flag, which Tekton now uses to control Affinity Assistant modes.
- Removed the unsupported `tekton.dev/affinity-assistant` PipelineRun annotation example and replaced it with `coschedule` configuration in the `feature-flags` ConfigMap.
- Corrected the multiple PVC workspace guidance. In `coschedule: "workspaces"` mode, a TaskRun can mount only one PVC-backed workspace; tasks that need multiple PVC-backed workspaces should use `coschedule: "pipelineruns"`.
- Corrected the `emptyDir` guidance. Tekton documents `emptyDir` as suitable for sharing data among steps in a single TaskRun, not among separate tasks in a Pipeline.
- Replaced an incorrect automatic cleanup example using `config-defaults` with Tekton's documented `tekton.dev/auto-cleanup-pvc: "true"` annotation for `volumeClaimTemplate` workspaces.
- Updated the advanced placement example to use `spec.taskRunTemplate.podTemplate.nodeSelector`, matching the current Tekton v1 PipelineRun structure and the fields Tekton applies to Affinity Assistant pods.
- Softened absolute ReadWriteOnce failure language to account for storage-dependent detach, reattach, and node-affinity behavior.

## Review Notes
The post is technically relevant and salvageable. The examples still assume referenced Tasks such as `git-clone`, `buildah`, `pytest`, and `maven-build` already exist in the cluster.
