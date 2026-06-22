# Validation Summary: How to Override Nested Values in Helm Charts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Helm charts and values files
- Helm subcharts and dependencies
- Kubernetes Pod specs
- YAML

## Sources Consulted
- Helm Values Files documentation: https://helm.sh/docs/chart_template_guide/values_files/
- Helm Subcharts and Global Values documentation: https://helm.sh/docs/chart_template_guide/subcharts_and_globals/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Helm Charts dependency and import-values documentation: https://helm.sh/docs/topics/charts/
- Helm Chart Best Practices for values: https://helm.sh/docs/chart_best_practices/values/
- Helm YAML Techniques documentation: https://helm.sh/docs/chart_template_guide/yaml_techniques/
- Helm Chart Development Tips and Tricks, tpl function: https://helm.sh/docs/howto/charts_tips_and_tricks/
- Helm get values command documentation: https://helm.sh/docs/helm/helm_get_values/
- Helm Debugging Templates documentation: https://helm.sh/docs/chart_template_guide/debugging/
- Kubernetes imagePullSecrets documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/

## Issues Found
- The "Replace vs Merge" example incorrectly stated that setting `resources.limits.cpu` would not preserve `resources.limits.memory`, while the shown result preserved it. Updated the comments to explain that only the specified leaf is replaced.
- The global values example duplicated a global value under the `postgresql` subchart, which implied this was necessary for global access. Updated it to show top-level `global` values and normal subchart-specific values separately.
- The `imagePullSecrets` example placed `imagePullSecrets` under an individual container. Kubernetes expects `imagePullSecrets` on the Pod spec, so the snippet was corrected.
- The conditional override example used duplicate `external` keys in the same YAML map. Replaced the boolean with `external.enabled` and updated the template condition accordingly.
- The "Merging with tpl" example did not use Helm's `tpl` function. Updated the values and template snippet so the example actually evaluates templated strings with `tpl`.
- The subchart import/export examples were misleading: `import-values` imports child values into the parent rather than preventing value leaking, and the `exports` example used Helm template expressions inside `values.yaml`. Updated the heading and example to match Helm's documented `exports.data` import format.
- The type coercion pitfall reversed the meaning of `--set-string`, calling it a way to force a number. Updated the example to keep numeric values unquoted with `--set` and use `--set-string` only when a string is expected.

## Review Notes
The Helm CLI was not installed in the local environment, so CLI behavior was verified against official Helm command documentation instead of local `helm --help` output.
