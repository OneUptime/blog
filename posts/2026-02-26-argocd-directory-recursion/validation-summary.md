# Validation Summary: How to Use Directory Recursion in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD directory source type
- Argo CD CLI
- Kubernetes manifests
- YAML and JSON
- Kustomize, Helm, and Jsonnet source detection

## Sources Consulted
- Argo CD Directory user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Tool Detection user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/tool_detection/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD Automated Sync Policy user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Phases and Waves user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD repository manifest discovery source: https://github.com/argoproj/argo-cd/blob/master/reposerver/repository/repository.go

## Issues Found
- The practical example said the recursive Application picks up 12 files, but the listed tree contains 14 manifest files. Changed the count to 14.
- The post said ArgoCD switches to Kustomize or Helm mode for a subdirectory when a `kustomization.yaml` or `Chart.yaml` is found. Official Argo CD docs state that an explicitly configured directory source expects plain manifest files and can fail if it encounters Kustomize, Helm, or Jsonnet files. Updated the explanation and comment to describe render failure instead of per-subdirectory source switching.
- The troubleshooting section said hidden files are ignored. Argo CD's directory manifest discovery checks manifest extensions and does not generally skip dot-prefixed files in the directory walk. Replaced that item with the documented `# +argocd:skip-file-rendering` skip marker.
- The symlink note was too vague. Argo CD evaluates symlinks but rejects broken symlinks, links outside the repository, and links to non-regular files. Updated the bullet accordingly.

## Review Notes
The Argo CD CLI was not installed locally, so CLI flags were checked against the official Argo CD command reference instead of local `argocd --help` output.
