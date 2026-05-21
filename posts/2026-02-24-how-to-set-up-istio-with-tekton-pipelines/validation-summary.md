# Validation Summary: How to Set Up Istio with Tekton Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Tekton Pipelines
- Istio
- Kubernetes
- Prometheus
- RBAC
- YAML
- Shell scripting

## Sources Consulted
- Tekton Pipelines installation documentation: https://tekton.dev/vault/Pipelines-main/install/
- Tekton Pipeline documentation for `finally` tasks and `$(tasks.status)`: https://tekton.dev/docs/pipelines/pipelines/
- Tekton Pipeline API reference for `tekton.dev/v1` PipelineRun and `taskRunTemplate.serviceAccountName`: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton Pod template and labels/annotations documentation: https://tekton.dev/docs/pipelines/podtemplates/ and https://tekton.dev/docs/pipelines/labels/
- Istio VirtualService reference for weighted routes: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio ambient mode overview and dataplane mode documentation: https://istio.io/latest/docs/ambient/overview/ and https://istio.io/latest/docs/overview/dataplane-modes/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The Prometheus query filtered by `namespace`, which is not the standard Istio service metric label for destination namespace. Changed it to `destination_service_namespace`, matching Istio's standard metric labels.
- The metrics-check task used `curlimages/curl:latest` but also invoked `bc`, which is not guaranteed to be present in that image. Changed the step image to Alpine and installed `curl`, `jq`, and `bc` in the step.
- The Prometheus API call passed a raw PromQL query in the URL and parsed JSON with `grep`. Changed it to use `curl -G --data-urlencode` and `jq` so PromQL characters are encoded correctly and the JSON response is parsed reliably.
- The `tekton.dev/v1` PipelineRun used `spec.serviceAccountName`, which is the v1beta1 placement. Updated it to `spec.taskRunTemplate.serviceAccountName`.
- The Istio sidecar exclusion snippet used a `spec.template.metadata.annotations` shape without showing the enclosing workload resource and did not match Tekton's metadata propagation pattern. Updated the snippet to a metadata label that Tekton can propagate to TaskRuns and Pods.
- The ambient mode note implied all Tekton/Istio interactions work without caveats. Updated it to note that L7 routing and telemetry in ambient mode require waypoint proxy configuration.

## Review Notes
The examples still assume that the user already has a stable and canary workload model, an Istio VirtualService with two HTTP route destinations in the expected order, and Prometheus installed at `prometheus.monitoring.svc.cluster.local:9090`. Those assumptions are reasonable for a focused tutorial but should be made more explicit in a future expansion.
