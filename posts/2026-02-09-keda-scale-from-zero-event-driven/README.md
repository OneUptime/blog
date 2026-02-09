# How to Use KEDA to Scale from Zero for Event-Driven Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KEDA, Event-Driven

Description: Configure KEDA to scale deployments from zero replicas to handle event-driven workloads efficiently, reducing costs by eliminating idle pods while maintaining responsiveness to incoming events.

---

Traditional autoscaling keeps a minimum number of pods running even when there is no work to do. KEDA enables scale-to-zero, where deployments can scale down to zero replicas during idle periods and automatically scale up when events arrive. This dramatically reduces resource costs for intermittent or sporadic workloads.

Scale-to-zero is perfect for event-driven architectures where work arrives unpredictably. Queue processors, webhook handlers, scheduled jobs, and batch processors can all benefit from eliminating idle pods while maintaining the ability to quickly respond when work appears.

## Understanding Scale-to-Zero

When a deployment scales to zero, all pods are removed and consume no cluster resources. KEDA continues monitoring the event source. When events arrive, KEDA immediately creates pods to handle them. The activation threshold determines when to scale from zero to one or more replicas.

This differs from traditional HPA, which requires at least one pod to collect metrics. KEDA monitors external event sources directly, enabling true zero-replica operation.

## Basic Scale-to-Zero Configuration

Configure a ScaledObject with minReplicaCount set to zero.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: queue-worker-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: queue-worker
  minReplicaCount: 0  # Allow scaling to zero
  maxReplicaCount: 50

  pollingInterval: 30  # Check for work every 30 seconds
  cooldownPeriod: 300  # Wait 5 minutes of idle before scaling to zero

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789/work-queue
      queueLength: "10"
      awsRegion: us-east-1
      activationQueueLength: "1"  # Scale from zero when any message exists
```

With minReplicaCount at 0, the deployment scales to zero when the queue is empty for 5 minutes (cooldownPeriod), and scales up immediately when a message appears.

## Configuring Activation Thresholds

The activation threshold determines when to scale from zero to active.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: batch-processor-scaler
  namespace: processing
spec:
  scaleTargetRef:
    name: batch-processor
  minReplicaCount: 0
  maxReplicaCount: 100

  triggers:
  - type: azure-servicebus
    authenticationRef:
      name: azure-auth
    metadata:
      queueName: batch-jobs
      messageCount: "20"  # Target 20 messages per pod when active
      namespace: production
      activationMessageCount: "5"  # Activate from zero when 5+ messages exist
```

This configuration keeps the deployment at zero until at least 5 messages are in the queue. Once activated, it scales to maintain 20 messages per pod.

## Kafka Scale-to-Zero

Scale Kafka consumers from zero based on consumer lag.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
  namespace: streaming
spec:
  scaleTargetRef:
    name: kafka-consumer
  minReplicaCount: 0
  maxReplicaCount: 50

  pollingInterval: 20
  cooldownPeriod: 600  # Wait 10 minutes before scaling to zero

  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka.kafka.svc.cluster.local:9092
      consumerGroup: periodic-processors
      topic: periodic-events
      lagThreshold: "50"  # Target 50 messages lag per pod
      activationLagThreshold: "10"  # Activate when lag exceeds 10 messages
      offsetResetPolicy: latest
```

When no lag exists for 10 minutes, consumers scale to zero. When lag appears, KEDA immediately creates consumer pods.

## HTTP Request-Based Scaling

Use KEDA HTTP Add-on to scale web services from zero based on incoming requests.

```bash
# Install KEDA HTTP Add-on
helm install http-add-on kedacore/keda-add-on-http \
  --namespace keda \
  --set interceptor.replicas=2
```

Configure HTTPScaledObject for scale-to-zero HTTP handling.

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: web-service-scaler
  namespace: services
spec:
  scaleTargetRef:
    name: web-service
    service: web-service
    port: 8080
  minReplicaCount: 0
  maxReplicaCount: 30

  replicas: 3  # Scale to 3 replicas on activation

  scalingMetric:
    requestRate:
      targetValue: 100  # Target 100 requests per second per pod
      granularity: 1s
```

The HTTP interceptor queues requests while pods start, ensuring no requests are lost during scale-from-zero.

## Cron-Based Scale-to-Zero

Scale deployments based on cron schedules.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: scheduled-job-scaler
  namespace: jobs
spec:
  scaleTargetRef:
    name: scheduled-job
  minReplicaCount: 0
  maxReplicaCount: 10

  triggers:
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 8 * * *  # Scale up at 8 AM
      end: 0 18 * * *   # Scale down at 6 PM
      desiredReplicas: "5"
```

This keeps the deployment at zero outside business hours (6 PM to 8 AM) and scales to 5 replicas during business hours.

## Handling Cold Start Delays

Minimize the time between event arrival and pod readiness.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: fast-startup-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: fast-worker
  minReplicaCount: 0
  maxReplicaCount: 100

  pollingInterval: 10  # Check frequently for fast response
  cooldownPeriod: 120  # Short cooldown for quick scale-to-zero

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789/urgent-queue
      queueLength: "10"
      awsRegion: us-east-1
      activationQueueLength: "1"

  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 0  # Scale up immediately
          policies:
          - type: Pods
            value: 10  # Create many pods quickly
            periodSeconds: 15
```

Pair this with an optimized container image and deployment configuration.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fast-worker
  namespace: workers
spec:
  replicas: 0  # KEDA manages this
  selector:
    matchLabels:
      app: fast-worker
  template:
    metadata:
      labels:
        app: fast-worker
    spec:
      # Use topology spread to distribute pods quickly
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: fast-worker

      containers:
      - name: worker
        image: fast-worker:latest
        imagePullPolicy: Always

        # Optimize readiness probe for fast startup
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 2
          periodSeconds: 1
          failureThreshold: 3

        # Request resources for faster scheduling
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Scale-to-Zero with Multiple Triggers

Combine multiple event sources for scale-to-zero behavior.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: multi-source-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: multi-worker
  minReplicaCount: 0
  maxReplicaCount: 100

  triggers:
  # Trigger 1: SQS Queue
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789/queue1
      queueLength: "20"
      awsRegion: us-east-1
      activationQueueLength: "1"

  # Trigger 2: Azure Queue
  - type: azure-queue
    authenticationRef:
      name: azure-auth
    metadata:
      queueName: queue2
      queueLength: "20"
      accountName: storageaccount
      activationQueueLength: "1"
```

The deployment activates from zero when either event source has pending work, and scales based on the combined workload.

## Monitoring Scale-to-Zero Behavior

Track when deployments scale to and from zero.

```bash
# Watch replica count changes
kubectl get deployment queue-worker -n workers -w

# Check ScaledObject status
kubectl get scaledobject queue-worker-scaler -n workers

# View scaling events
kubectl get events -n workers \
  --field-selector involvedObject.name=queue-worker-scaler \
  --sort-by='.lastTimestamp'

# Check time at zero replicas
kubectl get scaledobject queue-worker-scaler -n workers -o json | \
  jq '.status.conditions[] | select(.type=="Ready")'
```

Monitor KEDA metrics for scale-to-zero patterns.

```bash
# Check KEDA scaler activity
kubectl logs -n keda deployment/keda-operator | grep queue-worker-scaler

# View HPA status
kubectl describe hpa keda-hpa-queue-worker-scaler -n workers
```

## Cost Impact Analysis

Calculate cost savings from scale-to-zero.

```bash
# Track pod uptime vs downtime
# This script estimates cost savings

#!/bin/bash
NAMESPACE="workers"
DEPLOYMENT="queue-worker"

# Get scaling events
kubectl get events -n $NAMESPACE \
  --field-selector involvedObject.name=$DEPLOYMENT \
  --sort-by='.lastTimestamp' | \
  grep "Scaled" > /tmp/scaling_events.txt

# Calculate uptime percentage
# Analyze the events to determine when replicas were > 0
# Compare against total time to calculate idle percentage

echo "Scaling to zero can save costs during idle periods"
```

## Best Practices for Scale-to-Zero

Only use scale-to-zero for workloads that can tolerate cold start latency. Real-time services requiring immediate response should maintain minimum replicas.

Set appropriate cooldownPeriod to avoid flapping between zero and active states. Too short causes unnecessary pod churn, too long delays cost savings.

Configure activation thresholds to avoid scaling up for tiny amounts of work. For example, don't scale up for a single message if the queue usually has hundreds.

Optimize container images and pod startup time to minimize cold start impact. Use multi-stage builds, cache dependencies, and tune readiness probes.

Monitor the actual scale-to-zero patterns in production. If deployments rarely reach zero, the configuration might need adjustment or scale-to-zero might not be appropriate for that workload.

## Handling Warm-Up Requirements

Some applications need warm-up time after starting.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: warm-up-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: cache-worker
  minReplicaCount: 0
  maxReplicaCount: 50

  # Initial scale
  initialReplicaCount: 5  # Start with multiple pods to handle initial burst

  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-auth
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789/cache-jobs
      queueLength: "10"
      awsRegion: us-east-1
      activationQueueLength: "1"
```

Setting initialReplicaCount creates multiple pods immediately when activating from zero, providing better initial capacity.

## Conclusion

KEDA's scale-to-zero capability enables significant cost savings for event-driven workloads by eliminating idle pods while maintaining responsiveness to incoming work. By configuring appropriate activation thresholds, cooldown periods, and scaling policies, you can build systems that efficiently use resources without compromising functionality.

The key to successful scale-to-zero implementation is understanding your workload's characteristics and tolerance for cold start delays. Combined with optimized container images and proper monitoring, scale-to-zero creates highly efficient, cost-effective systems that scale precisely with demand.
