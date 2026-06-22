# Validation Summary: Mastering Helm Template Functions and Pipelines

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Helm chart templates
- Go `text/template`
- Sprig template functions
- Kubernetes manifests and labels
- YAML configuration

## Sources Consulted
- Helm Template Function List: https://helm.sh/docs/chart_template_guide/function_list/
- Helm Template Functions and Pipelines: https://helm.sh/docs/chart_template_guide/functions_and_pipelines/
- Helm Built-in Objects: https://helm.sh/docs/chart_template_guide/builtin_objects/
- Helm Flow Control: https://helm.sh/docs/chart_template_guide/control_structures/
- Helm Named Templates: https://helm.sh/docs/chart_template_guide/named_templates/
- Helm Chart Best Practices, General Conventions: https://helm.sh/docs/chart_best_practices/conventions/
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Sprig String Functions: https://masterminds.github.io/sprig/strings.html

## Issues Found
- The built-in object example used `.Chart.Version` directly in a Kubernetes label. SemVer build metadata can contain `+`, which Kubernetes label values do not allow. Changed the example to use the conventional `helm.sh/chart` label and replace `+` with `_`.
- The dictionary merge comment said later values override for `merge`. Helm documents `merge` as giving precedence to the destination dictionary, while `mergeOverwrite` overwrites from right to left. Updated the comment to say the first dictionary takes precedence.
- The math function output comments for `ceil` and `floor` showed integer-looking results. Helm's float math functions return float values, so the comments now show `2.0` and `1.0`.
- The helper template example included `include "my-chart.chart" .` without defining `my-chart.chart`. Added the missing helper definition, including the conventional `+` to `_` replacement for chart versions stored in labels.

## Review Notes
- The `lookup` example is technically correct, but it depends on access to a running Kubernetes cluster. Helm does not contact the API server during ordinary `helm template` or client-side dry-run operations; testing `lookup` against a cluster requires server-side dry-run support.
- Dictionary key/value iteration order is not guaranteed unless keys are explicitly sorted, as the post demonstrates in the sorted iteration example.
