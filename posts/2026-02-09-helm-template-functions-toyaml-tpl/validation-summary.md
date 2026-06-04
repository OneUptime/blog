# Validation Summary: How to Use Helm Template Functions like toYaml, tpl, and include

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm chart templating
- Kubernetes manifests
- Go template syntax
- YAML

## Sources Consulted
- Helm Template Function List: https://helm.sh/docs/v3/chart_template_guide/function_list/
- Helm Chart Development Tips and Tricks: https://helm.sh/docs/v3/howto/charts_tips_and_tricks/
- Helm Named Templates Guide: https://helm.sh/docs/v3/chart_template_guide/named_templates/
- Helm Variables Guide: https://helm.sh/docs/v3/chart_template_guide/variables/

## Issues Found
- The `podAnnotations` example rendered annotations on the Deployment metadata instead of the Pod template metadata. I moved the annotations under `spec.template.metadata.annotations` so the example matches the `podAnnotations` value name and expected Kubernetes behavior.
- The Dynamic Resource Generation section said it used `include` and `toYaml`, but the example used `include` and `merge`. I changed the wording to match the actual Helm functions used.
- The Error Handling section said it used `fail`, `required`, and `tpl`, but the example only used `fail` with conditional logic. I changed the wording to match the example.

## Review Notes
The Helm CLI is not installed in the local environment, so examples were reviewed against the official Helm documentation and by static inspection rather than by rendering with `helm template`.
