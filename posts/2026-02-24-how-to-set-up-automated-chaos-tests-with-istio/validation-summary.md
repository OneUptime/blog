# Validation Summary: How to Set Up Automated Chaos Tests with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService fault injection
- Kubernetes namespaces, Jobs, CronJobs, ServiceAccounts, RBAC, and kubectl
- Bash scripting
- GitHub Actions
- Prometheus Operator PrometheusRule alerts

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio Bookinfo application docs: https://istio.io/latest/docs/examples/bookinfo/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- GitHub Actions workflow_run documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Bookinfo sample URLs were pinned to Istio `release-1.22`, which is no longer supported as of the review date. Updated them to `release-1.30`, the current Istio release shown in official supported release documentation on 2026-05-21.
- The bash script used `kubectl exec deploy/ratings-v1` without selecting the `ratings` application container. Updated the examples to use `-c ratings`, matching the official Bookinfo guidance and avoiding accidental execution in the sidecar container.
- The bash script and Kubernetes Job could leave `ratings-fault` in place if a validation step failed before the explicit delete command. Added `trap`-based cleanup with `--ignore-not-found`.
- Without an explicit reviews route, Bookinfo can send a given request to `reviews:v1`, which does not call `ratings`, so a ratings fault may not be exercised by the probe. Added a setup VirtualService that routes `reviews` traffic to `reviews:v2`, the version that calls `ratings`.
- The Kubernetes Job used `curl` directly inside the `bitnami/kubectl` runner image. Changed the probes to run `curl` from the Bookinfo `ratings` container via `kubectl exec`, which aligns with the official Bookinfo validation pattern.
- The RBAC example did not grant access to the `pods/exec` subresource required by the Job's `kubectl exec` calls. Added `create` on `pods/exec`.
- The GitHub Actions cleanup command could fail when no matching VirtualService existed. Added `--ignore-not-found`.

## Review Notes
- The Istio `networking.istio.io/v1` VirtualService examples and `fault.abort.percentage.value` / `httpStatus` fields are current.
- The PrometheusRule example assumes kube-state-metrics exposes `kube_job_status_failed` and that Prometheus Operator CRDs are installed.
