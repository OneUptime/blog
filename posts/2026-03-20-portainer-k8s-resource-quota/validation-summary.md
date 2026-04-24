# Validation Summary: How to Troubleshoot Kubernetes Resource Quota Exceeded in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- ResourceQuota
- LimitRange
- `kubectl`
- Python 3

## Sources Consulted
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Init Containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl top`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes `kubectl top pod`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes `kubectl set resources`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Portainer namespace management: https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/manage
- Portainer application form deployment: https://docs.portainer.io/2.27/user/kubernetes/applications/add
- Portainer application editing: https://docs.portainer.io/user/kubernetes/applications/edit

## Issues Found
- The introduction said quota overruns make Pods "fail to schedule". I changed this to reflect the documented behavior: ResourceQuota enforcement happens at admission time and can reject Pod creation with `403 Forbidden`, while a Deployment may then fail to create all of its Pods.
- The `kubectl top` comments and commands implied they showed requested resources and used `kubectl top pods`. I corrected them to describe current usage and switched to the documented `kubectl top pod` form in the examples and diagnosis script.
- The Step 2 Python snippet was technically incorrect. It appended duplicate pod rows inside the container loop, did not handle decimal CPU quantities, and did not align with quota accounting for non-terminal Pods. I fixed the script to aggregate correctly, handle common CPU quantity formats, skip terminal Pods, and account for init-container or pod-level CPU requests when present.
- The Step 3 explanation claimed that if a quota includes `requests.cpu`, all Pods must have CPU requests set. I corrected this to match Kubernetes documentation: when CPU or memory quotas are enforced, new Pods must specify the relevant requests or limits directly or inherit defaults from a LimitRange.
- The scoped quota example described a Burstable quota, but the YAML actually used a `PriorityClass` selector. I corrected the comment and renamed the example quota so the description matches the configuration.

## Review Notes
- `kubectl top` requires Metrics Server (or another compatible metrics pipeline) to be available in the cluster.
- `kubectl` was not installed in the review environment, so CLI validation was done against the official Kubernetes command reference rather than local `--help` output.
