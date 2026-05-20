# Validation Summary: How to Use Jsonnet TLA (Top-Level Arguments) in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Application manifests
- Argo CD CLI
- Jsonnet
- Jsonnet top-level arguments (TLAs)
- Jsonnet external variables (extVars)
- Kubernetes manifests

## Sources Consulted
- Argo CD Jsonnet user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/jsonnet/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_set/
- Jsonnet Language Reference: https://jsonnet.org/ref/language.html
- Local Jsonnet CLI syntax/evaluation check with Jsonnet v0.20.0

## Issues Found
- The post described an extVar-based `main.jsonnet` as a "regular expression." Jsonnet programs are expressions, but "regular expression" usually means regex. Changed this to "regular Jsonnet expression" to match Jsonnet terminology.

## Review Notes
- The Argo CD `directory.jsonnet.tlas` field and `code` flag are consistent with the official Application spec.
- The `--jsonnet-tla-str` and `--jsonnet-tla-code` flags are present in the official `argocd app create` and `argocd app set` command references.
- The Jsonnet examples in the post were evaluated locally and parsed successfully with representative TLA/extVar values.
