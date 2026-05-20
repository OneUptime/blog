# Validation Summary: How to Use Git File Generator Globbing Patterns in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSets
- Git file generator
- Kubernetes custom resources
- YAML configuration
- Argo CD CLI and kubectl commands
- Go-template ApplicationSet parameters

## Sources Consulted
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD Git File Generator Globbing documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git-File-Globbing/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD `argocd appset get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_appset_get/
- Doublestar package documentation: https://github.com/bmatcuk/doublestar

## Issues Found
- The post said Git file generator paths use Go `filepath.Match` style globbing with a `**` extension. Argo CD documents the newer precise globbing behavior as opt-in and implemented with the `doublestar` package, while the original default behavior is greedy. Updated the explanation to state that the examples rely on the new globbing mode and list the documented enablement options.
- The path parameter example treated `.path` as the directory string and described `.path.basename` as the filename without extension. Argo CD documents the directory path as `.path.path`, the matched filename as `.path.filename`, and `.path.basename` as the basename of the directory containing the file. Updated the comments in the example accordingly.

## Review Notes
The YAML snippets use valid ApplicationSet fields for the Git file generator. The default non-Go-template examples use the legacy `{{name}}` style, while the path-aware example correctly enables `goTemplate: true` and uses `{{.name}}` style parameters.
