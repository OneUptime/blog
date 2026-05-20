# Validation Summary: How to Debug Tool Detection Issues in ArgoCD

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- Config Management Plugins
- Helm
- Kustomize
- Jsonnet
- Git
- kubectl
- argocd CLI

## Sources Consulted
- Argo CD Tool Detection documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/tool_detection/
- Argo CD Directory documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Jsonnet documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/jsonnet/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD v3.4.1 repo-server source discovery code: https://github.com/argoproj/argo-cd/blob/v3.4.1/util/app/discovery/discovery.go
- Argo CD v3.4.1 repository source type code: https://github.com/argoproj/argo-cd/blob/v3.4.1/reposerver/repository/repository.go
- Argo CD v3.4.1 Application API types: https://github.com/argoproj/argo-cd/blob/v3.4.1/pkg/apis/application/v1alpha1/types.go
- Argo CD v3.4.1 repo-server command flags: https://github.com/argoproj/argo-cd/blob/v3.4.1/cmd/argocd-repo-server/commands/argocd_repo_server.go

## Issues Found
- The post claimed CMP plugins lose to built-in tool detection. Current Argo CD repo-server discovery checks CMP sidecar discovery before built-in Helm and Kustomize marker detection, so I corrected the explanation and the local test script notes.
- The post described Jsonnet as an auto-detected source type. Current Argo CD status source types are Helm, Kustomize, Directory, and Plugin; Jsonnet files are evaluated within Directory applications. I updated examples, marker checks, and the script accordingly.
- The repo clone command used `git clone --depth 1 --branch "$REVISION"`, which can fail for common values such as `HEAD` or a raw commit SHA. I changed it to clone and then checkout the target revision.
- The Kustomize marker `ls` command could print a found file and still emit the "No kustomization files" fallback because `ls` exits non-zero when any listed file is missing. I replaced it with a `find` command.
- The repo-server debug logging example used `ARGOCD_LOG_LEVEL`, but the repo-server flag reads `ARGOCD_REPO_SERVER_LOGLEVEL`. I corrected the environment variable.
- The symlink section claimed Argo CD does not follow symlinks during detection. Current Argo CD primarily rejects out-of-bounds symlinks before manifest generation, so I corrected the section.
- The sparse checkout section implied Argo CD sparse checkout behavior. I replaced it with a local incomplete-checkout warning, which is the relevant debugging risk.
- The CMP discovery simulation implied discovery should be tested in `/tmp` inside the sidecar. The current v3.4.1 CMP server source executes `discover.fileName`, `discover.find.glob`, and `discover.find.command` from the Application source directory, so I corrected those commands.

## Review Notes
The post is now accurate for current Argo CD documentation and v3.4.1 source behavior. Multi-source Applications may also populate `status.sourceTypes`; the article focuses on the single-source `status.sourceType` workflow. The release-3.4 CMP docs still contain a comment saying `discover.find.command` runs from the repository root, but the v3.4.1 CMP server code runs it from the Application source directory.
