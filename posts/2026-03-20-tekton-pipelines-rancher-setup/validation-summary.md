# Validation Summary: How to Set Up Tekton Pipelines with Rancher - Pipelines Setup

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Tekton Pipelines
- Tekton Dashboard
- Tekton Triggers
- Tekton CLI (`tkn`)
- Rancher-managed Kubernetes
- Kubernetes namespaces, RBAC, Secrets, and PVC-backed Workspaces
- Kaniko
- Tekton Catalog `git-clone` Task
- Rancher Fleet
- Longhorn

## Sources Consulted
- Tekton Pipelines installation documentation: https://tekton.dev/docs/installation/pipelines/
- Tekton Dashboard installation documentation: https://tekton.dev/docs/dashboard/install/
- Tekton Triggers installation documentation: https://tekton.dev/docs/triggers/install/
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton Pipelines documentation: https://tekton.dev/docs/pipelines/pipelines/
- Tekton PipelineRuns documentation: https://tekton.dev/docs/pipelines/pipelineruns/
- Tekton PipelineResources replacement documentation: https://tekton.dev/docs/pipelines/pipelineresources/
- Tekton clone repository how-to: https://tekton.dev/docs/how-to-guides/clone-repository/
- Tekton build and push with Kaniko how-to: https://tekton.dev/docs/how-to-guides/kaniko-build-push/
- Tekton CLI repository and install instructions: https://github.com/tektoncd/cli
- Tekton Catalog `git-clone` Task v0.10: https://github.com/tektoncd/catalog/tree/main/task/git-clone/0.10
- Kubernetes private registry Secret documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kaniko registry authentication documentation: https://github.com/GoogleContainerTools/kaniko

## Issues Found
- The introduction overstated direct Rancher project integration. I changed it to say Tekton works with the Kubernetes namespaces and RBAC policies that Rancher manages.
- The setup did not create the `my-app` namespace used by every manifest. I added a namespace creation command.
- The Tekton Dashboard URL was not aligned with current Tekton Dashboard docs. I updated it to the current `infra.tekton.dev` release URL.
- The Linux `tkn` install example used an outdated v0.37.0 tarball. I updated it to v0.44.0 and used the official tar extraction pattern.
- The Kaniko Task referenced a registry Secret that was never created. I added a `kubectl create secret docker-registry` example.
- The Kaniko Secret mount would not expose `config.json` when using a standard `kubernetes.io/dockerconfigjson` Secret. I mapped `.dockerconfigjson` to `config.json` under `/kaniko/.docker`.
- The Kaniko example disabled TLS verification by default. I removed `--skip-tls-verify` so the example uses normal registry TLS validation.
- The Task and Pipeline examples did not show applying the manifests before the PipelineRun. I added `kubectl apply` commands for both.
- The Pipeline referenced `git-clone` as a `ClusterTask`, but `ClusterTask` is deprecated and the task was not installed by the tutorial. I added installation of the versioned namespaced `git-clone` Task v0.10 and changed the `taskRef` to a normal `Task`.
- The PipelineRun used `generateName` but was run with `kubectl apply`; generated names should be created with `kubectl create`. I changed the command accordingly.
- The `tkn pipelinerun logs` command omitted a PipelineRun name or `--last`. I changed it to `tkn pipelinerun logs --last -f -n my-app`.
- The Tekton Triggers install step omitted the interceptors manifest required by the official install instructions. I added the `interceptors.yaml` install command.
- The best-practices section recommended deprecated `ClusterTasks` and removed `PipelineResources`. I updated the guidance to use versioned Tasks or Tekton resolvers, and Workspaces backed by Longhorn PVCs.

## Review Notes
- The YAML snippets were parsed successfully after the edits.
- The post still uses `latest` release manifests and the `latest` Kaniko image tag for simplicity. For production, pin Tekton component versions and container image tags.
