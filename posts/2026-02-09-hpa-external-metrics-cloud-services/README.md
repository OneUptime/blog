# How to Set Up HPA Based on External Metrics from Cloud Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Cloud Services

Description: Configure Horizontal Pod Autoscaler to scale based on external metrics from cloud services like AWS CloudWatch, Azure Monitor, or GCP Cloud Monitoring for cloud-native autoscaling strategies.

---

Modern cloud-native applications often depend on managed cloud services like message queues, databases, and storage systems. These services expose metrics through their cloud provider's monitoring systems. By using external metrics in HPA, you can scale your Kubernetes workloads based on the state of these cloud resources.

External metrics enable scaling based on SQS queue depth, CloudWatch custom metrics, Azure Service Bus message count, or any other metric available through cloud monitoring APIs. This creates responsive autoscaling that reacts to the actual workload state rather than just pod resource usage.

## Understanding External Metrics

External metrics come from sources outside the Kubernetes cluster. Unlike custom metrics that are associated with Kubernetes objects like pods, external metrics represent global values like queue depth, database connection count, or API request rates from external systems.

HPA queries external metrics through the external metrics API, which is typically provided by a metrics adapter that connects to cloud monitoring services. The adapter fetches metric values from the cloud provider and exposes them to HPA.

## Setting Up External Metrics with KEDA

KEDA (Kubernetes Event Driven Autoscaling) provides the easiest way to use external metrics for HPA. Install KEDA to enable external metrics support.

```bash
# Install KEDA using Helm
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

helm install keda kedacore/keda \
  --namespace keda \
  --create-namespace

# Verify installation
kubectl get pods -n keda
kubectl get apiservices | grep external.metrics
```

KEDA includes built-in scalers for AWS, Azure, GCP, and many other external systems.

## Scaling Based on AWS SQS Queue Depth

Scale workers based on the number of messages waiting in an SQS queue.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: workers
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key-id"
  AWS_SECRET_ACCESS_KEY: "your-secret-access-key"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: aws-sqs-trigger-auth
  namespace: workers
spec:
  secretTargetRef:
  - parameter: awsAccessKeyID
    name: aws-credentials
    key: AWS_ACCESS_KEY_ID
  - parameter: awsSecretAccessKey
    name: aws-credentials
    key: AWS_SECRET_ACCESS_KEY
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-worker-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: sqs-worker
  minReplicaCount: 2
  maxReplicaCount: 100

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-sqs-trigger-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789/my-queue
      queueLength: "10"  # Target 10 messages per pod
      awsRegion: us-east-1
      identityOwner: operator  # Use credentials from TriggerAuthentication

  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 60
          policies:
          - type: Percent
            value: 100
            periodSeconds: 60
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
          - type: Percent
            value: 20
            periodSeconds: 120
```

KEDA monitors the SQS queue and adjusts replicas to maintain approximately 10 messages per pod.

## Using Azure Service Bus Metrics

Scale based on Azure Service Bus queue or topic metrics.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-servicebus-secret
  namespace: workers
type: Opaque
stringData:
  connection-string: "Endpoint=sb://namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=key"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-servicebus-auth
  namespace: workers
spec:
  secretTargetRef:
  - parameter: connection
    name: azure-servicebus-secret
    key: connection-string
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: servicebus-worker-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: servicebus-worker
  minReplicaCount: 1
  maxReplicaCount: 50

  triggers:
  - type: azure-servicebus
    authenticationRef:
      name: azure-servicebus-auth
    metadata:
      queueName: orders
      messageCount: "5"  # Target 5 messages per pod
      namespace: production-namespace

  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 30
          policies:
          - type: Pods
            value: 10
            periodSeconds: 60
        scaleDown:
          stabilizationWindowSeconds: 600
          policies:
          - type: Percent
            value: 10
            periodSeconds: 180
```

This scales workers based on the number of messages in the Azure Service Bus queue.

## Scaling with GCP Pub/Sub

Use GCP Pub/Sub subscription metrics for autoscaling.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gcp-credentials
  namespace: workers
type: Opaque
stringData:
  credentials.json: |
    {
      "type": "service_account",
      "project_id": "your-project",
      "private_key_id": "key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...",
      "client_email": "service-account@project.iam.gserviceaccount.com"
    }
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: gcp-pubsub-auth
  namespace: workers
spec:
  secretTargetRef:
  - parameter: GoogleApplicationCredentials
    name: gcp-credentials
    key: credentials.json
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pubsub-worker-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: pubsub-worker
  minReplicaCount: 3
  maxReplicaCount: 100

  triggers:
  - type: gcp-pubsub
    authenticationRef:
      name: gcp-pubsub-auth
    metadata:
      subscriptionName: workers-subscription
      subscriptionSize: "15"  # Target 15 unacked messages per pod
      mode: SubscriptionSize

  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 60
          policies:
          - type: Percent
            value: 100
            periodSeconds: 60
          - type: Pods
            value: 20
            periodSeconds: 60
          selectPolicy: Max
        scaleDown:
          stabilizationWindowSeconds: 600
          policies:
          - type: Percent
            value: 15
            periodSeconds: 180
```

The scaler monitors unacknowledged messages in the Pub/Sub subscription and scales workers accordingly.

## Using AWS CloudWatch Custom Metrics

Scale based on any CloudWatch metric, including custom application metrics.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cloudwatch-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: api-server
  minReplicaCount: 5
  maxReplicaCount: 50

  triggers:
  - type: aws-cloudwatch
    authenticationRef:
      name: aws-credentials
    metadata:
      awsRegion: us-east-1
      namespace: CustomApp
      metricName: PendingRequests
      targetMetricValue: "100"
      minMetricValue: "0"
      metricStatPeriod: "60"
      metricStat: "Average"

      # Dimensions to filter the metric
      dimensionName: Environment
      dimensionValue: production
```

This scales based on a custom CloudWatch metric, allowing you to scale on any business or application metric you publish to CloudWatch.

## Combining External and Resource Metrics

Use both external metrics and standard resource metrics for comprehensive autoscaling.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: combined-metrics-hpa
  namespace: workers
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hybrid-worker
  minReplicas: 2
  maxReplicas: 100

  metrics:
  # External metric from KEDA
  - type: External
    external:
      metric:
        name: s0-aws-sqs-queue-my-queue
        selector:
          matchLabels:
            scaledobject.keda.sh/name: sqs-worker-scaler
      target:
        type: AverageValue
        averageValue: "10"

  # Standard CPU metric
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Memory metric
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 120
```

HPA calculates desired replicas for each metric independently and uses the highest value, ensuring the deployment scales to meet all constraints.

## Scaling Based on Database Metrics

Use cloud database metrics for scaling application tiers.

```yaml
# Scale based on RDS connection count
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: db-connection-scaler
  namespace: api
spec:
  scaleTargetRef:
    name: api-server
  minReplicaCount: 10
  maxReplicaCount: 100

  triggers:
  - type: aws-cloudwatch
    authenticationRef:
      name: aws-credentials
    metadata:
      awsRegion: us-east-1
      namespace: AWS/RDS
      metricName: DatabaseConnections
      targetMetricValue: "50"  # Scale when connections exceed 50 per pod
      metricStatPeriod: "60"
      metricStat: "Average"
      dimensionName: DBInstanceIdentifier
      dimensionValue: production-db
```

This prevents overloading your database by scaling application servers based on actual database connection usage.

## Monitoring External Metric Scaling

Track how external metrics affect scaling decisions.

```bash
# Check KEDA ScaledObject status
kubectl get scaledobject -n workers

# View detailed scaler information
kubectl describe scaledobject sqs-worker-scaler -n workers

# Check the generated HPA
kubectl get hpa -n workers

# View HPA status with metrics
kubectl describe hpa keda-hpa-sqs-worker-scaler -n workers

# Watch scaling events
kubectl get events -n workers --field-selector involvedObject.name=sqs-worker-scaler -w
```

Monitor KEDA logs to debug metric fetching issues.

```bash
kubectl logs -n keda deployment/keda-operator
kubectl logs -n keda deployment/keda-metrics-apiserver
```

## Using Azure Monitor Metrics

Scale based on any Azure Monitor metric.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-monitor-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: web-app
  minReplicaCount: 5
  maxReplicaCount: 100

  triggers:
  - type: azure-monitor
    authenticationRef:
      name: azure-credentials
    metadata:
      resourceURI: /subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Web/sites/webapp
      metricName: Http5xx
      targetValue: "10"
      metricAggregationType: Average
      metricAggregationInterval: "1:0"
      metricFilter: ""
```

This scales based on HTTP 5xx error count, allowing you to add capacity when error rates increase.

## Implementing Fallback Metrics

Configure fallback behavior when external metrics are unavailable.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: resilient-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: worker
  minReplicaCount: 5  # Safe minimum if metrics fail
  maxReplicaCount: 50

  fallback:
    failureThreshold: 3
    replicas: 10  # Scale to this count if external metrics fail

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/account/queue
      queueLength: "15"
      awsRegion: us-east-1
```

If the external metric becomes unavailable (after 3 failed checks), KEDA scales to a safe fallback replica count.

## Best Practices

Secure cloud credentials using Kubernetes secrets and RBAC. Never hardcode credentials in YAML files. Use IAM roles for service accounts when possible for better security.

Set appropriate target values based on observed system behavior. Load test your application to determine optimal queue depth or metric thresholds that balance throughput and latency.

Configure stabilization windows to prevent scaling oscillations when external metrics fluctuate. Cloud metrics often have some lag or aggregation that can cause delayed reactions.

Monitor both the external metrics source and the HPA behavior. Set up alerts for when external metric sources become unavailable or when HPA reaches min/max replicas.

Use fallback configurations in KEDA to handle external metric source failures gracefully. This prevents scaling deadlock if your cloud monitoring API becomes unavailable.

## Conclusion

External metrics enable sophisticated autoscaling strategies that respond to the actual state of your cloud infrastructure and services. By scaling based on queue depth, database metrics, or custom business metrics, you create systems that automatically adjust capacity to match workload demands.

KEDA simplifies the integration between cloud monitoring systems and Kubernetes HPA, providing pre-built scalers for common cloud services. Combined with appropriate scaling policies and monitoring, external metrics-based autoscaling ensures your applications maintain performance while efficiently using cloud resources.
