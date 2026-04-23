# Validation Summary: How to Configure DevSpace with Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- DevSpace
- Kubernetes
- Rancher
- Helm
- kubectl
- Docker BuildKit
- YAML configuration

## Sources Consulted
- DevSpace installation docs: https://www.devspace.sh/docs/getting-started/installation
- DevSpace `init` command docs: https://www.devspace.sh/docs/cli/devspace_init
- DevSpace development guide: https://www.devspace.sh/docs/getting-started/development
- DevSpace config reference: https://www.devspace.sh/docs/configuration/reference
- DevSpace deployments docs: https://www.devspace.sh/docs/configuration/deployments/
- DevSpace profiles patch docs: https://www.devspace.sh/docs/configuration/profiles/patches
- DevSpace BuildKit docs: https://www.devspace.sh/docs/configuration/images/build-engines/buildkit
- DevSpace `use namespace` command docs: https://www.devspace.sh/docs/cli/devspace_use_namespace
- DevSpace `use context` command docs: https://www.devspace.sh/docs/cli/devspace_use_context
- DevSpace `dev` command docs: https://www.devspace.sh/docs/cli/devspace_dev
- DevSpace `enter` command docs: https://www.devspace.sh/docs/cli/devspace_enter
- DevSpace `logs` command docs: https://www.devspace.sh/docs/cli/devspace_logs
- DevSpace `run-pipeline` command docs: https://www.devspace.sh/docs/cli/devspace_run-pipeline
- DevSpace `run` command docs: https://www.devspace.sh/docs/cli/devspace_run
- Kubernetes namespace docs: https://kubernetes.io/docs/tasks/administer-cluster/namespaces/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl reference for `exec`: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The Linux and Windows DevSpace installation commands were not aligned with the current official install instructions. I replaced them with the current official commands, including the required install step on Linux and PATH update on Windows.
- The example placed `namespace: development` under Helm `values`, which is chart-specific and not a generic DevSpace deployment setting. I moved the namespace setting to `deployments.app.namespace`, which is the documented DevSpace field.
- `devspace dev backend` is not a documented way to start a single dev configuration. I added a valid custom pipeline (`dev-backend`) and changed the example to `devspace run-pipeline dev-backend`.
- The profile patch that added a debug port used an array as the patch value for an array add operation. DevSpace patch examples add a single object to an array path, so I changed the value to a single port object.
- `devspace run-pipeline exec-backend` was presented as a way to execute a command in a running container, but `run-pipeline` starts a DevSpace pipeline instead. I replaced it with a valid `devspace enter --image-selector ...` example.
- `devspace run my-custom-pipeline` used the wrong command family. `devspace run` executes predefined commands, while pipelines are executed with `devspace run-pipeline`. I corrected the example accordingly.
- `devspace logs backend` and `devspace logs --all` are not current documented usages for the logs command. I replaced them with supported log examples based on selectors and interactive picking.
- The hooks section relied on `hooks`, which DevSpace documents as deprecated. I replaced that section with a pipeline-based example for post-build and post-deploy tasks.
- The in-cluster BuildKit example used `buildKit.inCluster.cache`, which is not a documented BuildKit field in DevSpace. I removed that invalid field and kept the supported in-cluster namespace example.

## Review Notes
- DevSpace’s documentation is internally inconsistent in a few places around dependency pipeline helper names (`run_dependencies` vs. `run_dependency_pipelines`). I kept `run_dependencies --all` where it appears in the current getting-started flow, but used the CLI and config reference as the source of truth for command syntax elsewhere.
- The article is Rancher-relevant because Rancher-managed clusters are standard Kubernetes targets once the kubeconfig context is configured; there is no special Rancher-only DevSpace configuration required in the post.
