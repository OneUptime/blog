# Validation Summary: How to Use Git File Generator with JSON Config Files in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- ApplicationSet Git file generator
- Go templates
- Kubernetes Application manifests
- Helm source configuration
- JSON
- jq
- kubectl
- Argo CD CLI

## Sources Consulted
- Argo CD Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Post Selector documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Post-Selector/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Git File Generator Globbing documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git-File-Globbing/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD `argocd appset get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_appset_get/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- jq manual: https://jqlang.org/manual/
- Argo CD Git generator source behavior for JSON/YAML object arrays and Go-template structure preservation: https://github.com/argoproj/argo-cd/blob/master/applicationset/generators/git.go

## Issues Found
- The post stated that one matched JSON file always equals one generated Application. Argo CD can also parse a file containing an array of parameter objects, so I qualified the statement to apply when each file contains one JSON object.
- The post selector example placed `selector` under the `git` generator configuration. Argo CD defines `selector` as a generator-level sibling of `git`, so I corrected the YAML indentation.
- The enable-flag section described the example as a boolean flag and said disabled Applications would be pruned. The example uses a string value for selector matching, and a post selector stops generating the Application, so I adjusted the wording.
- The CI section claimed schema validation but the sample only parsed JSON and checked name length, with an unused `SCHEMA` variable. I changed the wording to required-field validation and updated the jq script to validate required field presence, field types, and the `app_name` pattern before checking length.
- The debugging section said file generator paths follow Go's `filepath.Match` syntax. Argo CD documents default recursive Git file globbing and optional new doublestar globbing, so I replaced that note with the accurate behavior.

## Review Notes
The main ApplicationSet, Go-template, Helm values, sync policy, `kubectl logs`, `kubectl describe`, and `argocd appset get` examples are consistent with current official documentation. The `configs/**/*.json` example is appropriate for recursive matching, but Argo CD's default Git file globbing is intentionally greedy unless the newer doublestar implementation is enabled.
