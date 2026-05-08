# Validation Summary: Monitoring the Cilium Echo App for Test Reliability

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Hubble CLI
- Kubernetes
- kubectl
- Kubernetes CronJob
- curl
- jq
- Mermaid

## Sources Consulted
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes API reference for batch/v1 CronJob and Job restartPolicy: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.33/
- Kubernetes Endpoints deprecation and EndpointSlice migration notes: https://v1-33.docs.kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Cilium Hubble CLI guide: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Hubble exporter filter examples for verdict and namespace filters: https://docs.cilium.io/en/latest/observability/hubble/configuration/export.html
- Cilium troubleshooting documentation for connectivity tests and Hubble Relay access: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html

## Issues Found
- The post said monitoring catches false positives, but an unhealthy echo app generally causes false-negative connectivity test failures. Updated the description to say "false negatives."
- The health script used `kubectl get endpoints`, but Kubernetes v1.33 deprecated direct use of the legacy Endpoints API. Replaced it with `kubectl get endpointslice -l kubernetes.io/service-name=echo-server`, which follows the current EndpointSlice API guidance.
- The curl command used `-w "%{http_code}"` without discarding the response body, so the variable could contain the body concatenated with the status code. Added `-o /dev/null` so the printed value is the HTTP status code only.
- The Hubble examples used `-n`; changed them to the explicit `--namespace` flag to match Cilium/Hubble documentation examples and avoid ambiguity.

## Review Notes
- The CronJob uses `batch/v1`, valid Cron syntax, and a Job pod `restartPolicy` of `OnFailure`, which is allowed by the Kubernetes Job API.
- The examples assume the test namespace is `cilium-test` and the echo resources are named `echo-server` and `echo-client`. Cilium CLI connectivity tests may use generated or suffixed namespaces such as `cilium-test-1` and different workload names, so readers should adapt names to their deployed echo app.
