# Validation Summary: How to Configure KEDA TriggerAuthentication for Secured Metric Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- KEDA TriggerAuthentication
- KEDA ClusterTriggerAuthentication
- KEDA ScaledObject
- Kubernetes Secrets
- Kubernetes ServiceAccounts and RBAC
- AWS IAM Roles for Service Accounts (IRSA)
- Azure AD Workload Identity
- GCP Workload Identity
- RabbitMQ, AWS SQS, Azure Storage Queue, Google Cloud Pub/Sub, and Apache Kafka KEDA scalers

## Sources Consulted
- KEDA Authentication documentation: https://keda.sh/docs/2.20/concepts/authentication/
- KEDA Secret authentication provider documentation: https://keda.sh/docs/2.20/authentication-providers/secret/
- KEDA Environment Variable authentication provider documentation: https://keda.sh/docs/2.20/authentication-providers/environment-variable/
- KEDA AWS IRSA Pod Identity Webhook documentation: https://keda.sh/docs/2.20/authentication-providers/aws/
- KEDA Azure AD Workload Identity documentation: https://keda.sh/docs/2.20/authentication-providers/azure-ad-workload-identity/
- KEDA GCP Workload Identity documentation: https://keda.sh/docs/2.20/authentication-providers/gcp-workload-identity/
- KEDA RabbitMQ Queue scaler documentation: https://keda.sh/docs/2.20/scalers/rabbitmq-queue/
- KEDA AWS SQS Queue scaler documentation: https://keda.sh/docs/2.20/scalers/aws-sqs/
- KEDA Azure Storage Queue scaler documentation: https://keda.sh/docs/2.20/scalers/azure-storage-queue/
- KEDA Google Cloud Pub/Sub scaler documentation: https://keda.sh/docs/2.20/scalers/gcp-pub-sub/
- KEDA Apache Kafka scaler documentation: https://keda.sh/docs/2.20/scalers/apache-kafka/
- KEDA ScaledObject specification: https://keda.sh/docs/2.20/reference/scaledobject-spec/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The RabbitMQ example used `host: "rabbitmq.messaging.svc.cluster.local"` without the required URI format. Changed it to an AMQP URI with a trailing vhost slash.
- The RabbitMQ example used deprecated `queueLength` metadata. Replaced it with `mode: QueueLength` and `value: "10"`, matching the current scaler metadata.
- The AWS IRSA example used the older `aws-eks` provider and deprecated scaler-level `identityOwner: operator`. Updated it to the current `podIdentity.provider: aws` form with `identityOwner: keda` in the TriggerAuthentication.
- The KEDA operator service account examples used `keda-operator-sa`, which did not match the later RBAC example and common KEDA service account naming. Updated the examples to `keda-operator`.
- The GCP Pub/Sub example used removed/deprecated `subscriptionSize`. Replaced it with `mode: SubscriptionSize` and `value: "10"`.
- The mixed authentication example used the older AWS provider form. Updated it to `podIdentity.provider: aws` with `identityOwner: keda`.
- The Kafka TLS example referenced a secret key named `enable` that was not present. Added a `tls: "enable"` secret entry and updated the TriggerAuthentication reference to use `key: tls`.

## Review Notes
- KEDA v2.20 documentation marks the GCP Pub/Sub scaler itself as deprecated, though identity-based examples are still documented. A future rewrite could mention this caveat explicitly and point readers toward current alternatives if KEDA removes the scaler in a later release.
- The post intentionally uses placeholder credentials and certificates. These examples are structurally valid but still require real secret values, cloud IAM bindings, and provider-specific permissions before they will work in a live cluster.
