# Validation Summary: How to Use Matrix Generator for Combining Generators

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- ApplicationSet
- Matrix generator
- Git generator
- List generator
- Cluster generator
- Kubernetes
- GitOps
- Helm value files

## Sources Consulted
- Argo CD ApplicationSet Matrix Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/

## Issues Found
- The post claimed Matrix generators can create "three-way or higher combinations." Argo CD documentation says combination-type generators can only be nested once, so I changed this to "one level deep" and "three-way combinations."
- The nested Matrix note did not mention the official ordering rule for child generators that consume parameters from other child generators. I updated the note to explain that the consuming generator must come after the producing generator.
- The parameter precedence section said the second generator's value takes precedence. Official documentation is more nuanced: Matrix supports intentional overrides, but accidental key collisions can fail in cases such as generated Git path parameters. I changed the guidance to avoid relying on accidental collisions and to use distinct parameter names.
- The Cluster generator `values` example implied `clusterName` is available as a top-level parameter. Argo CD exposes Cluster generator values under the `values.` prefix, so I updated the comment to show `{{values.clusterName}}`.

## Review Notes
- The examples use the default fasttemplate-style `{{parameter}}` syntax. This is still supported, but Argo CD documentation notes that fasttemplate will be deprecated in favor of Go Template. A future refresh could convert the examples to `goTemplate: true` with `{{.parameter}}` syntax.
