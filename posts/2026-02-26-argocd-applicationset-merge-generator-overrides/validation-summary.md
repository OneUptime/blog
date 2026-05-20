# Validation Summary: How to Override Generator Values with Merge Generator in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSets
- Merge generator
- Matrix generator
- Git generator
- Cluster generator
- List generator
- Go templates and Sprig template functions
- Kubernetes manifests and kubectl
- Argo CD CLI

## Sources Consulted
- Argo CD Merge Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Merge/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD `argocd appset get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_appset_get/

## Issues Found
- The basic merge example used `targetRevision` and `project` template parameters that the Git directory generator did not emit for non-overridden services. I added Git generator `values` defaults and changed the list override keys and template references to use the documented `values.` parameter prefix.
- The defaults section said to use a third generator layer, but the example actually used template fallbacks. I corrected the text to describe Go template fallbacks.
- The defaults examples used the Sprig `default` function with `goTemplateOptions: ["missingkey=error"]`. Argo CD documentation notes that missing keys still fail before `default` can handle them, so I changed the examples to use `dig`, which is the documented pattern for unset parameters.
- The cluster override example had the same `default` plus `missingkey=error` issue. I changed the fallback expressions to `dig`.
- The three-layer merge example claimed an `auto_sync` override disabled auto-sync, but the template did not consume that parameter. I removed the unused `auto_sync` value and made the `replicas` override visible in the rendered Application via a Helm parameter.
- The debugging command `argocd appset get merged-services` did not show generated parameters by default. I added the documented `--show-params` flag.

## Review Notes
The corrected examples align with Argo CD's documented merge precedence: the first generator provides base parameter sets, later matching generators override them, and non-matching parameter sets from later generators are discarded. YAML snippets were parsed successfully after the edits.
