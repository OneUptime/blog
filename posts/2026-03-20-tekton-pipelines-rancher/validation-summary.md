# Validation Summary: How to Set Up Tekton Pipelines with Rancher - Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tekton Pipelines
- Tekton Triggers
- Tekton Dashboard
- Tekton CLI (`tkn`)
- Rancher-managed Kubernetes clusters
- Kubernetes manifests and RBAC
- Container image builds with Kaniko
- GitHub Container Registry authentication

## Sources Consulted
- Tekton Pipelines installation documentation: https://tekton.dev/vault/pipelines-main/install/
- Tekton Triggers installation documentation: https://tekton.dev/vault/triggers-main/install/
- Tekton Getting Started with Pipelines: https://tekton.dev/docs/getting-started/pipelines/
- Tekton Getting Started with Triggers: https://tekton.dev/docs/getting-started/triggers/
- Tekton CLI installation documentation: https://github.com/tektoncd/cli
- Tekton Dashboard installation documentation: https://tekton.dev/docs/dashboard/install/
- Tekton Pipelines ClusterTask deprecation documentation: https://tekton.dev/docs/pipelines/deprecations/
- Tekton Workspaces documentation: https://tekton.dev/vault/pipelines-main/workspaces/
- Kubernetes `kubectl create` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/
- Kubernetes object names and `generateName` documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Rancher kubeconfig and kubectl access documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig

## Issues Found
- The introduction said Tekton could be deployed through Helm, but the tutorial used the official release manifests. Updated the wording to match the documented manifest-based installation flow.
- The Tekton component install URLs used the older `storage.googleapis.com` release paths. Updated them to the current official `infra.tekton.dev` release URLs.
- The Triggers install step omitted `interceptors.yaml`, which the current official Triggers installation applies alongside `release.yaml`. Added the missing command.
- The Tekton CLI install command used a non-existent generic `latest/download/tkn_Linux_x86_64.tar.gz` asset name. Updated it to the current documented Linux AMD64 release artifact and extraction command.
- The Pipeline referenced `git-clone` as a `ClusterTask`, but ClusterTasks are deprecated and the Tekton Pipelines install does not provide that task by default. Added a namespaced `git-clone` Task and updated the Pipeline to reference it as a normal Task.
- The build Task referenced a `registry-credentials` Secret without showing how to create it. Added an idempotent `kubectl create secret docker-registry ... --dry-run=client -o yaml | kubectl apply -f -` command.
- The Task and Pipeline examples did not include commands to apply the manifests before creating the PipelineRun. Added the missing `kubectl apply` commands.
- The PipelineRun used `generateName` but the command used `kubectl apply`. Since generated names are created via create requests, changed the command to `kubectl create -f pipeline-run.yaml`.
- The PipelineRun log command omitted a PipelineRun name or `--last`. Updated it to `tkn pipelinerun logs --last -f -n tekton-pipelines`.
- The webhook trigger section only created a TriggerTemplate. Added the TriggerBinding, ServiceAccount, RoleBinding, ClusterRoleBinding, EventListener, and local port-forward command needed for a functional basic trigger.
- The best-practices section recommended ClusterTasks and described `volumeClaimTemplate` storage as ephemeral. Updated it to avoid deprecated ClusterTasks and describe `volumeClaimTemplate` as creating a per-run PersistentVolumeClaim.

## Review Notes
- The Dashboard install command is still accurate for the documented read-only dashboard install. Teams that need dashboard write operations should use the documented `release-full.yaml` variant and secure it carefully.
- The webhook example is a basic GitHub push-payload trigger. Production webhook endpoints should add Git provider signature validation, TLS, and an Ingress or LoadBalancer instead of relying on local port-forwarding.
- The Kaniko example is technically usable, but the original GoogleContainerTools Kaniko repository has been archived. Future updates should consider a maintained image-build option such as BuildKit or a supported Kaniko fork.
