# How to configure HPA with SQS queue depth for AWS workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, AWS

Description: Learn how to configure Horizontal Pod Autoscaler to scale workloads based on AWS SQS queue depth for efficient cloud-native scaling.

---

When running Kubernetes workloads that consume messages from AWS SQS queues, traditional CPU and memory-based autoscaling often misses the mark. Messages can queue up while your pods remain under-utilized, or you might over-provision capacity when queues are empty. Scaling based on SQS queue depth gives you precise control over consumer capacity, ensuring messages are processed efficiently without wasting resources.

## Why Queue Depth Matters

Queue depth represents the number of messages waiting to be processed in an SQS queue. This metric directly reflects processing demand in ways that resource utilization cannot. A pod might show low CPU usage while thousands of messages pile up, or it might be maxed out processing a single complex message while the queue remains empty.

By scaling based on queue depth, you align your infrastructure capacity with actual workload demand. This approach is particularly effective for event-driven architectures where message arrival rates fluctuate significantly.

## Architecture Components

To implement queue-depth-based scaling, you need:

1. AWS SQS queue receiving messages
2. Kubernetes pods consuming from the queue
3. CloudWatch for SQS metrics
4. A metrics provider that exposes CloudWatch metrics to Kubernetes (like KEDA or CloudWatch Exporter)
5. HPA configured to scale based on queue depth

## Method 1: Using KEDA (Recommended)

KEDA (Kubernetes Event Driven Autoscaling) provides native support for SQS queue depth scaling. It's the simplest and most robust approach.

Install KEDA in your cluster:

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm install keda kedacore/keda --namespace keda --create-namespace
```

Create an IAM role for the ScaledObject to access CloudWatch metrics. Attach this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "cloudwatch:GetMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

If running on EKS, use IRSA (IAM Roles for Service Accounts) to provide credentials. Create a ServiceAccount:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sqs-consumer-sa
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/sqs-consumer-role
```

Deploy your SQS consumer application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: order-processor
  template:
    metadata:
      labels:
        app: order-processor
    spec:
      serviceAccountName: sqs-consumer-sa
      containers:
      - name: processor
        image: myorg/order-processor:1.0
        env:
        - name: AWS_REGION
          value: "us-east-1"
        - name: SQS_QUEUE_URL
          value: "https://sqs.us-east-1.amazonaws.com/123456789012/order-queue"
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

Create a KEDA ScaledObject for queue-depth-based scaling:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: order-processor
  minReplicaCount: 1
  maxReplicaCount: 20
  pollingInterval: 30
  cooldownPeriod: 300
  triggers:
  - type: aws-sqs-queue
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789012/order-queue
      queueLength: "100"
      awsRegion: "us-east-1"
      identityOwner: operator
```

This configuration scales the deployment to maintain approximately 100 messages per pod. KEDA polls CloudWatch every 30 seconds and adjusts replica count accordingly.

## Method 2: Using CloudWatch Exporter and Prometheus Adapter

If you prefer a Prometheus-based approach, use CloudWatch Exporter to fetch SQS metrics.

Deploy CloudWatch Exporter:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudwatch-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloudwatch-exporter
  template:
    metadata:
      labels:
        app: cloudwatch-exporter
    spec:
      serviceAccountName: cloudwatch-exporter-sa
      containers:
      - name: exporter
        image: prom/cloudwatch-exporter:latest
        ports:
        - containerPort: 9106
          name: metrics
        volumeMounts:
        - name: config
          mountPath: /config
        command:
        - "java"
        - "-jar"
        - "/cloudwatch_exporter.jar"
        - "9106"
        - "/config/config.yml"
      volumes:
      - name: config
        configMap:
          name: cloudwatch-exporter-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cloudwatch-exporter-config
  namespace: monitoring
data:
  config.yml: |
    region: us-east-1
    metrics:
    - aws_namespace: AWS/SQS
      aws_metric_name: ApproximateNumberOfMessagesVisible
      aws_dimensions:
      - QueueName
      aws_statistics:
      - Average
      period_seconds: 60
      range_seconds: 300
      set_timestamp: false
```

Configure Prometheus to scrape the exporter:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cloudwatch-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: cloudwatch-exporter
  endpoints:
  - port: metrics
    interval: 60s
```

Set up Prometheus Adapter to expose the queue depth metric:

```yaml
rules:
- seriesQuery: 'aws_sqs_approximate_number_of_messages_visible_average{queue_name="order-queue"}'
  resources:
    overrides:
      namespace: {resource: "namespace"}
  name:
    matches: "^(.*)$"
    as: "sqs_queue_depth"
  metricsQuery: 'max(aws_sqs_approximate_number_of_messages_visible_average{queue_name="order-queue"}) by (queue_name)'
```

Create the HPA:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-processor-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-processor
  minReplicas: 1
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: sqs_queue_depth
        selector:
          matchLabels:
            queue_name: order-queue
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
```

## Determining the Right Queue Length Target

The target queue length per pod depends on your processing rate and latency requirements. Calculate it using:

```
Target Queue Length = (Acceptable Latency) × (Messages per second per pod)
```

For example, if each pod processes 10 messages per second and you can tolerate 10 seconds of latency, set your target to 100 messages per pod.

Monitor actual processing rates in production and adjust the target accordingly. Start conservative and increase if you have headroom.

## Handling Visibility Timeout

SQS visibility timeout affects scaling behavior. Messages being processed are invisible to queue depth metrics, which can cause premature scale-down. Set your cooldown period to be longer than your visibility timeout:

```yaml
cooldownPeriod: 300  # 5 minutes, longer than visibility timeout
```

This prevents scaling down while messages are still being processed.

## Combining Queue Depth with Resource Metrics

For additional safety, combine queue depth scaling with CPU limits:

```yaml
metrics:
- type: External
  external:
    metric:
      name: sqs_queue_depth
    target:
      type: AverageValue
      averageValue: "100"
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 80
```

This ensures you scale up if either queue depth or CPU usage is high, preventing resource exhaustion.

## Monitoring and Validation

Verify your setup by sending test messages to the queue and watching the HPA:

```bash
# Send test messages
aws sqs send-message-batch \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/order-queue \
  --entries file://messages.json

# Watch HPA
kubectl get hpa order-processor-hpa --watch
```

Monitor CloudWatch for queue metrics and correlate with pod count changes. You should see pods scale up as messages arrive and scale down after processing completes.

## Dead Letter Queues and Scaling

Configure a dead letter queue (DLQ) for failed messages. Don't scale based on DLQ depth, as that would create pods to process poison messages repeatedly. Instead, alert on DLQ depth and handle failures separately:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dlq-alerting
  annotations:
    prometheus.io/scrape: "true"
```

## Cost Optimization

Queue-depth-based scaling can significantly reduce costs by running pods only when needed. Configure aggressive scale-down for batch workloads:

```yaml
minReplicaCount: 0  # Scale to zero when queue is empty (KEDA only)
```

With KEDA, you can scale to zero when there are no messages, eliminating idle resource costs entirely.

## Conclusion

Scaling Kubernetes workloads based on SQS queue depth provides responsive, cost-effective autoscaling for AWS-based event-driven architectures. KEDA offers the simplest implementation with native SQS support, while CloudWatch Exporter provides flexibility for complex Prometheus-based observability stacks. Choose the approach that fits your infrastructure and monitor actual queue processing rates to tune your scaling targets effectively.
