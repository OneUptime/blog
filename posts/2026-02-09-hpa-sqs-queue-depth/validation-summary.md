# Validation Summary: How to configure HPA with SQS queue depth for AWS workloads

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- KEDA ScaledObject and AWS SQS scaler
- Amazon SQS and CloudWatch SQS metrics
- Amazon EKS IRSA / AWS pod identity
- Prometheus CloudWatch Exporter
- Prometheus Operator ServiceMonitor
- Prometheus Adapter external metrics
- Helm, kubectl, and AWS CLI

## Sources Consulted
- KEDA AWS SQS Queue scaler documentation: https://keda.sh/docs/2.20/scalers/aws-sqs/
- KEDA ScaledObject specification: https://keda.sh/docs/2.20/reference/scaledobject-spec/
- KEDA AWS IRSA authentication provider documentation: https://keda.sh/docs/2.20/authentication-providers/aws/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- AWS SQS CloudWatch metrics documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- Prometheus CloudWatch Exporter documentation: https://github.com/prometheus/cloudwatch_exporter
- Prometheus Adapter external metrics documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/externalmetrics.md
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Operator ServiceMonitor design documentation: https://prometheus-operator.dev/docs/getting-started/design/

## Issues Found
- The architecture and KEDA sections incorrectly implied that KEDA's SQS scaler uses CloudWatch metrics. Updated the wording to distinguish KEDA's SQS queue attribute polling from the CloudWatch Exporter approach.
- The KEDA IAM policy included `cloudwatch:GetMetricData` and used a wildcard resource. Replaced it with SQS queue attribute permissions scoped to the example queue ARN.
- The KEDA ScaledObject used `identityOwner: operator` while the example annotated the workload ServiceAccount for IRSA. Replaced this with a `TriggerAuthentication` using AWS pod identity and `identityOwner: workload`, then referenced it from the ScaledObject.
- The KEDA polling explanation said KEDA polls CloudWatch every 30 seconds. Corrected it to describe KEDA's trigger polling and HPA metrics polling behavior.
- The CloudWatch Exporter example omitted the Service required by the ServiceMonitor selector. Added a Service exposing the named `metrics` port.
- The Prometheus Adapter configuration used `rules`, which is for custom metrics, not external HPA metrics in the adapter config. Changed it to `externalRules`.
- The Prometheus Adapter rule attempted to bind the metric to a Kubernetes namespace label that the CloudWatch SQS metric does not have. Changed the rule to `namespaced: false` and templated the query with `<<.Series>>` and `<<.LabelMatchers>>` so the HPA queue selector is applied.
- The visibility timeout guidance said all queue depth metrics exclude in-flight messages. Updated it to clarify that `ApproximateNumberOfMessagesVisible` excludes in-flight messages, while KEDA's SQS scaler includes in-flight messages by default.

## Review Notes
The Prometheus-based example still uses only `ApproximateNumberOfMessagesVisible`; for workloads with long processing times, a future improvement would be to add `ApproximateNumberOfMessagesNotVisible` to the exported metric and adapter query so in-flight work contributes to scale-down decisions.
