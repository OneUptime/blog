# Validation Summary: How to Configure KEDA ScaledObjects for RabbitMQ and SQS Queue-Based Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- KEDA ScaledObjects and TriggerAuthentication
- Kubernetes Deployments, Secrets, ServiceAccounts, HPA, and kubectl
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ Queue scaler
- AWS SQS Queue scaler
- AWS IAM Roles for Service Accounts (IRSA)
- AWS SDK for JavaScript v3 SQS client
- Prometheus metrics for KEDA

## Sources Consulted
- KEDA RabbitMQ Queue scaler documentation: https://keda.sh/docs/2.20/scalers/rabbitmq-queue/
- KEDA AWS SQS Queue scaler documentation: https://keda.sh/docs/2.20/scalers/aws-sqs/
- KEDA AWS IRSA authentication provider documentation: https://keda.sh/docs/2.20/authentication-providers/aws/
- KEDA AWS EKS Pod Identity Webhook deprecation documentation: https://keda.sh/docs/2.20/authentication-providers/aws-eks/
- KEDA ScaledObject specification: https://keda.sh/docs/2.15/reference/scaledobject-spec/
- KEDA Cron scaler documentation: https://keda.sh/docs/2.20/scalers/cron/
- KEDA Prometheus integration documentation: https://keda.sh/docs/latest/integrations/prometheus/
- RabbitMQ Cluster Operator documentation: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Cluster Operator CRD source: https://github.com/rabbitmq/cluster-operator/blob/main/config/crd/bases/rabbitmq.com_rabbitmqclusters.yaml
- AWS SDK for JavaScript v3 SQS ReceiveMessageCommand documentation: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/sqs-2012-11-05/ReceiveMessage

## Issues Found
- The RabbitMQ readiness command used `condition=Ready`, but the RabbitMQ Cluster Operator CRD exposes `AllReplicasReady` and `ReconcileSuccess` conditions. Changed the command to wait for `condition=AllReplicasReady`.
- The RabbitMQ KEDA authentication example used `guest:guest`, which does not match the operator-generated credentials used by the worker deployment. Changed the KEDA TriggerAuthentication to use the `rabbitmq-default-user` secret for `username` and `password`.
- The SQS TriggerAuthentication used `podIdentity.provider: aws-eks`, which KEDA documents as deprecated for removal in KEDA v3. Changed the example to `provider: aws` with `identityOwner: workload` so it matches the annotated workload service account.
- The SQS optional metadata comment referenced message age and `scaleDelayInSeconds`, which is not an AWS SQS scaler option. Replaced it with the documented `scaleOnInFlight` and `scaleOnDelayed` options.
- The multi-queue RabbitMQ examples omitted `mode: QueueLength`. Added it to make each trigger explicit and aligned with the current RabbitMQ scaler schema.
- The HPA inspection command used the ScaledObject name as the HPA name. KEDA's default HPA name is `keda-hpa-{scaled-object-name}`, so the command was corrected.
- The Prometheus dashboard labeled `keda_scaler_active` as current replica count even though it reports active/inactive scaler status. Corrected the label.
- The Prometheus error metric used the older `keda_scaler_errors_total` name. Updated it to the currently documented `keda_scaler_detail_errors_total`.

## Review Notes
The code examples are illustrative and still require real container images, AWS account IDs, IAM policies, and queue URLs. For production, the SQS worker should extend visibility timeout for tasks that may exceed the configured timeout, and RabbitMQ deployments should use TLS and least-privilege credentials.
