# Validation Summary: How to Use KEDA to Scale from Zero for Event-Driven Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- KEDA ScaledObject
- KEDA scalers for AWS SQS, Azure Service Bus, Azure Storage Queue, Apache Kafka, and cron
- KEDA HTTP Add-on
- Kubernetes Horizontal Pod Autoscaler behavior
- Helm and kubectl commands
- YAML configuration

## Sources Consulted
- KEDA ScaledObject specification: https://keda.sh/docs/2.20/reference/scaledobject-spec/
- KEDA scaling deployments and activation thresholds: https://keda.sh/docs/2.20/concepts/scaling-deployments/
- KEDA AWS SQS Queue scaler: https://keda.sh/docs/2.20/scalers/aws-sqs/
- KEDA Azure Service Bus scaler: https://keda.sh/docs/2.20/scalers/azure-service-bus/
- KEDA Azure Storage Queue scaler: https://keda.sh/docs/2.20/scalers/azure-storage-queue/
- KEDA Apache Kafka scaler: https://keda.sh/docs/2.20/scalers/apache-kafka/
- KEDA Cron scaler: https://keda.sh/docs/2.19/scalers/cron/
- KEDA HTTP Add-on installation: https://keda.sh/http-add-on/0.14/getting-started/
- KEDA HTTP Add-on InterceptorRoute reference: https://keda.sh/http-add-on/0.14/reference/interceptorroute/
- KEDA HTTP Add-on autoscale an app guide: https://keda.sh/http-add-on/0.14/user-guide/autoscale-an-app/

## Issues Found
- Corrected scale-from-zero wording from "immediately" to behavior based on scaler activity and KEDA polling. KEDA polls triggers while replicas are zero, so activation is not necessarily instantaneous.
- Corrected activation thresholds. KEDA activation happens when the metric is greater than the activation value, not greater than or equal to it. SQS and Azure Storage Queue examples now use `activationQueueLength: "0"` for any pending message, and Azure Service Bus uses `activationMessageCount: "4"` for 5+ messages.
- Updated the Kafka explanation so it activates when lag exceeds `activationLagThreshold`, instead of implying any lag activates the workload.
- Updated the HTTP Add-on Helm chart name from `kedacore/keda-add-on-http` to `kedacore/keda-add-ons-http` and replaced the old interceptor replica value with current `interceptor.replicas.min` / `interceptor.replicas.max` values.
- Replaced the deprecated/incorrect HTTPScaledObject example with the current `InterceptorRoute` plus KEDA `ScaledObject` configuration using the `external-push` trigger.
- Corrected the multiple-trigger explanation. Kubernetes HPA evaluates multiple metrics by selecting the metric that requires the highest replica count, rather than summing all workloads by default.
- Changed the monitoring comment for the `jq` command because it checks the ScaledObject readiness condition, not the amount of time spent at zero replicas.
- Moved the bash shebang to the first line of the script block.
- Replaced invalid `initialReplicaCount` usage with the documented `idleReplicaCount: 0` plus higher `minReplicaCount` pattern for scaling to zero when idle and activating to multiple replicas.

## Review Notes
The KEDA HTTP Add-on documentation marks HTTPScaledObject as deprecated in favor of InterceptorRoute, so the post now uses the current API. YAML snippets were parsed successfully with PyYAML after edits. `kubectl` was not installed locally, so kubectl command validation was based on standard command forms and official Kubernetes/KEDA behavior rather than local `kubectl --help` output.
