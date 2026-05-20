# Validation Summary: How to Use Git File Generator with YAML Config Files in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSets
- Argo CD Git file generator
- Kubernetes custom resources
- Helm configuration in Argo CD Applications
- YAML
- yq
- kubectl
- argocd CLI

## Sources Consulted
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Git Generator stable documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet introduction: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/helm/
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- OneUptime linked blog page: https://oneuptime.com/blog/post/2026-02-26-argocd-applicationset-per-team/view

## Issues Found
- The post incorrectly stated that the Git file generator officially supports JSON files and that YAML requires JSON workarounds or config management plugins. Current Argo CD documentation states that the Git file generator uses the contents of JSON/YAML files. I updated the explanation to say YAML files are supported directly.
- Several examples used JSON config files even though the post title and description focus on YAML config files. I converted those config examples and file path patterns to YAML (`config.yaml` and `*.yaml`) so the examples match the documented feature.
- The validation script used `jq` and `config.json`, which did not match the corrected YAML workflow. I updated it to validate and read YAML files with `yq e`.

## Review Notes
- The ApplicationSet snippets use valid fields for the Git file generator, template substitution, Helm `valueFiles`, Helm `values`, and Helm `parameters`.
- The nested configuration example correctly uses `goTemplate: true` and Go template dot access for nested file generator data.
- The edited YAML/JSON snippets were parsed successfully with PyYAML, and the shell validation script passed `bash -n`.
