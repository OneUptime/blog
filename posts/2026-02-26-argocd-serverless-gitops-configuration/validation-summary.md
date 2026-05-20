# Validation Summary: How to Manage Serverless Configurations with GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Knative Serving
- KEDA
- Kustomize
- External Secrets Operator
- RabbitMQ
- Prometheus

## Sources Consulted
- Argo CD directory applications: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD sync options and server-side apply: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Knative Serving Defaults ConfigMap: https://knative.dev/docs/serving/configuration/config-defaults/
- Knative Serving feature flags: https://knative.dev/docs/serving/configuration/feature-flags/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA RabbitMQ queue scaler: https://keda.sh/docs/2.19/scalers/rabbitmq-queue/
- KEDA cron scaler: https://keda.sh/docs/2.19/scalers/cron/
- KEDA Prometheus scaler: https://keda.sh/docs/2.19/scalers/prometheus/
- External Secrets Operator API overview: https://external-secrets.io/v1.0.0/introduction/overview/

## Issues Found
- The Knative multi-container flag was shown as `enable-multi-container` in `config-defaults`. Knative documents this as the `multi-container` key in the `config-features` ConfigMap, so the example was moved there.
- The KEDA RabbitMQ example used the deprecated `queueLength` metadata key and embedded `guest:guest` credentials in the ScaledObject. Updated it to `mode: QueueLength` with `value: "10"` and `hostFromEnv` to avoid storing credentials in Git.
- The Kustomize overlay referenced `../../base/function-a` as a base directory, but the tree and examples did not include a base `kustomization.yaml`. Added the base kustomization and listed it in the directory structure so the overlay can build.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Current ESO documentation uses `external-secrets.io/v1`, so the API version was updated.

## Review Notes
- The Argo CD `directory.recurse`, `ServerSideApply=true`, automated self-heal, and prune examples match current Argo CD documentation.
- KEDA `ScaledObject` fields, cron trigger fields, and Prometheus scaler metadata are consistent with current KEDA documentation.
- The PreSync hook pattern is valid, but a real cluster would need RBAC that allows the hook Job's service account to read ConfigMaps in `knative-serving`.
