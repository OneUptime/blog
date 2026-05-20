# Validation Summary: How to Include or Exclude Files in ArgoCD Directory Source

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes manifests
- Argo CD Application directory sources
- Glob include and exclude patterns

## Sources Consulted
- Argo CD Directory user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/application-specification/
- Argo CD Jsonnet user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/jsonnet/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD repository source for directory manifest filtering: https://github.com/argoproj/argo-cd/blob/master/reposerver/repository/repository.go
- Argo CD directory include/exclude tests: https://github.com/argoproj/argo-cd/blob/master/reposerver/repository/repository_test.go

## Issues Found
- The post said directory applications read only YAML and JSON files. Argo CD also treats `*.jsonnet` files in directory apps as Jsonnet, so the intro and default extension list were updated.
- The post said hidden files starting with `.` are skipped. The Argo CD manifest walker filters by manifest extension and include/exclude rules, not by hidden filename, so this was corrected to say hidden manifest files should be explicitly excluded when needed.
- The post said include/exclude glob patterns match filenames only and cannot target subdirectories. Argo CD matches relative paths from the Application source path, and the official docs use patterns such as `some-directory/*` and `env-usw2/*`. The recursive example, glob reference, and common mistake section were corrected.

## Review Notes
The Argo CD CLI was not installed in the local environment, so command syntax was verified against official command reference documentation instead of local `--help` output.
