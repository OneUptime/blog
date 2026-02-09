# How to Implement HPA with Workload-Specific Metrics Adapters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Adapters

Description: Implement workload-specific metrics adapters for HPA to enable autoscaling based on specialized metrics from databases, message queues, cloud services, and custom application systems.

---

Generic metrics adapters like the Prometheus Adapter work well for many use cases, but specialized workloads often benefit from dedicated metrics adapters. Workload-specific adapters understand the nuances of particular systems, provide optimized metric collection, and expose metrics in formats that better represent capacity for that workload type.

Examples include adapters for RabbitMQ that understand queue properties, adapters for database systems that track connection pools and query throughput, and adapters for custom application metrics that integrate with specific monitoring platforms. By using adapters tailored to your workload, you get more accurate scaling signals and better integration with your existing infrastructure.

## Understanding Metrics Adapter Architecture

Metrics adapters implement the Kubernetes custom metrics API or external metrics API. They run as deployments in your cluster, query external systems for metric values, and expose those values through Kubernetes API endpoints that HPA can query.

The adapter acts as a bridge between your monitoring or operational systems and Kubernetes autoscaling. It translates metrics from external formats into the format HPA expects, applies any necessary calculations or aggregations, and handles authentication with external services.

## Using KEDA for Event-Driven Workloads

KEDA (Kubernetes Event Driven Autoscaling) acts as a comprehensive metrics adapter for event sources.

```yaml
# KEDA installation
apiVersion: v1
kind: Namespace
metadata:
  name: keda
---
# KEDA with RabbitMQ scaler
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-consumer-scaler
  namespace: workers
spec:
  scaleTargetRef:
    name: message-consumer
  minReplicaCount: 2
  maxReplicaCount: 100
  pollingInterval: 30
  cooldownPeriod: 300

  triggers:
  - type: rabbitmq
    metadata:
      protocol: amqp
      queueName: tasks
      mode: QueueLength
      value: "20"  # Target 20 messages per pod
      host: amqp://guest:guest@rabbitmq.default.svc.cluster.local:5672/
```

KEDA includes pre-built scalers for RabbitMQ, Kafka, Azure Service Bus, AWS SQS, Redis, PostgreSQL, and many others.

## Implementing Custom Metrics Adapter

Build a custom adapter for specialized metrics.

```python
# Python custom metrics adapter using kubernetes-custom-metrics library
from flask import Flask, jsonify
from kubernetes import client, config
import redis
import time

app = Flask(__name__)

# Redis connection for custom metrics
redis_client = redis.Redis(host='redis-metrics.default.svc.cluster.local')

def get_pod_metric(namespace, pod_name, metric_name):
    """Get custom metric value for a specific pod"""
    if metric_name == 'queue_items_in_flight':
        # Query Redis for in-flight items for this pod
        key = f"pod:{pod_name}:in_flight"
        return int(redis_client.get(key) or 0)
    elif metric_name == 'processing_rate_per_minute':
        # Calculate processing rate
        key = f"pod:{pod_name}:processed"
        current = int(redis_client.get(key) or 0)
        time.sleep(60)
        after = int(redis_client.get(key) or 0)
        return after - current
    return 0

@app.route('/apis/custom.metrics.k8s.io/v1beta1/namespaces/<namespace>/pods/<pod>/queue_items_in_flight')
def pod_metric(namespace, pod):
    value = get_pod_metric(namespace, pod, 'queue_items_in_flight')
    return jsonify({
        'kind': 'MetricValueList',
        'apiVersion': 'custom.metrics.k8s.io/v1beta1',
        'metadata': {},
        'items': [{
            'describedObject': {
                'kind': 'Pod',
                'namespace': namespace,
                'name': pod,
                'apiVersion': 'v1'
            },
            'metricName': 'queue_items_in_flight',
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'value': f'{value}'
        }]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6443)
```

Deploy the custom adapter.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-metrics-adapter
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: custom-metrics-adapter
  template:
    metadata:
      labels:
        app: custom-metrics-adapter
    spec:
      containers:
      - name: adapter
        image: custom-metrics-adapter:v1.0
        ports:
        - containerPort: 6443
        env:
        - name: REDIS_HOST
          value: redis-metrics.default.svc.cluster.local
---
apiVersion: v1
kind: Service
metadata:
  name: custom-metrics-apiserver
  namespace: monitoring
spec:
  ports:
  - port: 443
    targetPort: 6443
  selector:
    app: custom-metrics-adapter
---
apiVersion: apiregistration.k8s.io/v1
kind: APIService
metadata:
  name: v1beta1.custom.metrics.k8s.io
spec:
  service:
    name: custom-metrics-apiserver
    namespace: monitoring
  group: custom.metrics.k8s.io
  version: v1beta1
  insecureSkipTLSVerify: true
  groupPriorityMinimum: 100
  versionPriority: 100
```

## Database-Specific Metrics Adapter

Use specialized adapters for database workloads.

```yaml
# PostgreSQL metrics adapter configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-metrics-adapter-config
  namespace: monitoring
data:
  config.yaml: |
    metrics:
    - name: active_connections
      query: "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"
      database: production_db
    - name: queries_per_second
      query: "SELECT sum(calls) / extract(epoch from now() - stats_reset) FROM pg_stat_statements"
      database: production_db
    - name: cache_hit_ratio
      query: "SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) FROM pg_statio_user_tables"
      database: production_db
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-metrics-adapter
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: postgres-adapter
  template:
    metadata:
      labels:
        app: postgres-adapter
    spec:
      containers:
      - name: adapter
        image: postgres-metrics-adapter:v1.0
        env:
        - name: POSTGRES_HOST
          value: postgres.default.svc.cluster.local
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-creds
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-creds
              key: password
```

Scale based on database metrics.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: db-workload-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: api-backend
  minReplicas: 10
  maxReplicas: 100
  metrics:
  - type: External
    external:
      metric:
        name: postgres.active_connections
      target:
        type: AverageValue
        averageValue: "50"  # 50 active DB connections per pod
  - type: External
    external:
      metric:
        name: postgres.queries_per_second
      target:
        type: Value
        value: "1000"  # Total 1000 queries/sec threshold
```

## Cloud Provider Metrics Adapters

Use cloud-native metrics for cloud workloads.

```yaml
# AWS CloudWatch adapter for Lambda invocations
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: monitoring
stringData:
  aws_access_key_id: "your-access-key"
  aws_secret_access_key: "your-secret-key"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudwatch-metrics-adapter
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cloudwatch-adapter
  template:
    metadata:
      labels:
        app: cloudwatch-adapter
    spec:
      containers:
      - name: adapter
        image: cloudwatch-metrics-adapter:v1.0
        env:
        - name: AWS_REGION
          value: us-east-1
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: aws_access_key_id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: aws_secret_access_key
```

Scale based on CloudWatch metrics.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cloudwatch-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: event-processor
  minReplicas: 5
  maxReplicas: 200
  metrics:
  - type: External
    external:
      metric:
        name: cloudwatch.lambda_invocations
        selector:
          matchLabels:
            function_name: event-handler
      target:
        type: AverageValue
        averageValue: "100"
```

## Monitoring Adapter Health

Track adapter availability and performance.

```bash
# Check adapter pods
kubectl get pods -n monitoring -l app=custom-metrics-adapter

# Verify API service registration
kubectl get apiservices | grep metrics

# Test metric availability
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | jq .

# Check adapter logs for errors
kubectl logs -n monitoring -l app=custom-metrics-adapter --tail=100

# Monitor adapter latency
kubectl top pods -n monitoring -l app=custom-metrics-adapter
```

Set up Prometheus monitoring for adapters.

```yaml
# ServiceMonitor for adapter metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: metrics-adapter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: custom-metrics-adapter
  endpoints:
  - port: metrics
    interval: 30s
```

## Best Practices

Choose specialized adapters when generic solutions don't provide sufficient integration. The overhead of maintaining a custom adapter should be justified by improved scaling accuracy.

Implement adapter redundancy with multiple replicas to ensure HPA continues functioning if an adapter pod fails.

Cache metric values appropriately to reduce load on source systems. Don't query external systems on every HPA evaluation cycle.

Include comprehensive error handling in custom adapters. HPA should gracefully handle adapter failures rather than stopping all scaling.

Monitor adapter performance and query latency. Slow metric retrieval delays scaling decisions and can cause HPA timeouts.

Document custom metrics thoroughly. Future operators need to understand what metrics mean, how they're calculated, and why they were chosen.

Version adapter APIs carefully. Changes to metric names or formats can break existing HPA configurations.

## Security Considerations

Use least-privilege credentials for adapter access to external systems. Grant only the permissions needed to query metrics.

Store credentials in Kubernetes secrets, never in ConfigMaps or code.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: adapter-credentials
type: Opaque
stringData:
  username: "metrics-reader"
  password: "secure-password"
  api-key: "api-key-value"
```

Implement RBAC for adapter service accounts.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: metrics-adapter
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: metrics-adapter-role
rules:
- apiGroups: [""]
  resources: ["pods", "nodes"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: metrics-adapter-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: metrics-adapter-role
subjects:
- kind: ServiceAccount
  name: metrics-adapter
  namespace: monitoring
```

## Troubleshooting

**Metrics not appearing**: Verify adapter pods are running and API service is registered correctly.

**HPA shows unknown**: Check adapter logs for query errors or authentication failures.

**Stale metrics**: Verify adapter caching configuration and source system responsiveness.

**High adapter resource usage**: Optimize query frequency and implement better caching.

## Conclusion

Workload-specific metrics adapters enable sophisticated HPA scaling based on metrics that truly represent your application's capacity. By using specialized adapters for databases, message queues, cloud services, or custom systems, you gain scaling signals that generic resource metrics can't provide. Whether using pre-built solutions like KEDA or implementing custom adapters, the key is choosing metrics that directly correlate with workload capacity and ensuring adapters are reliable, performant, and maintainable.
