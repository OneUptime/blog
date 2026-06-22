# Validation Summary: Automating Helm Deployments with Tekton Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tekton Pipelines
- Tekton Triggers
- Tekton Dashboard
- Tekton CLI (`tkn`)
- Helm
- Kubernetes
- OCI chart registries
- Prometheus Operator `ServiceMonitor`
- Kubeconform

## Sources Consulted
- Tekton Pipelines installation documentation: https://tekton.dev/docs/pipelines/install/
- Tekton Pipelines API documentation: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton Triggers installation documentation: https://tekton.dev/docs/triggers/install/
- Tekton EventListeners documentation: https://tekton.dev/docs/triggers/eventlisteners/
- Tekton Dashboard installation documentation: https://tekton.dev/docs/dashboard/install/
- Tekton CLI documentation and release metadata: https://tekton.dev/docs/cli/ and https://github.com/tektoncd/cli/releases/tag/v0.45.0
- Tekton official `git-clone` task package: https://artifacthub.io/packages/tekton-task/git-clone/git-clone
- CDF Tekton Helm chart repository: https://github.com/cdfoundation/tekton-helm-chart
- Helm command documentation for `lint`, `package`, `upgrade`, `registry login`, and `push`: https://helm.sh/docs/helm/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/

## Issues Found
- The Tekton Pipelines and Dashboard install URLs used the older `storage.googleapis.com` host. Updated them to the current official `infra.tekton.dev` release URLs.
- The Tekton Triggers install commands omitted `interceptors.yaml`, which is required for the GitHub and CEL interceptors used later in the trigger example. Added the interceptor install command.
- The Helm-based Tekton install command referenced a non-existent `tekton` chart repository. Replaced it with the CDF official Tekton Helm chart repository and `cdf/tekton-pipeline` chart.
- The Tekton CLI Linux install example was pinned to old version `v0.33.0`. Updated it to current release `v0.45.0` and added `sudo` to the install move into `/usr/local/bin`.
- Tekton Pipeline resources used `tekton.dev/v1beta1`. Updated Tasks, Pipelines, PipelineRuns, and embedded PipelineRun resources to `tekton.dev/v1` to match the current stable API.
- The CI/CD Pipeline referenced `git-clone` as a `ClusterTask`, which is no longer the appropriate default pattern and would not exist after a basic Tekton install. Added installation of the official namespaced `git-clone` Task and changed the pipeline `taskRef` to `name: git-clone`.
- The official `git-clone` Task runs as UID 65532 and may need workspace group permissions for PVC workspaces. Added `podTemplate.securityContext.fsGroup: 65532` to both manual and trigger-created PipelineRuns.
- The `helm-deploy` Task accepted an optional source workspace but used `$(workspaces.source.path)` whenever `values-file` was set. Added a bound-workspace check so runs fail clearly if a values file is requested without the workspace.
- The multi-environment pipeline passed environment-specific values files to `helm-deploy` without binding the source workspace. Added a `shared-workspace` declaration and bindings on each deploy task that uses `values-file`.

## Review Notes
All YAML code blocks were parsed successfully after the corrections. The examples still assume that referenced custom tasks such as `integration-tests` and `manual-approval`, registry credentials, Kubernetes RBAC for deployment, and Prometheus Operator CRDs are installed separately in the target cluster.
