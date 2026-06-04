# Validation Summary: How to Use kubectl get --field-selector to Filter Resources by Status and Phase

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes field selectors
- Shell scripting with jq and grep

## Sources Consulted
- Kubernetes documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: kubectl get reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The namespace filtering example used `kubectl get all --field-selector metadata.namespace=production`, which can still be scoped to the current namespace. Changed it to include `--all-namespaces` so the metadata namespace field selector works as described.
- The node section described `spec.unschedulable=true` as finding nodes that are not ready. Kubernetes field selectors support `spec.unschedulable` for Nodes, not node readiness conditions. Updated the heading and wording to describe cordoned or unschedulable nodes accurately.
- The cleanup example said it found completed jobs, but the command filters Pods with `status.phase=Succeeded`. Updated the wording to say completed pods from jobs.

## Review Notes
- `kubectl` was not installed in the local environment, so CLI verification used official Kubernetes command reference documentation rather than local `kubectl --help` output.
- Service field selector support for `spec.type` is documented in the current Kubernetes documentation. Older Kubernetes versions may not support the same service field selectors.
