# Validation Summary: How to Write Lua Scripts for Custom Resource Actions in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD custom resource actions
- Argo CD resource customizations
- Kubernetes resources
- Lua action scripts
- Argo CD CLI

## Sources Consulted
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD `argocd app actions list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_list/
- Argo CD Lua utility package documentation: https://pkg.go.dev/github.com/argoproj/argo-cd/v3@v3.4.1/util/lua
- Argo CD Lua runtime source: https://github.com/argoproj/argo-cd/blob/v3.4.1/util/lua/lua.go
- Argo CD safe OS Lua library source: https://github.com/argoproj/argo-cd/blob/v3.4.1/util/lua/oslib_safe.go

## Issues Found
- The Lua environment section said Argo CD action scripts have access to standard Lua string and math operations. Current Argo CD resource action execution opens the base, package, table, and safe `os` libraries by default, but not the `string` or `math` libraries. Updated the runtime description to avoid implying those libraries are available.
- The container image update example used `string.match`, which is not available in default custom resource action scripts. Replaced it with a full image assignment that works without the `string` library.
- The `os` library description mentioned primarily `os.time()`. Argo CD's safe OS library exposes both `os.time()` and `os.date()`, so the description was updated.

## Review Notes
The resource action configuration shape, `discovery.lua` and `action.lua` behavior, `resource.customizations.actions.<apiGroup_Kind>` key format, and `argocd app actions list` command flags match the current Argo CD documentation. Some examples assume Deployment-like resources where `spec.template.spec.containers` exists; that is appropriate for the surrounding examples, but more defensive nil checks would be useful in production snippets for arbitrary resource kinds.
