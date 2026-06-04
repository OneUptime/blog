# Validation Summary: How to Use Pod Failure Policy to Distinguish Retriable vs Non-Retriable Errors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Jobs
- Kubernetes Pod Failure Policy
- kubectl
- YAML
- Python
- Go
- jq

## Sources Consulted
- Kubernetes task documentation: Handling retriable and non-retriable pod failures with Pod failure policy: https://kubernetes.io/docs/tasks/job/pod-failure-policy/
- Kubernetes Jobs concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes batch/v1 Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes removed feature gates reference for JobPodFailurePolicy lifecycle: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Go net/http package documentation: https://pkg.go.dev/net/http
- Python language documentation: https://docs.python.org/3/

## Issues Found
- The post said Pod Failure Policies require Kubernetes 1.25 or later with the JobPodFailurePolicy feature gate enabled. Updated this to reflect the official lifecycle: alpha in v1.25 with the feature gate required, beta and enabled by default in v1.26-v1.30, and stable/enabled by default in v1.31+.
- All `podFailurePolicy` YAML examples used `restartPolicy: OnFailure`. Kubernetes requires Jobs that use `.spec.podFailurePolicy` to set the pod template restart policy to `Never`, so all examples were corrected.
- The post described `FailIndex` without mentioning the required `backoffLimitPerIndex`. Updated the explanation and the indexed Job example to include `backoffLimitPerIndex`.
- The Python example referenced `RateLimitExceeded` and `call_external_api` without defining them. Added minimal definitions so the example is syntactically valid and can run as a complete illustrative script.
- The Go example created an `http.Client` with a timeout but used `http.DefaultClient.Do(req)`, bypassing the configured timeout. Changed it to `client.Do(req)`.
- The Go example and corresponding policy listed exit code `11` for service-down errors, but the code never exited with `ExitServiceDown`. Added a `ServiceDownError` path for 5xx responses and mapped it to exit code `11`.
- The external-service policy did not fail fast for the code's configuration error exit code `2`. Added exit code `2` to the `FailJob` rule and updated the comment.
- The pod condition example used `OutOfMemory`, which is not a standard Pod condition type for `podFailurePolicy` matching. Removed that rule and kept the valid `DisruptionTarget` condition example.

## Review Notes
- YAML snippets were parsed successfully with PyYAML.
- The Python snippet was checked with `python3 -m py_compile`, and the shell snippet was checked with `sh -n`.
- Go tooling was not installed in this workspace, so the Go snippet could not be compiled locally; it was reviewed by source inspection against the Go `net/http` package documentation.
