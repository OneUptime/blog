# Validation Summary: How to Get Started with Tekton Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tekton Pipelines
- Tekton CLI (`tkn`)
- Tekton Dashboard
- Kubernetes and `kubectl`
- Tekton Tasks, TaskRuns, Pipelines, PipelineRuns, Workspaces, Parameters, and Results
- Tekton Catalog and Artifact Hub
- Kaniko

## Sources Consulted
- Tekton Pipelines installation docs: https://tekton.dev/docs/pipelines/install/
- Tekton Pipeline docs: https://tekton.dev/docs/pipelines/pipelines/
- Tekton PipelineRun docs: https://tekton.dev/docs/pipelines/pipelineruns/
- Tekton TaskRun docs: https://tekton.dev/docs/pipelines/taskruns/
- Tekton Pipeline API reference: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton Workspaces docs: https://tekton.dev/docs/pipelines/workspaces/
- Tekton variables docs: https://tekton.dev/docs/pipelines/variables/
- Tekton CLI docs: https://tekton.dev/docs/cli/
- Tekton CLI command reference in `tektoncd/cli`: https://github.com/tektoncd/cli/tree/main/docs/cmd
- Tekton Dashboard installation docs: https://tekton.dev/docs/dashboard/install/
- Tekton Dashboard tutorial: https://tekton.dev/docs/dashboard/tutorial/
- Tekton Hub resolver deprecation notice: https://tekton.dev/docs/pipelines/hub-resolver/
- Artifact Hub Tekton tasks docs: https://artifacthub.io/docs/topics/repositories/tekton-tasks/
- Official `git-clone` catalog task: https://github.com/tektoncd-catalog/git-clone
- Tekton catalog `kaniko` task: https://github.com/tektoncd/catalog/tree/main/task/kaniko/0.7
- Kaniko upstream repository: https://github.com/GoogleContainerTools/kaniko

## Issues Found
- The Tekton Pipelines prerequisite listed Kubernetes 1.25 or later. Current Tekton Pipelines installation docs require Kubernetes 1.28 or later, so the prerequisite was updated.
- The Tekton Pipelines and Dashboard install commands used the old `storage.googleapis.com` release URLs. Current docs use `https://infra.tekton.dev/tekton-releases/...`, so both install commands were updated.
- The Linux Tekton CLI example pinned `tkn` v0.35.0. The latest checked release is v0.45.0, so the download and tarball names were updated.
- The Dashboard section did not mention the current Dashboard prerequisite of Kubernetes 1.31 or later. A short caveat was added to the optional Dashboard subsection.
- The parallel pipeline example referenced `git-clone` and `build-image` without supplying required parameters. Pipeline-level parameters and task parameter bindings were added.
- The Tekton Hub section used deprecated/dead `api.hub.tekton.dev` raw URLs. It was updated to current Tekton catalog raw manifest URLs and Artifact Hub discovery commands.
- The Kaniko executor image was pinned to v1.19.0. It was updated to v1.24.0, the latest upstream release found during review.

## Review Notes
- Kaniko is now archived upstream, and the Tekton catalog Kaniko task carries a deprecation annotation. The example remains technically valid as an introductory no-Docker-daemon build example, but production guidance should eventually move to a maintained image builder such as BuildKit or Buildah.
- The `lint`, `unit-test`, and `security-scan` Tasks in the parallel pipeline remain illustrative placeholders and would need corresponding Task definitions before that specific example could be applied as-is.
