# Validation Summary: How to Build Helm Template Functions Custom

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Helm chart templates
- Go text/template
- Sprig template functions
- Kubernetes manifests
- Helm library charts

## Sources Consulted
- Helm Chart Template Developer's Guide: https://helm.sh/docs/chart_template_guide/
- Helm Named Templates documentation: https://helm.sh/docs/chart_template_guide/named_templates/
- Helm Template Function List: https://helm.sh/docs/chart_template_guide/function_list/
- Helm Built-in Objects documentation: https://helm.sh/docs/chart_template_guide/builtin_objects/
- Helm Debugging Templates documentation: https://helm.sh/docs/chart_template_guide/debugging/
- Helm Library Charts documentation: https://helm.sh/docs/topics/library_charts/
- Helm template command documentation: https://helm.sh/docs/helm/helm_template/
- Helm lint command documentation: https://helm.sh/docs/helm/helm_lint/
- Kubernetes Object Names and IDs documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/

## Issues Found
- The post referred to chart-level reusable helpers as custom functions without clarifying that Helm charts define named helper templates, not new Go functions registered with Helm. Added a short clarification in the overview while preserving the article's terminology.
- The `myapp.dnsSafeName` helper only replaced underscores and dots, so inputs containing other invalid DNS label characters could still produce invalid names. Updated it to replace all characters outside lowercase alphanumerics and hyphens, then trim leading and trailing hyphens.
- The `myapp.mergeLabels` helper said later maps override earlier ones, but Helm's `merge` gives precedence to the destination dictionary. Updated the helper to use `mergeOverwrite`, which matches the stated behavior.
- The `myapp.imagePullSecrets` helper rendered `.Values.imagePullSecrets` as a list without an `imagePullSecrets:` key when no global image pull secrets were set. Updated it to concatenate global and local image pull secret lists and render the key whenever the combined list is non-empty.

## Review Notes
Helm was not installed in the local workspace, so CLI command validation was performed against the official Helm command documentation instead of local `helm --help` output. The examples are general Helm 3/4 template patterns; Helm's current function-list page notes that some content has not yet been updated for Helm 4, but the functions used by this post are still documented there.
