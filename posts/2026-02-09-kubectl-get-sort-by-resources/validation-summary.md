# Validation Summary: Use kubectl get --sort-by to Sort Resources by Age, Restarts, or Custom Fields

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes JSONPath
- Kubernetes API resources: Pods, Nodes, Deployments, Services, PersistentVolumeClaims, Events, Ingresses, and custom resources
- Shell tools: `tac`, `tail`, `sort`, `awk`, and `jq`

## Sources Consulted
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes API deprecation guide for Events: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes Events API overview: https://kubernetes.io/docs/reference/kubernetes-api/events/
- Kubernetes core/v1 Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- OneUptime referenced blog URL verified with HTTP 200: https://oneuptime.com/blog/post/2026-02-09-kubectl-custom-columns-output-format/view

## Issues Found
- The post described `--sort-by` as sorting by any field. Kubernetes documents `--sort-by` as using a JSONPath expression whose target field must be an integer or a string. Updated the wording to reflect that limitation.
- The description and introduction referred to sorting by resource usage/highest consumers, but the examples sort capacity, requested storage, and replica counts rather than live usage. Updated the wording to resource capacity and replica count.
- Restart-count examples used `.status.containerStatuses[0].restartCount`, which only checks the first listed container in a pod. Updated headings, comments, and explanations to make the first-container limitation explicit and noted that multi-container pod totals require aggregation.
- Node CPU/memory capacity and PVC storage examples sort Kubernetes Quantity values as strings. Updated the text to clarify that `--sort-by` performs lexicographic ordering for those string fields and is not a reliable numeric unit conversion for mixed values.
- Reverse-sort examples piped table output directly to `tac`/`tail -r`, moving the header row to the bottom. Added `--no-headers` and corrected comments that described the reversed order incorrectly.
- Event examples used `.lastTimestamp` without caveat. Added a note that this is for legacy core/v1 events and that `events.k8s.io/v1` uses fields such as `.eventTime` and `.series.lastObservedTime`.
- The namespace/name multi-field sort example did not actually sort by namespace as the primary key. Replaced it with `sort -k1,1 -k2,2`.
- The status/restart multi-field sort was lexicographic for restart counts and included headers. Updated it to use `--no-headers` and numeric sorting on the restart column.
- The complex multi-field example was labeled as `awk` but used `jq`. Corrected the comment.
- The missing-field troubleshooting command filtered a possible error string instead of handling pods without `containerStatuses`. Replaced it with a `jq` pipeline that selects pods where `containerStatuses` exists before sorting.

## Review Notes
`kubectl` was not installed in the local workspace, so command behavior was validated against official Kubernetes generated documentation rather than local `kubectl --help` output.
