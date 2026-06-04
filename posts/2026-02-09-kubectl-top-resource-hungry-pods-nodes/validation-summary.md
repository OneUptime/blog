# Validation Summary: How to Use kubectl top to Identify Resource-Hungry Pods and Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Metrics Server
- Metrics API
- Prometheus / PromQL
- Unix shell and awk

## Sources Consulted
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl top node reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes resource metrics pipeline documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Metrics Server official repository and installation documentation: https://github.com/kubernetes-sigs/metrics-server
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- kubectl top pod source implementation: https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/top/top_pod.go

## Issues Found
- `kubectl top pod my-app -n production --watch` was invalid because `kubectl top pod` does not expose a `--watch` flag. Changed it to use the external `watch` command with a 5-second interval.
- The `awk` CPU filters compared raw strings/numbers and would misclassify whole-core values such as `1` or `2` as less than millicore thresholds. Updated the examples to normalize CPU values to millicores before comparing.
- The `awk` memory filter only handled `Gi` values and missed equivalent values reported in `Mi` or `Ki`. Updated it to normalize common Kubernetes memory units to Mi before comparing.
- The introduction described `kubectl top` output as real-time. Kubernetes documentation describes Metrics API values as recent resource metrics with pipeline delay and a measurement window, so this was changed to "recent".
- The prerequisite stated only Metrics Server was required. Kubernetes documentation allows Metrics Server or another Metrics API provider, so this was clarified.
- The draining guidance said low usage makes draining safe. Draining safety also depends on rescheduling capacity and PodDisruptionBudgets, so the statement was made less absolute.
- The memory leak section said growing memory indicates a leak. Growth can have other causes, so the wording was changed to "may indicate a leak."
- The limitations section said `kubectl top` shows the last minute. The exact window is exposed by the Metrics API and is not necessarily fixed at one minute, so this was changed to "recent usage from the Metrics API."

## Review Notes
The remaining commands and flags, including `--sort-by=cpu`, `--sort-by=memory`, `--containers`, `--all-namespaces`, `--no-headers`, label selectors, and pod field selectors, match current Kubernetes documentation and kubectl behavior. `kubectl` was not installed in the local workspace, so verification used official Kubernetes documentation and upstream source instead of local `kubectl --help` output.
