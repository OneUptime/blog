# How to Respond to Dapr Pub/Sub Broker Connection Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Troubleshooting, Kafka, Incident Response

Description: Diagnose and resolve Dapr pub/sub broker connection failures by verifying broker health, component configuration, subscription CRDs, and applying resiliency policies.

---

## Identifying Pub/Sub Broker Connection Failures

When a Dapr pub/sub component cannot connect to its broker, publish calls return errors and subscriptions stop receiving messages:

```bash
kubectl logs my-pod -c daprd | grep -i "pubsub\|broker\|kafka\|connect"
# failed to initialize component pubsub: dial tcp kafka-broker:9092: connect: connection refused
# error publishing to topic orders: EOF
```

Subscribers will also stop receiving messages silently if the broker is unreachable.

## Step 1 - Verify the Broker is Available

Check that the message broker is running and healthy:

```bash
# For Kafka on Kubernetes
kubectl get pods -l app=kafka -n messaging
kubectl exec -it kafka-0 -n messaging -- kafka-topics.sh \
  --bootstrap-server localhost:9092 --list
```

For RabbitMQ:

```bash
kubectl exec -it rabbitmq-0 -n messaging -- rabbitmqctl status
```

## Step 2 - Check the Component Configuration

Inspect the pub/sub component for misconfigured broker addresses:

```bash
kubectl describe component pubsub -n my-namespace
```

A correct Kafka component looks like:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: my-namespace
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-broker.messaging.svc.cluster.local:9092"
  - name: consumerGroup
    value: "orders-consumer-group"
  - name: authType
    value: "none"
```

## Step 3 - Validate Network Connectivity

Test that the Dapr sidecar can reach the broker:

```bash
kubectl run -it --rm nettest --image=busybox --restart=Never -- \
  sh -c "nc -zv kafka-broker.messaging.svc.cluster.local 9092"
```

If the connection fails, check NetworkPolicy rules and service definitions:

```bash
kubectl get svc kafka-broker -n messaging
kubectl get networkpolicy -n my-namespace
```

## Step 4 - Check Subscription Configuration

Subscription failures may also cause messages to pile up. Verify subscriptions:

```bash
kubectl get subscription -n my-namespace
kubectl describe subscription orders-sub -n my-namespace
```

## Step 5 - Add Resiliency Policies for the Broker

Configure automatic retries for pub/sub operations:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: pubsub-resiliency
  namespace: my-namespace
spec:
  policies:
    retries:
      pubsubRetry:
        policy: exponential
        duration: 2s
        maxInterval: 30s
        maxRetries: 10
    circuitBreakers:
      pubsubCB:
        maxRequests: 1
        interval: 60s
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    components:
      pubsub:
        outbound:
          retry: pubsubRetry
          circuitBreaker: pubsubCB
```

## Step 6 - Handle Dead Letter Topics

For messages that fail after all retries, configure a dead letter topic:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-sub
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders/process
  deadLetterTopic: orders-deadletter
```

Monitor the dead letter topic to assess the scope of failures.

## Summary

Dapr pub/sub broker connection failures require verifying broker health, component configuration accuracy, and network reachability. Apply resiliency policies to handle transient broker unavailability with retries and circuit breakers, and configure dead letter topics to capture messages that cannot be delivered, preventing data loss during extended outages.
