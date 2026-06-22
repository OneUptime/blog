# Validation Summary: Event-Driven Autoscaling with Helm and KEDA

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- KEDA
- Helm
- Kubernetes
- ScaledObject and ScaledJob custom resources
- TriggerAuthentication
- Kafka, RabbitMQ, Redis, AWS SQS, Prometheus, Cron, and HTTP add-on scalers
- Prometheus Operator ServiceMonitor and PrometheusRule resources

## Sources Consulted
- KEDA deployment documentation: https://keda.sh/docs/2.20/deploy/
- KEDA Helm chart values: https://github.com/kedacore/charts/blob/main/keda/values.yaml
- KEDA scaler documentation: https://keda.sh/docs/2.20/scalers/
- KEDA Apache Kafka scaler documentation: https://keda.sh/docs/2.20/scalers/apache-kafka/
- KEDA RabbitMQ scaler documentation: https://keda.sh/docs/2.20/scalers/rabbitmq-queue/
- KEDA Redis Lists scaler documentation: https://keda.sh/docs/2.20/scalers/redis-lists/
- KEDA AWS SQS scaler documentation: https://keda.sh/docs/2.20/scalers/aws-sqs/
- KEDA AWS authentication provider documentation: https://keda.sh/docs/2.20/authentication-providers/aws/
- KEDA Prometheus integration metrics documentation: https://keda.sh/docs/2.20/integrations/prometheus/
- KEDA HTTP Add-on InterceptorRoute reference: https://keda.sh/http-add-on/0.15/reference/interceptorroute/
- KEDA HTTP Add-on HTTPScaledObject reference: https://keda.sh/http-add-on/0.15/reference/httpscaledobject/
- KEDA ScaledJob documentation: https://keda.sh/docs/2.20/concepts/scaling-jobs/
- kube-state-metrics HorizontalPodAutoscaler metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md

## Issues Found
- The KEDA Helm values placed `resources` under `operator`, `metricsServer`, and `webhooks`, but the current chart expects a top-level `resources` block with `operator`, `metricServer`, and `webhooks` keys. Moved the resource settings to the supported structure.
- The PodDisruptionBudget example used `podDisruptionBudget.metricsServer`; the chart key is `podDisruptionBudget.metricServer`. Updated the key.
- The service account configuration used a single flat `serviceAccount` object; the current chart uses component-scoped service accounts under `serviceAccount.operator`, `serviceAccount.metricServer`, and `serviceAccount.webhooks`. Updated the example.
- The metrics server logging example used the deprecated `logging.metricServer.level` pattern indirectly via `logging.metricsServer`. Updated it to `logging.metricServer.zapLevel` and `zapEncoder`.
- The AWS SQS TriggerAuthentication used `podIdentity.provider: aws-eks`, which KEDA marks deprecated for removal in KEDA v3. Updated it to the current `provider: aws`.
- The HTTP add-on example used the deprecated `HTTPScaledObject` API and deprecated `targetPendingRequests` field. Replaced it with the current `InterceptorRoute` API plus a `ScaledObject` using the HTTP add-on `external-push` scaler.
- The Prometheus scaler error alert used `keda_scaler_errors_total`, which is not a current KEDA metric. Updated it to `keda_scaler_detail_errors_total`.
- The max-replicas alert referenced a non-existent `kube_deployment_spec_replicas_max` metric. Updated the expression to compare `kube_horizontalpodautoscaler_status_desired_replicas` against `kube_horizontalpodautoscaler_spec_max_replicas`.

## Review Notes
The remaining examples are broadly valid for KEDA 2.20-era resources, but real deployments still need matching namespaces, Secrets, service accounts, queue permissions, and installed CRDs such as Prometheus Operator resources or the KEDA HTTP add-on before applying all snippets.
