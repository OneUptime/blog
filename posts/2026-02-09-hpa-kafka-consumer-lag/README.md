# How to use HPA with Kafka consumer lag for event-driven scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Kafka

Description: Learn how to configure Horizontal Pod Autoscaler to scale Kafka consumers based on consumer lag metrics for efficient event-driven scaling.

---

Scaling Kafka consumers based on consumer lag is one of the most effective ways to handle variable message throughput. When messages arrive faster than consumers can process them, lag builds up. Traditional CPU and memory-based HPA often fails to capture this dynamic, leading to underutilization or overload. This guide shows you how to scale your Kafka consumers using consumer lag metrics with Kubernetes HPA.

## Understanding Kafka Consumer Lag

Consumer lag measures the difference between the latest offset in a partition and the offset your consumer has processed. High lag means your consumers are falling behind, and you need more processing capacity. Low lag indicates you have sufficient capacity or can scale down.

The key insight is that lag directly correlates with processing demand in ways that CPU and memory metrics cannot capture. A consumer might have low CPU usage but high lag if messages are arriving faster than the processing rate.

## Architecture Overview

To implement lag-based scaling, you need these components:

1. A Kafka cluster with consumer groups processing messages
2. A metrics exporter that exposes consumer lag (like Burrow or Kafka Exporter)
3. Prometheus to scrape and store these metrics
4. Prometheus Adapter to expose lag metrics to the Kubernetes Metrics API
5. HPA configured to scale based on the exposed lag metric

## Setting Up Kafka Exporter

Kafka Exporter provides consumer lag metrics in Prometheus format. Deploy it to your cluster:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kafka-exporter
  template:
    metadata:
      labels:
        app: kafka-exporter
    spec:
      containers:
      - name: kafka-exporter
        image: danielqsj/kafka-exporter:latest
        args:
        - "--kafka.server=kafka-broker-0.kafka-headless.kafka.svc.cluster.local:9092"
        - "--kafka.server=kafka-broker-1.kafka-headless.kafka.svc.cluster.local:9092"
        - "--kafka.server=kafka-broker-2.kafka-headless.kafka.svc.cluster.local:9092"
        ports:
        - containerPort: 9308
          name: metrics
---
apiVersion: v1
kind: Service
metadata:
  name: kafka-exporter
  namespace: monitoring
  labels:
    app: kafka-exporter
spec:
  ports:
  - port: 9308
    name: metrics
  selector:
    app: kafka-exporter
```

This exporter connects to your Kafka brokers and exposes consumer lag metrics at the `/metrics` endpoint.

## Configuring Prometheus Scraping

Add a ServiceMonitor or Prometheus scrape config to collect the metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kafka-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: kafka-exporter
  endpoints:
  - port: metrics
    interval: 30s
```

Kafka Exporter provides the `kafka_consumergroup_lag` metric, which shows the total lag across all partitions for a consumer group. You can query it in Prometheus:

```promql
kafka_consumergroup_lag{consumergroup="payment-processor"}
```

## Deploying Prometheus Adapter

Prometheus Adapter translates Prometheus metrics into the Kubernetes Custom Metrics API. Install it with Helm:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus-server.monitoring.svc
```

Configure the adapter to expose consumer lag as a custom metric. Create a ConfigMap with this rule:

```yaml
rules:
- seriesQuery: 'kafka_consumergroup_lag'
  resources:
    overrides:
      namespace: {resource: "namespace"}
      consumergroup: {resource: "deployment"}
  name:
    matches: "^(.*)$"
    as: "kafka_consumer_lag"
  metricsQuery: 'max(kafka_consumergroup_lag{consumergroup="<<.LabelMatchers>>",namespace="<<.NamespaceName>>"}) by (consumergroup)'
```

This configuration maps the Kafka consumer group to a Kubernetes Deployment and exposes the max lag across all partitions.

## Creating the Kafka Consumer Deployment

Here's a sample consumer deployment that will be scaled:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-processor
  namespace: default
  labels:
    consumergroup: payment-processor
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payment-processor
  template:
    metadata:
      labels:
        app: payment-processor
    spec:
      containers:
      - name: consumer
        image: myorg/payment-processor:1.0
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "kafka-broker-0.kafka-headless.kafka.svc.cluster.local:9092"
        - name: KAFKA_CONSUMER_GROUP
          value: "payment-processor"
        - name: KAFKA_TOPIC
          value: "payment-events"
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

## Configuring HPA with Consumer Lag

Now create an HPA that scales based on consumer lag:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-processor-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-processor
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Object
    object:
      metric:
        name: kafka_consumer_lag
      describedObject:
        apiVersion: apps/v1
        kind: Deployment
        name: payment-processor
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

This HPA scales the deployment to maintain an average lag of 1,000 messages per replica. If lag exceeds this threshold, it adds more pods. The behavior section ensures gradual scaling to prevent thrashing.

## Advanced: Per-Partition Lag Awareness

For more sophisticated scaling, you can use per-partition lag metrics. This is useful when partitions have uneven load distribution:

```yaml
metricsQuery: 'sum(kafka_consumergroup_lag{consumergroup="<<.LabelMatchers>>",namespace="<<.NamespaceName>>"}) by (consumergroup)'
```

This query sums lag across all partitions, giving you a total lag value. Combine this with the number of partitions to determine optimal replica count.

## Monitoring and Validation

Verify the custom metrics are available:

```bash
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/default/deployments/payment-processor/kafka_consumer_lag"
```

Watch the HPA in action:

```bash
kubectl get hpa payment-processor-hpa --watch
```

You should see the current metric value and the desired replica count adjusting based on consumer lag.

## Setting the Right Lag Threshold

The target lag value depends on your processing rate and latency requirements. Calculate it using:

```
Target Lag = (Acceptable Latency in seconds) × (Messages per second per replica)
```

For example, if each replica processes 100 messages/second and you can tolerate 10 seconds of lag, set your target to 1,000 messages.

Start with a conservative threshold and adjust based on observed behavior. Monitor both lag and processing time to find the sweet spot between resource efficiency and latency.

## Combining Lag with Other Metrics

You can combine consumer lag with CPU or memory metrics for more robust scaling:

```yaml
metrics:
- type: Object
  object:
    metric:
      name: kafka_consumer_lag
    describedObject:
      apiVersion: apps/v1
      kind: Deployment
      name: payment-processor
    target:
      type: AverageValue
      averageValue: "1000"
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70
```

The HPA will scale based on whichever metric demands more replicas, ensuring you never run out of capacity.

## Conclusion

Scaling Kafka consumers based on consumer lag provides responsive, efficient autoscaling that directly addresses processing demand. By exposing lag metrics through Prometheus Adapter and configuring HPA appropriately, you can build systems that automatically adapt to message throughput variations. This approach reduces both overprovisioning and processing delays, making your event-driven architecture more resilient and cost-effective.
