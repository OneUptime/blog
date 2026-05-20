# Validation Summary: How to Use Merge Generator in ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- ApplicationSet Merge generator
- ApplicationSet Git and List generators
- Go templates and Sprig functions in ApplicationSets
- Kubernetes kubectl

## Sources Consulted
- Argo CD Merge Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Merge/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Clarified Merge generator behavior: non-matching parameter sets from later generators are discarded. This matches the official Merge generator documentation and prevents readers from assuming unmatched override entries create new Applications.
- Fixed the Git directory plus List override example so services without overrides render valid `destination.server` and sync-wave values. The example now sets defaults through the Git generator `values` field and overrides the generated `values.*` parameters from the List generator, matching the documented `values.` prefix behavior.
- Replaced the missing-parameter fallback example with the documented `dig` pattern and added a second base app without `customDomain`, so the example actually demonstrates a safe fallback for parameter sets that lack that key.

## Review Notes
- The post uses the default fasttemplate syntax in most examples, which is still documented. The Go-template example correctly uses `goTemplate: true`.
- Nested merge keys such as `path.basename` work in non-Go-template examples, but Argo CD documents that nested merge keys are not supported when Go templating is enabled.
- `kubectl` was not installed in the workspace, so command validation was performed against the official Kubernetes command reference instead of local `--help` output.
