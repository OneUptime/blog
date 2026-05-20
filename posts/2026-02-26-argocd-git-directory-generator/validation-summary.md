# Validation Summary: How to Use Git Directory Generator in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- ApplicationSet
- Git directory generator
- Matrix generator
- Go templates
- Kubernetes manifests and kubectl
- Kustomize

## Sources Consulted
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD Go Template documentation and migration guide: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Matrix Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Tool Detection documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/tool_detection/
- Argo CD Application pruning and resource deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post used older fasttemplate-style Git generator parameters such as `{{path}}`, `{{path.basename}}`, and `{{path[0]}}`. Updated the examples to enable `goTemplate: true` with `goTemplateOptions: ["missingkey=error"]` and use the current Go template forms: `{{.path.path}}`, `{{.path.basename}}`, and `{{index .path.segments n}}`.
- The path parameter explanation described `path[n]` array access. Updated it to describe `.path.segments` and Go template `index` access, matching the Argo CD migration guide.
- The Matrix generator example templated `envs/{{env}}/*` and rendered fields with fasttemplate syntax. Updated it to `envs/{{.env}}/*` and Go template syntax throughout.
- The Matrix generator example omitted required Application template fields under `spec.source` and `spec.project`. Added `project`, `repoURL`, and `targetRevision` so the generated Applications have a complete source definition.

## Review Notes
The Git directory generator behavior, exclude precedence, Kustomize auto-detection claim, and kubectl troubleshooting commands are consistent with the consulted documentation. The examples now use Go templates, which Argo CD recommends over the older fasttemplate syntax.
