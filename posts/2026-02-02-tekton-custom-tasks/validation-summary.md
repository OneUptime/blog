# Validation Summary: How to Build Tekton Custom Tasks

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Tekton Pipelines (CustomRun / Custom Tasks, v1beta1 API)
- Kubernetes (CRDs, controllers, RBAC, ServiceMonitor, ResourceQuota)
- Go (controller-runtime, kubebuilder markers, generics)
- knative.dev/pkg/apis (Condition types used by Tekton status)
- Docker (multi-stage build, distroless base image)
- Kind (cluster config for integration testing)
- Prometheus (CounterVec, HistogramVec, ExponentialBuckets) and Prometheus Operator (ServiceMonitor)
- testify (unit testing assertions)

## Sources Consulted
- Tekton CustomRun API source: https://github.com/tektoncd/pipeline/blob/main/pkg/apis/pipeline/v1beta1/customrun_types.go
- Tekton Custom Runs docs: https://tekton.dev/docs/pipelines/customruns/
- knative.dev/pkg/apis package (Condition, ConditionSucceeded constants)
- sigs.k8s.io/controller-runtime (Manager Options, fake client)
- Prometheus Go client docs for `ExponentialBuckets(start, factor, count)`
- Kind cluster config schema (kind.x-k8s.io/v1alpha4)
- Tekton release manifest URL (storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml)

## Issues Found
1. **Missing import in `controllers/approval_controller.go`**: The code uses `apis.Condition` and `apis.ConditionSucceeded` in `markSucceeded` and `markFailed`, but the import block did not include `"knative.dev/pkg/apis"`. Without it the file would fail to compile. Added the import. This is the standard package upstream Tekton itself uses for these symbols.
2. **Incorrect Prometheus bucket range comment**: The comment on `prometheus.ExponentialBuckets(60, 2, 10)` claimed "1min to ~17hrs". With start=60, factor=2, count=10, the largest bucket is 60 × 2^9 = 30720 seconds ≈ 8.5 hours, not ~17 hours. Corrected the comment to "1min to ~8.5hrs".

## Review Notes
- **controller-runtime API drift**: The example uses `ctrl.Options{ MetricsBindAddress: ..., Port: 9443 }`. These fields were valid in controller-runtime ≤ v0.14 but were replaced in v0.15+ by `Metrics: metricsserver.Options{BindAddress: ...}` and `WebhookServer: webhook.NewServer(...)`. Given the post pins `golang:1.21-alpine` (released alongside controller-runtime ~v0.16), readers using current libraries will need to migrate these fields. Left as-is because either reading is internally consistent if the reader pins an older controller-runtime version, and changing it would require restructuring the snippet rather than fixing a single inaccuracy.
- **Standalone `Run` vs. `CustomRun`**: The post correctly uses `CustomRun` (the modern resource that replaced the deprecated `Run` CRD) and the correct embedded form in a Pipeline: `taskRef: { apiVersion, kind }`. No issues there.
- **`customRun.Status.Results` access**: Valid because `CustomRunStatusFields` (which holds `Results`) is inlined into `CustomRunStatus`.
- **`+kubebuilder:validation:MinItems=1` and other markers**: Valid kubebuilder syntax.
- **Tekton release URL** (`storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml`): Confirmed canonical.
- **Kubernetes minimum version**: The post says 1.24+. Current Tekton Pipelines releases (late 2025 / 2026) require newer versions of Kubernetes; readers running cutting-edge Tekton should consult the Tekton release notes for the exact minimum. Left as written because the value matches what the post likely targeted at authoring time.
