# Validation Summary: How to Deploy Serverless Workloads with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Kubernetes
- HelmRelease and HelmRepository custom resources
- OpenFaaS
- OpenFaaS Function CRD
- KEDA ScaledObject, TriggerAuthentication, and ScaledJob
- Prometheus Operator PodMonitor

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm releases documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- OpenFaaS faas-netes chart values: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/values.yaml
- OpenFaaS Function CRD documentation: https://docs.openfaas.com/openfaas-pro/function-crd/
- OpenFaaS scale-to-zero documentation: https://docs.openfaas.com/openfaas-pro/scale-to-zero/
- OpenFaaS autoscaling documentation: https://docs.openfaas.com/architecture/autoscaling/
- KEDA RabbitMQ scaler documentation: https://keda.sh/docs/2.19/scalers/rabbitmq-queue/
- KEDA Apache Kafka scaler documentation: https://keda.sh/docs/2.19/scalers/apache-kafka/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.19/scalers/prometheus/
- KEDA AWS SQS scaler documentation: https://keda.sh/docs/2.19/scalers/aws-sqs/
- KEDA ScaledJob specification: https://keda.sh/docs/2.14/reference/scaledjob-spec/
- KEDA Helm chart values: https://github.com/kedacore/charts/blob/main/keda/values.yaml
- KEDA HTTP Add-on documentation: https://keda.sh/http-add-on/0.14/getting-started/

## Issues Found
- The OpenFaaS HelmRelease used a `faasIdler` values block that is not present in the current OpenFaaS chart. Replaced it with the chart-supported `openfaasPro`, `autoscaler.enabled`, and `gateway.scaleFromZero` values, and kept the Function CRD operator enabled.
- The OpenFaaS function example used `com.openfaas.scale.min: "0"`, but OpenFaaS documents the minimum scale label as starting at one replica and separate from scale-to-zero behavior. Changed it to `com.openfaas.scale.min: "1"`.
- The OpenFaaS function example set scale-to-zero but did not include the documented per-function idle duration label. Added `com.openfaas.scale.zero-duration: "5m"` to match the stated five-minute inactivity behavior.
- The KEDA HTTP section used the Prometheus scaler while presenting it as an HTTP scale-to-zero trigger. Renamed the section and comment to describe it accurately as Prometheus-based HTTP metrics scaling.
- The ScaledJob comment described `successfulJobsHistoryLimit` and `failedJobsHistoryLimit` as time-based cleanup settings. Corrected the comment because these fields control how many completed and failed Jobs are retained.
- The Flux `dependsOn` example referenced `keda` and `openfaas` as if they were Flux Kustomizations, but `dependsOn` references other Flux `Kustomization` resources, not HelmReleases. Updated the example to use a separate `serverless-infrastructure` Kustomization and have `serverless-apps` depend on it.

## Review Notes
- The YAML snippets parse successfully after the corrections.
- `helm`, `kubectl`, and `flux` were not installed in the review environment, so command verification was performed against official documentation rather than local `--help` output.
