# Validation Summary: How to View Kubernetes Cluster Details in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Kubernetes environment management UI)
- Kubernetes
- kubectl CLI
- JSONPath (as used by kubectl `-o custom-columns` and `-o jsonpath`)
- jq (for filtering JSON output)

## Sources Consulted
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes v1.28 changelog (removal of `kubectl version --short`): https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.28.md
- Upstream PR removing `--short`: https://github.com/kubernetes/kubernetes/pull/116720
- JSONPath negative-indexing limitation: https://github.com/kubernetes/kubernetes/issues/57268
- Portainer Kubernetes documentation: https://docs.portainer.io/user/kubernetes

## Issues Found
1. **`kubectl version --short` is no longer valid.** The `--short` flag was removed in Kubernetes v1.28 (August 2023); the default `kubectl version` output was changed to match the old `--short` output. Fixed by replacing `kubectl version --short` with `kubectl version`.

2. **Negative JSONPath indexing is not supported by kubectl.** The example `STATUS:.status.conditions[-1].type` uses `[-1]`, which Kubernetes' JSONPath implementation (`k8s.io/client-go/util/jsonpath`) does not support — it would return empty or error. Additionally, `.type` only returns the condition name ("Ready"), not its True/False status. Fixed by replacing with a filter expression that selects the Ready condition and returns its `status` field: `STATUS:.status.conditions[?(@.type=="Ready")].status`. Also wrapped the custom-columns argument in single quotes, which is required so the shell does not interpret the `?()` filter or `==` characters.

## Review Notes
- `kubectl get pods --all-namespaces` is correct; the modern shorthand `-A` is equivalent and could be mentioned but is not required.
- `kubectl top nodes` requires metrics-server to be installed in the cluster; the post does not mention this prerequisite but the command itself is correct.
- The Portainer UI details (Cluster Overview page, node table, "Show system resources" toggle) match the current Portainer Kubernetes UI behavior.
- The `jq` pipeline example is syntactically correct and produces valid JSON output.
