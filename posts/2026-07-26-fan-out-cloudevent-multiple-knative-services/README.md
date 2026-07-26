# How to Fan Out One CloudEvent to Multiple Knative Services Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, CloudEvents, Broker, Trigger, Fan-Out, Reliability

Description: Fan out one CloudEvent through independent Knative Triggers while containing subscriber failures, retries, duplicates, and reply-event loops.

---

One event can match multiple Triggers on the same Broker. Each matching Trigger represents a separate delivery to its subscriber, so the producer publishes once and Knative performs the fan-out.

This is different from load balancing. Two matching Triggers mean both services should receive the event; they are not competing consumers for a single copy.

## Use One Trigger Per Subscriber

Assume a Kafka-backed Broker named `orders` already exists. These Triggers independently deliver the same event type to billing and analytics:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-created-billing
  namespace: production
spec:
  broker: orders
  filter:
    attributes:
      type: com.example.order.created.v1
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: billing
  delivery:
    retry: 5
    backoffPolicy: exponential
    backoffDelay: PT1S
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: billing-dead-letter
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-created-analytics
  namespace: production
spec:
  broker: orders
  filter:
    attributes:
      type: com.example.order.created.v1
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: analytics
  delivery:
    retry: 3
    backoffPolicy: exponential
    backoffDelay: PT2S
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: analytics-dead-letter
```

Trigger-level delivery policies let each team choose an appropriate retry budget and dead-letter destination. Verify support against the installed Broker implementation. Kafka Broker supports the documented delivery fields; an `MTChannelBasedBroker` inherits the capabilities of its backing Channel.

Check the resolved destinations before sending traffic:

```bash
kubectl get broker orders -n production
kubectl get trigger -n production
kubectl get trigger order-created-billing -n production \
  -o jsonpath='{.status.subscriberUri}{"\n"}'
kubectl get trigger order-created-analytics -n production \
  -o jsonpath='{.status.subscriberUri}{"\n"}'
```

Require `READY=True` for the Broker and both Triggers.

## Understand Failure Isolation

Fan-out delivery is independent, not atomic:

- billing can acknowledge while analytics is retrying
- one subscriber can reach its dead-letter sink while the other succeeds
- there is no distributed transaction that rolls back another subscriber's completed side effect
- at-least-once delivery means either subscriber may see a duplicate

Design each subscriber around that contract. Persist a unique key based on CloudEvents `source` plus `id` before performing a non-repeatable side effect. For an external payment or email API, pass a stable idempotency key derived from the same event identity.

Do not use a single shared database transaction as a substitute for independent subscriber idempotency. The services fail and recover on different schedules.

## Keep Slow Subscribers from Becoming a System-Wide Problem

A native Kafka Broker gives each Trigger its own consumer-group identity. Backlog for one Trigger can therefore grow without requiring the other Trigger to replay its successful work. You should still:

- monitor lag and failed delivery rate per Trigger
- set resource requests and concurrency for each Knative Service
- use a durable Broker for production; the default InMemoryChannel-backed Broker is for development
- keep dead-letter sinks available and durable
- size Kafka retention for the longest supported outage and recovery period

Retries are not a capacity plan. If a subscriber remains slower than the incoming rate, increase sustainable processing throughput or reduce work per event.

## Avoid Accidental Reply Fan-Out Loops

A Trigger subscriber is Callable. If it returns a CloudEvent in the HTTP response, the Broker can publish that reply back into the Broker. A reply that retains `type: com.example.order.created.v1` can match both original Triggers again and create a loop.

For terminal consumers, return an empty successful response:

```text
HTTP/1.1 204 No Content
```

For a deliberate derived event, assign a new event ID and a new type such as:

```text
com.example.billing.invoice.created.v1
```

Create separate Triggers for that type and alert on unexpectedly high reply rates.

## Test the Fan-Out Contract

Publish one event with a known identity:

```bash
BROKER_URL="$(kubectl get broker orders -n production \
  -o jsonpath='{.status.address.url}')"

kubectl run fanout-test -n production \
  --image=curlimages/curl:8.12.1 \
  --restart=Never --rm -it -- \
  curl --fail-with-body --include \
    -H 'content-type: application/json' \
    -H 'ce-specversion: 1.0' \
    -H 'ce-id: fanout-test-0001' \
    -H 'ce-source: https://tests.example.com/fanout' \
    -H 'ce-type: com.example.order.created.v1' \
    --data-binary '{"orderId":"fanout-0001"}' \
    "$BROKER_URL"
```

Then confirm exactly one logical result in each service's durable state, not merely one log line:

```bash
kubectl logs -n production \
  -l serving.knative.dev/service=billing \
  -c user-container --since=10m
kubectl logs -n production \
  -l serving.knative.dev/service=analytics \
  -c user-container --since=10m
```

Repeat the identical event intentionally. Both subscribers should recognize the duplicate without repeating their business side effects.

## Choose Parallel Flow Only When You Need Branch Processing

The `Parallel` flow resource is useful when each branch has a filter/subscriber pipeline and their reply events need a configured reply destination. Plain Broker fan-out is simpler when several independent services consume the same event type. Whichever API you choose, delivery remains independent and consumers still need duplicate-safe processing.

## Official Documentation

- [Knative Brokers](https://knative.dev/docs/eventing/brokers/)
- [Knative Triggers](https://knative.dev/docs/eventing/triggers/)
- [Knative delivery failure handling](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Kafka Broker](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative Parallel flows](https://knative.dev/docs/eventing/flows/parallel/)
- [Knative security threat model and at-least-once delivery](https://knative.dev/docs/reference/security/threat-model/)
