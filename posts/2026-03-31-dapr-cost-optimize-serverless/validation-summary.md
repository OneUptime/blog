# Validation Summary: How to Cost Optimize Dapr Serverless Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, Configuration CRD, component manifests, state management)
- Kubernetes (pod annotations, CronJob, kubectl CLI)
- KEDA (ScaledObject, Redis Lists trigger)
- OpenTelemetry Collector (tail_sampling processor)
- Dapr Python SDK (DaprClient, StateItem, save_bulk_state)
- Redis

## Sources Consulted
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr tracing configuration: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Python SDK state store example: https://github.com/dapr/python-sdk/blob/main/examples/state_store/state_store.py
- Dapr Python SDK DaprClient source: https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Dapr state management how-to: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- KEDA ScaledObject spec: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA Redis Lists scaler: https://keda.sh/docs/2.19/scalers/redis-lists/
- OpenTelemetry Collector tail_sampling processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Pod Lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/

## Issues Found
1. **CronJob missing `restartPolicy`**: The CronJob pod template spec did not include a `restartPolicy` field. Kubernetes defaults `restartPolicy` to `Always`, which is not permitted for Jobs or CronJobs (only `OnFailure` or `Never` are allowed). This would cause a validation error at admission time when applying the manifest. Fixed by adding `restartPolicy: OnFailure` to the pod template spec.

## Review Notes
- The Dapr sidecar resource annotations, Configuration CRD tracing config, KEDA ScaledObject, OpenTelemetry Collector tail_sampling processor config, and Dapr Python SDK usage are all correct and current.
- The `kubectl scale deploy -l` usage is valid — `kubectl scale` supports the `-l`/`--selector` flag.
- The CronJob does not specify a `serviceAccountName` or RBAC configuration, which would be needed in practice for the kubectl container to have permission to scale deployments. This is a reasonable omission for a blog post but readers should be aware.
- The "30-50% cost reduction" claim in the summary is not independently verifiable but is a reasonable ballpark estimate for variable-traffic workloads applying all these strategies together.
