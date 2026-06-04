# Validation Summary: How to Create Custom kubectl Output Columns with custom-columns Format

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- kubectl custom-columns output format
- Kubernetes JSONPath expressions
- Shell aliases

## Sources Consulted
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl output options and custom columns documentation: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl custom column printer implementation: https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/kubectl/pkg/cmd/get/customcolumn.go

## Issues Found
- The custom columns template file example used inline `HEADER:JSONPATH` entries split across lines. Kubernetes documents `custom-columns-file` templates as two whitespace-separated lines: one header line and one field-spec line. Updated the example and explanatory text.
- The post described `custom-columns-file` as a `--custom-columns-file` flag. Kubernetes exposes it as an `-o/--output` format. Updated the wording.
- The post said wildcard output appears space-separated. kubectl's custom column printer joins multiple matched values with commas. Updated the text to say comma-separated.
- Several examples used fixed indexes for node addresses and resource conditions. Those arrays are not a reliable way to select `InternalIP`, `Hostname`, `Ready`, `Available`, or `Progressing` entries. Updated those examples to use JSONPath filters by `type`.
- The multi-container "count" example selected `.spec.containers`, which prints the container objects rather than a count. Updated it to a combined names-and-images view.
- The node alias included an unquoted JSONPath filter that would be unsafe in shell syntax because of parentheses. Updated the alias to preserve quoting around the custom-columns expression.

## Review Notes
kubectl was not installed in the local environment, so command behavior was verified against official Kubernetes documentation and the upstream kubectl custom column printer source instead of local `kubectl --help` output.
