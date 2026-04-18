# Validation Summary: How to Troubleshoot Kubernetes Resource Quota Exceeded Errors in Portainer

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Kubernetes (ResourceQuota, LimitRange)
- kubectl
- Portainer
- YAML manifests

## Sources Consulted
- Kubernetes ResourceQuota docs: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange docs: https://kubernetes.io/docs/concepts/policy/limit-range/
- kubectl describe reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#describe
- kubectl field-selector docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- kubectl custom-columns output format: https://kubernetes.io/docs/reference/kubectl/#custom-columns
- Portainer Kubernetes docs: https://docs.portainer.io/user/kubernetes

## Issues Found
1. **Step 2 output formatting** — The `kubectl describe resourcequota` example output lines (`cpu`, `memory`, `pods`, `persistentvolumeclaims`) were prefixed with `##` inside a single `bash` fenced block, making them appear as shell comments rather than command output. Real `kubectl describe resourcequota` output does not contain `##` prefixes. Split the command and output into separate fenced blocks (`bash` for the command, `text` for the output) and removed the `##` prefixes. Also added the `Namespace:` line that `kubectl describe resourcequota` actually emits and aligned columns to match real output.
2. **Step 4 Option B — inaccurate claim** — The original sentence "Resource requests must equal actual usage only if LimitRange enforces defaults." is incorrect: resource requests never need to equal actual usage, and that is not what LimitRange does. LimitRange supplies default requests/limits and can enforce min/max bounds. Replaced with a correct statement: when a namespace has a ResourceQuota for `requests.cpu` or `requests.memory`, every pod must specify requests for that resource, and a LimitRange can supply those defaults automatically (per the upstream Kubernetes ResourceQuota docs).

## Review Notes
- All kubectl commands verified: `kubectl describe resourcequota -n production`, the `--field-selector=status.phase=Succeeded|Failed` deletions, and the `custom-columns` jsonpath expressions are all valid and current.
- ResourceQuota manifest (apiVersion `v1`, `spec.hard` with `cpu`, `memory`, `pods`) is correct.
- LimitRange manifest (apiVersion `v1`, `spec.limits[].type: Container` with `default`, `defaultRequest`, `max`) is correct and matches the upstream reference example.
- Minor future-improvement note: the `persistentvolumeclaims` row in describe output is typically rendered with multi-space alignment; the fix above uses a realistic layout. Users on older kubectl builds may see slightly different column widths, which is cosmetic only.
