# Validation Summary: How to Configure RBAC with Glob Patterns for Applications in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Kubernetes
- GitOps
- Glob pattern matching
- Argo CD CLI

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Go `github.com/gobwas/glob` package documentation: https://pkg.go.dev/github.com/gobwas/glob
- Go `path.Match` documentation, used to verify that it was not the correct matcher for Argo CD RBAC glob mode: https://pkg.go.dev/path#Match

## Issues Found
- The post incorrectly stated that Argo CD RBAC glob matching uses Go's standard-library `path.Match`. Updated this to describe Argo CD's `glob` RBAC match mode and note the current application object formats.
- The post incorrectly stated that `*` and `?` exclude `/`. Argo CD RBAC glob mode treats policy tokens as single terms and does not treat `/` as a separator, so the wildcard descriptions were corrected.
- The post described `**` as unsupported. Argo CD's glob implementation supports `**`, but Argo CD docs state it is unnecessary because `/` is not treated as a separator. Updated the guidance to recommend `*/*` for clear project/application object matching rather than saying `**` is unsupported.
- The "missing project part" example was clarified. A bare application name such as `my-app` does not match a normal `project/application` object, but the issue is matching the full object value rather than CSV syntax.

## Review Notes
The remaining RBAC policy examples and `argocd admin settings rbac can` commands align with the official Argo CD documentation. The examples assume the usual two-part `<project>/<application>` object format; installations using "Application in any namespace" need the three-part `<project>/<namespace>/<application>` object format.
