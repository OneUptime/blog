# Validation Summary: How to Use Jsonnet External Variables in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Jsonnet external variables
- Kubernetes manifests
- Argo CD CLI

## Sources Consulted
- Argo CD Jsonnet user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/jsonnet/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_manifests/
- Jsonnet standard library reference: https://jsonnet.org/ref/stdlib.html
- Jsonnet language reference: https://jsonnet.org/ref/language.html

## Issues Found
- The post said Argo CD extVars are always strings. Argo CD passes extVars as strings by default, but the Application spec also supports `code: true`, and the CLI supports `--jsonnet-ext-var-code`, for values evaluated as Jsonnet code. Updated the wording to describe the default string behavior and the `code: true` option.
- The post said the defaults example would work when an extVar is not provided. `std.extVar()` errors when the variable is missing, so the example only works when the variable is provided as an empty string or sentinel value. Updated the text and comment to make that limitation explicit.

## Review Notes
The main Argo CD Application and ApplicationSet field paths, `--jsonnet-ext-var-str` CLI usage, local `jsonnet --ext-str` command, and `argocd app manifests --source live` command match official documentation. The Kubernetes snippets are illustrative and syntactically plausible, though the Ingress example assumes a matching Service exists elsewhere.
