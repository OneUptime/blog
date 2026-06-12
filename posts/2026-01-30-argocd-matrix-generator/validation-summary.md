# Validation Summary: How to Implement ArgoCD Matrix Generator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Matrix generator
- Cluster generator
- Git directory and Git files generators
- SCM Provider generator
- Kubernetes
- Helm parameters and value files

## Sources Consulted
- Argo CD Matrix Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/applicationset-specification/
- Argo CD `argocd appset generate` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_appset_generate/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_add/
- Argo CD Cluster Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD SCM Provider Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-SCM-Provider/

## Issues Found
- The post said the Matrix generator combines "multiple" or "two or more" child generators. Argo CD documents the Matrix generator as combining two child generators, with nesting allowed only one level for combination generators. Updated the wording to say two child generators.
- The Git files example used a single JSON file containing an `apps` array while the template referenced `{{app.name}}`. The Git files generator flattens file contents into parameters and generates one item per matching file, so the example would not produce one application per array item. Changed it to one JSON file per app under `config/apps/*.json`.
- The filtering example claimed `goTemplate` could filter matrix combinations but did not include any filtering condition, and Go templates do not post-filter generator output by themselves. Replaced this with an ApplicationSet generator `selector`, which supports post-filtering generator results.
- The cluster labeling commands patched Kubernetes Secrets after `argocd cluster add`. The Argo CD CLI supports `--label key=value` on `argocd cluster add`, which is simpler and avoids relying on Secret names. Updated both commands to use `--label`.
- The debug command used `argocd appset generate myapp-matrix -o yaml`, but the command expects a filename or URL, not an ApplicationSet resource name. Changed it to `argocd appset generate myapp-matrix.yaml -o yaml`.
- The merge conflict section said the second generator always takes precedence. Argo CD documents both override behavior and failure cases when child generator outputs contain identical keys with conflicting values, especially with Git generator path parameters. Updated the wording to reflect that caveat.

## Review Notes
The examples use the non-Go-template `{{name}}` style, which remains valid in ApplicationSet examples, while current Argo CD documentation increasingly shows `goTemplate: true` with `{{.name}}` style. A future refresh could standardize the post on Go templates, but that was not required for technical correctness.
