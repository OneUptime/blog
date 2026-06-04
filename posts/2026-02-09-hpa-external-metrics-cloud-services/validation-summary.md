# Validation Summary: How to Set Up HPA Based on External Metrics from Cloud Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler autoscaling/v2
- Kubernetes external metrics API
- KEDA ScaledObject and TriggerAuthentication
- AWS SQS
- AWS CloudWatch
- Azure Service Bus
- Azure Monitor
- Google Cloud Pub/Sub
- Helm and kubectl

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- KEDA deployment with Helm documentation: https://keda.sh/docs/2.20/deploy/
- KEDA ScaledObject specification: https://keda.sh/docs/2.20/reference/scaledobject-spec/
- KEDA authentication documentation: https://keda.sh/docs/2.20/concepts/authentication/
- KEDA AWS SQS Queue scaler documentation: https://keda.sh/docs/2.20/scalers/aws-sqs/
- KEDA AWS CloudWatch scaler documentation: https://keda.sh/docs/2.20/scalers/aws-cloudwatch/
- KEDA Azure Service Bus scaler documentation: https://keda.sh/docs/2.20/scalers/azure-service-bus/
- KEDA Azure Monitor scaler documentation: https://keda.sh/docs/2.20/scalers/azure-monitor/
- KEDA Google Cloud Pub/Sub scaler documentation: https://keda.sh/docs/2.20/scalers/gcp-pub-sub/

## Issues Found
- The AWS SQS example set `identityOwner: operator` while using static credentials from `TriggerAuthentication`. KEDA documents `identityOwner` as deprecated metadata that applies to AWS EKS authentication, so the field was removed from the static-credential example.
- The GCP Pub/Sub example used `subscriptionSize`, which KEDA documents as removed in v2.20. Updated the snippet to use `mode: SubscriptionSize` with `value: "15"` and added a short caveat that the scaler is currently deprecated.
- The AWS CloudWatch examples set `metricStatPeriod` without `metricCollectionTime`. KEDA recommends `metricCollectionTime` be greater than `metricStatPeriod`, so `metricCollectionTime: "300"` was added to both CloudWatch snippets.
- The Azure Monitor example used a full Azure resource ID in `resourceURI`, omitted `tenantId`, `subscriptionId`, and `resourceGroupName`, and used `metricAggregationInterval: "1:0"`. KEDA documents `resourceURI` as a shortened provider/type/name value and requires the tenant, subscription, and resource group metadata; the interval format was corrected to `hh:mm:ss`.

## Review Notes
- The examples still use placeholder credentials and resource identifiers. In production, prefer workload identity or cloud-native pod identity over static secrets where supported.
- The manual HPA example that combines a KEDA external metric with resource metrics is structurally valid, but KEDA-generated external metric names are implementation-specific and should be confirmed with `kubectl describe hpa` or the external metrics API in a real cluster.
