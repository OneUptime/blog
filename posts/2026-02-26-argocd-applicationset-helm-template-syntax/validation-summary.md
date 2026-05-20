# Validation Summary: How to Use Helm Template Syntax in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- ApplicationSet
- Go text/template
- Sprig template functions
- Helm chart sources and values
- Kubernetes / kubectl
- yq

## Sources Consulted
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Sprig string function documentation: https://masterminds.github.io/sprig/strings.html
- Sprig default function documentation: https://masterminds.github.io/sprig/defaults.html
- Go text/template package documentation: https://go.dev/pkg/text/template/

## Issues Found
- The post said ApplicationSet Go templates provide access to the same Sprig functions as Helm. Argo CD documents that it includes Sprig with exceptions for `env`, `expandenv`, and `getHostByName`, so the wording was changed to "most of the same functions" and the exceptions were named.
- The Sprig `default` example used a missing field while `goTemplateOptions: ["missingkey=error"]` was enabled. Argo CD documents that direct lookup of an unset key errors before a fallback can be applied, so the examples were changed to use `dig`.
- The conditional Helm parameter section said Go templates can conditionally add Helm parameters. Because ApplicationSet Go templates are evaluated per string field, they cannot add or remove list items that way; the wording now limits the claim to changing values and points to `templatePatch` for adding/removing list items.
- The whitespace-control example showed control blocks as raw YAML fields, which conflicts with ApplicationSet's per-string-field templating model. The example was changed to demonstrate whitespace trimming inside the `helm.values` string field.
- The pitfall about `range` was too broad and attributed the limitation to flat generator parameters. It was corrected to explain that the practical limitation is per-field evaluation, and to mention generator restructuring or `templatePatch`.

## Review Notes
The examples are illustrative and use placeholder repositories, chart names, and cluster URLs. The Helm value and parameter fields match current Argo CD Application source syntax.
