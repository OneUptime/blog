# Validation Summary: How to Create ArgoCD ApplicationSet Git Generator Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- ApplicationSet Git directory generator
- ApplicationSet Git files generator
- Matrix and merge generators
- Kubernetes manifests and kubectl
- Helm values and Kustomize options in Argo CD Applications

## Sources Consulted
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Matrix Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet Merge Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Merge/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet Templates documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/applicationset/Template/
- Amazon EKS ApplicationSet documentation for the generated Application label command: https://docs.aws.amazon.com/eks/latest/userguide/argocd-applicationsets.html

## Issues Found
- Updated ApplicationSet examples to enable `goTemplate: true` and use current Go template parameter syntax such as `{{.path.basename}}`, `{{.path.path}}`, and `{{index .path.segments n}}`. The original snippets used older fasttemplate-style placeholders even though current Argo CD examples and docs prefer Go templates.
- Fixed the directory exclude example. `exclude` is a boolean field on a directory entry, not a pattern string; the corrected example adds a separate `path: services/deprecated-*` entry with `exclude: true`.
- Fixed the branch-based matrix example by placing the list generator before the Git generator. Matrix child generators can consume parameters produced by earlier child generators, so the Git generator cannot use `branch` before the list generator has produced it.
- Clarified the canary example wording from implementing canary deployments to generating stable and canary variants. ApplicationSet generates Applications; actual traffic splitting depends on the chart/manifests consuming the `variant` and `weight` values.

## Review Notes
The examples are syntactically valid YAML after the corrections. The merge-generator example assumes each `config.json` contains keys such as `config` and `namespace`, which is consistent with how the Git files generator flattens JSON/YAML fields into template parameters.
