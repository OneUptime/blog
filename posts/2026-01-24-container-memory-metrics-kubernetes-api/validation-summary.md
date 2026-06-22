# Validation Summary: How to Get Container Memory Metrics from Kubernetes API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Metrics API
- metrics-server
- kubectl
- jq
- Python Kubernetes client
- Kubernetes resource quantities

## Sources Consulted
- Kubernetes Metrics API reference: https://kubernetes.io/docs/reference/external-api/metrics.v1beta1/
- Kubernetes resource metrics pipeline: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- kubectl top node reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- metrics-server FAQ: https://github.com/kubernetes-sigs/metrics-server/blob/master/FAQ.md
- metrics-server command-line flags: https://github.com/kubernetes-sigs/metrics-server/blob/master/docs/command-line-flags.txt
- Kubernetes Python client CustomObjectsApi documentation: https://github.com/kubernetes-client/python/blob/master/kubernetes/docs/CustomObjectsApi.md

## Issues Found
- The post said Metrics API memory is returned in bytes, but the API exposes memory as a Kubernetes `Quantity`, commonly serialized by metrics-server with `Ki` units. Updated the sample API response and conversion examples.
- The jq examples assumed only `Ki` values. Updated them to parse common Kubernetes quantity formats such as `Ki`, `Mi`, `Gi`, and plain bytes.
- The "Using kubectl with JSONPath" section used jq rather than JSONPath. Renamed the section to match the actual command examples.
- The Python parser only handled a few integer binary suffixes and plain integers. Updated it to support common binary and decimal Kubernetes quantity suffixes and fractional values.
- The usage-to-limits report had a `Usage%` column but did not calculate it. Updated the jq report to compute the percentage when a memory limit is set.
- The post stated that metrics-server working set memory is what Kubernetes uses for OOM decisions. Updated this to clarify that metrics-server reports working set memory for metrics consumers, while OOM enforcement is based on cgroup limits and kernel behavior.
- The post said metrics-server scrapes every 15 seconds by default. Updated this to 60 seconds, matching the metrics-server FAQ and command-line flag defaults.
- The node metrics example labeled a quantity string as `memory_bytes`. Renamed it to `memory_quantity`.

## Review Notes
The post is technically relevant and remains current for the Kubernetes `metrics.k8s.io/v1beta1` Metrics API. `metrics.k8s.io` is still beta, so future Kubernetes releases could change details, but the documented endpoints and `kubectl top` usage are current as of this review.
