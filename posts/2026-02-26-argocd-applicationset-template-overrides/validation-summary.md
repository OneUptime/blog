# Validation Summary: How to Configure ApplicationSet Template Overrides in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- ApplicationSet
- ApplicationSet list generator
- ApplicationSet merge generator
- Go templates
- Kubernetes YAML manifests

## Sources Consulted
- Argo CD ApplicationSet Templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet Merge Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Merge/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/

## Issues Found
- The post incorrectly stated that a `template` block can be added inside an individual list generator element. Argo CD supports generator-level templates, and those templates apply to all applications produced by that generator. Updated the explanation and examples to split standard and overridden applications into separate list generator entries.
- The list generator examples would have applied the override template to every element in the list, not only to the intended application. Updated the examples so only the payment service, database migrator, critical app, and config service are produced by generators with override templates.
- The merge generator example mixed Git generator path parameters with a `name` merge key and referenced `project` and `targetRevision` values that the Git generator did not provide. Reworked the example to use a primary list generator with default parameters and an override list generator using the same `name` merge key.
- The database migrator example used `automated: null` to disable auto-sync. Updated it to use `spec.syncPolicy.automated.enabled: false`, which is the documented explicit way to disable automated sync while retaining other automated sync fields.
- The mixed Helm/Kustomize source example implied that omitting `helm` from an override would remove the base Helm configuration. Since generator templates behave like patches, the example was changed so Helm and Kustomize sources are defined in separate generator templates and no base `source.helm` field needs to be removed.

## Review Notes
The corrected examples use the default ApplicationSet template syntax except for the explicit Go template section. Argo CD documentation notes that the default fasttemplate engine is expected to be deprecated in favor of Go templates, so a future update could migrate all examples to `goTemplate: true` syntax.
