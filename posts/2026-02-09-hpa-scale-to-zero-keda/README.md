# How to Implement HPA with Scale-to-Zero Using KEDA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KEDA, Autoscaling

Description: Implement scale-to-zero autoscaling with KEDA to reduce costs by scaling idle workloads down to zero replicas and automatically scaling up when work arrives.

---

Standard Kubernetes HPA requires at least one replica running at all times. For workloads that process intermittent tasks, this wastes resources during idle periods. KEDA (Kubernetes Event Driven Autoscaling) extends HPA to enable scale-to-zero, where deployments can scale down to zero replicas when no work is available and instantly scale up when events arrive.

Scale-to-zero makes economic sense for batch jobs, queue workers, scheduled tasks, and event-driven functions that don't need constant availability. By running zero pods during idle time, you eliminate resource costs while maintaining the ability to process work when needed. KEDA monitors event sources like message queues, databases, and external systems to determine when to scale from zero.

## Understanding KEDA Architecture

KEDA consists of three main components. The KEDA Operator watches ScaledObject resources and creates HPA configurations. The Metrics Server exposes custom metrics to HPA based on event sources. The Scaler implementations connect to external systems like RabbitMQ, Kafka, or cloud services to retrieve metrics.

When no events are present, KEDA scales the deployment to zero. When events appear in the monitored source, KEDA activates the deployment before HPA takes over for scaling beyond one replica. This activation mechanism is what enables true scale-to-zero functionality.

## Installing KEDA

Deploy KEDA to your cluster using Helm.

```bash
# Add KEDA Helm repository
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Install KEDA
helm install keda kedacore/keda \
  --namespace keda \
  --create-namespace

# Verify installation
kubectl get pods -n keda

# Check KEDA is ready
kubectl get deployment -n keda
```

You should see the keda-operator and keda-metrics-apiserver pods running.

## Basic Scale-to-Zero Configuration

Create a deployment and ScaledObject for queue-based scaling.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-processor
  namespace: workers
spec:
  replicas: 0  # Start at zero
  selector:
    matchLabels:
      app: processor
  template:
    metadata:
      labels:
        app: processor
    spec:
      containers:
      - name: worker
        image: queue-worker:v1.0
        env:
        - name: QUEUE_URL
          value: "amqp://rabbitmq.default.svc.cluster.local:5672"
        resources:
          requests:
            memory: 256Mi
            cpu: 100m
          limits:
            memory: 512Mi
            cpu: 500m
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: queue-processor-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: queue-processor
  minReplicaCount: 0  # Enable scale-to-zero
  maxReplicaCount: 50
  pollingInterval: 30  # Check for events every 30 seconds
  cooldownPeriod: 300  # Wait 5 minutes before scaling to zero

  triggers:
  - type: rabbitmq
    metadata:
      queueName: tasks
      host: "amqp://guest:guest@rabbitmq.default.svc.cluster.local:5672/"
      queueLength: "10"  # Target 10 messages per pod
```

Apply this configuration.

```bash
kubectl apply -f deployment.yaml

# Watch scaling behavior
kubectl get deployment queue-processor -n workers -w

# Check KEDA scaler status
kubectl get scaledobject -n workers
kubectl describe scaledobject queue-processor-scaler -n workers
```

When the RabbitMQ queue is empty, KEDA scales to zero. When messages arrive, KEDA activates the deployment.

## Scale-to-Zero with Kafka

Configure scale-to-zero for Kafka consumer workloads.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: kafka-secrets
  namespace: workers
stringData:
  sasl: "plain"
  username: "kafka-user"
  password: "kafka-password"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: kafka-trigger-auth
  namespace: workers
spec:
  secretTargetRef:
  - parameter: sasl
    name: kafka-secrets
    key: sasl
  - parameter: username
    name: kafka-secrets
    key: username
  - parameter: password
    name: kafka-secrets
    key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: kafka-consumer
  minReplicaCount: 0
  maxReplicaCount: 100
  pollingInterval: 30
  cooldownPeriod: 600  # Wait 10 minutes before scaling to zero

  triggers:
  - type: kafka
    authenticationRef:
      name: kafka-trigger-auth
    metadata:
      bootstrapServers: kafka.default.svc.cluster.local:9092
      consumerGroup: events-processor
      topic: events
      lagThreshold: "50"  # Scale when lag exceeds 50 messages per pod
```

This configuration monitors Kafka consumer lag and scales from zero when messages accumulate.

## HTTP-Based Scale-to-Zero

Use KEDA's HTTP Add-on for serverless-style HTTP workloads.

```bash
# Install KEDA HTTP Add-on
helm install http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set interceptor.replicas=2
```

Configure HTTP-based scaling.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: http-function
  namespace: functions
spec:
  replicas: 0
  selector:
    matchLabels:
      app: http-function
  template:
    metadata:
      labels:
        app: http-function
    spec:
      containers:
      - name: function
        image: function-handler:v1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: 128Mi
            cpu: 50m
---
apiVersion: v1
kind: Service
metadata:
  name: http-function
  namespace: functions
spec:
  selector:
    app: http-function
  ports:
  - port: 8080
    targetPort: 8080
---
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: http-function-scaler
  namespace: functions
spec:
  scaleTargetRef:
    name: http-function
    service: http-function
    port: 8080
  minReplicas: 0
  maxReplicas: 20
  scalingMetric:
    requestRate:
      targetValue: 100  # Target 100 requests per second per pod
      granularity: 1s
```

The HTTP interceptor queues requests while pods scale from zero, providing a seamless experience despite cold starts.

## Scheduled Scale-to-Zero

Use CRON triggers to scale based on schedules.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: scheduled-job-scaler
spec:
  scaleTargetRef:
    name: batch-job
  minReplicaCount: 0
  maxReplicaCount: 10

  triggers:
  # Scale to 1 during business hours
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 8 * * 1-5      # 8 AM Monday-Friday
      end: 0 18 * * 1-5       # 6 PM Monday-Friday
      desiredReplicas: "5"

  # Scale to 0 outside business hours
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 18 * * 1-5     # 6 PM Monday-Friday
      end: 0 8 * * 1-5        # 8 AM Monday-Friday
      desiredReplicas: "0"
```

This keeps the deployment active during business hours and scales to zero overnight and weekends.

## Combining Multiple Triggers

Scale based on multiple event sources simultaneously.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: multi-trigger-scaler
spec:
  scaleTargetRef:
    name: event-processor
  minReplicaCount: 0
  maxReplicaCount: 100
  pollingInterval: 30
  cooldownPeriod: 300

  triggers:
  # Scale on queue depth
  - type: aws-sqs-queue
    authenticationRef:
      name: aws-credentials
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789/events
      queueLength: "20"
      awsRegion: us-east-1

  # Also scale on CloudWatch metric
  - type: aws-cloudwatch
    authenticationRef:
      name: aws-credentials
    metadata:
      namespace: CustomApp
      metricName: PendingEvents
      targetMetricValue: "100"
      minMetricValue: "0"
      awsRegion: us-east-1

  # And respond to Prometheus metrics
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring.svc:9090
      metricName: event_backlog_total
      threshold: "1000"
      query: sum(event_backlog{job="processor"})
```

KEDA evaluates all triggers and scales from zero if any trigger indicates work is available.

## Handling Cold Starts

Scale-to-zero introduces cold start latency when pods must start from zero.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fast-start-worker
spec:
  template:
    spec:
      containers:
      - name: worker
        image: worker:v1.0
        # Use readiness probe to speed up availability detection
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 2
        # Pre-pull images on nodes
        imagePullPolicy: IfNotPresent
      # Use priority class for faster scheduling
      priorityClassName: high-priority
```

Optimize cold start time with fast container startup, readiness probes, and image pre-pulling.

## Monitoring Scale-to-Zero Behavior

Track scaling events and activation latency.

```bash
# Check ScaledObject status
kubectl get scaledobject -n workers

# View detailed scaler information
kubectl describe scaledobject queue-processor-scaler -n workers

# Watch for scale-from-zero events
kubectl get events -n workers --field-selector reason=KEDAScaleTargetActivated -w

# Monitor current replica count
watch -n 2 'kubectl get deployment -n workers'

# Check KEDA operator logs
kubectl logs -n keda -l app=keda-operator --tail=100 -f
```

Set up Prometheus metrics to track KEDA behavior.

```promql
# Time at zero replicas
keda_scaler_active{scaledObject="queue-processor-scaler"} == 0

# Scaling events
rate(keda_scaler_errors_total[5m])

# Current scaled object replicas
kube_deployment_status_replicas{deployment="queue-processor"}
```

## Best Practices for Scale-to-Zero

Set appropriate cooldown periods based on your workload's traffic patterns. Too short, and you'll scale to zero prematurely. Too long, and you'll waste resources during actual idle periods.

Use pollingInterval that balances responsiveness with API request overhead. Check every 30-60 seconds for most workloads. Use shorter intervals (10-15 seconds) for latency-critical applications.

Configure fallback replicas for when scalers fail.

```yaml
spec:
  fallback:
    failureThreshold: 3
    replicas: 2  # Scale to 2 if scaler fails
```

This prevents scaling to zero if the event source becomes unavailable.

Monitor activation latency and optimize container startup time. Users experience cold start delays, so minimize them through fast images, readiness probes, and warm-up code.

Use appropriate triggers for your workload. Queue-based triggers work well for asynchronous processing. HTTP triggers suit request-response patterns. Scheduled triggers fit periodic batch jobs.

Test scale-to-zero behavior under realistic conditions. Verify activation works correctly and cold start time is acceptable before deploying to production.

Document expected behavior during scale-from-zero periods. Users and operators should understand that requests might be delayed by pod startup time.

## Troubleshooting Scale-to-Zero Issues

**Deployment won't scale to zero**: Check cooldownPeriod hasn't been reached yet. Verify no triggers indicate active work.

```bash
kubectl get scaledobject queue-processor-scaler -o yaml | grep -A 10 status
```

**Scaling from zero is slow**: Optimize container startup time and readiness probes. Check if image pull is slow.

```bash
kubectl describe pod queue-processor-xxx | grep -A 5 Events
```

**Scaler shows errors**: Verify authentication and connectivity to external systems.

```bash
kubectl logs -n keda -l app=keda-operator | grep ERROR
```

**Unexpected scaling behavior**: Check all configured triggers and their current values.

```bash
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1" | jq .
```

## Conclusion

KEDA's scale-to-zero capability transforms Kubernetes into a serverless platform for event-driven workloads. By eliminating resource consumption during idle periods while maintaining the ability to automatically handle work when it arrives, scale-to-zero reduces costs without sacrificing functionality. The key is choosing appropriate triggers, tuning cooldown periods and polling intervals, and optimizing cold start performance to balance cost savings with user experience.
