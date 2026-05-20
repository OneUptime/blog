# Validation Summary: How to Use Parameter Overrides with Kustomize in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kustomize
- Argo CD Application manifests
- Argo CD CLI
- Argo CD API
- GitHub Actions

## Sources Consulted
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD parameter overrides guide: https://argo-cd.readthedocs.io/en/stable/user-guide/parameters/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd app unset` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_unset/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get/
- Argo CD `argocd app patch` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_patch/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Application API package documentation: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/pkg/apiclient/application
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization

## Issues Found
- The description claimed the post covered replica and patch overrides, but the article only covered images, namespace, name prefix/suffix, labels, and annotations. Updated the description to match the actual content.
- The CLI examples used non-existent `argocd app set` flags `--kustomize-name-prefix` and `--kustomize-name-suffix`. Replaced them with the documented `--nameprefix` and `--namesuffix` flags.
- The API example sent a raw partial Application spec to the patch endpoint. Updated it to use the Application patch request shape with `patch` and `patchType`, matching the Argo CD API and CLI patch behavior.
- The Kustomize version example did not mention that custom versions must be configured in `argocd-cm`. Added that caveat to the inline comment.
- The reset section described removing all Kustomize overrides while only unsetting an image override. Updated the comment to say it removes an image override.
- The reset example used the non-existent `--kustomize-name-prefix` flag. Replaced it with the documented `--nameprefix` flag.

## Review Notes
- Argo CD's current Kustomize support also includes fields such as `replicas`, `patches`, `components`, and label selector controls, but the post's selected scope is technically valid after the description correction.
- `commonLabels` is still supported by Argo CD, but users should consider `labelWithoutSelector` and `labelIncludeTemplates` in newer Argo CD versions when they need to avoid changing selectors.
