# How to Configure Exponential Backoff and a Dead Letter Sink in Knative Eventing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Retries, Dead Letter Sink, CloudEvents, Kubernetes, Reliability

Description: Configure bounded exponential retries and a recoverable dead letter path for Knative event delivery without creating retry storms or silent failures.

---

Knative delivery policy has four independent decisions: how many times to retry, how the delay grows, where an event goes after failure, and whether the chosen event transport implements those settings. A useful production policy sets all four deliberately.

The following Trigger requests up to five retries for subscriber failures that the transport considers retryable, with exponential backoff, then sends an event that still cannot be delivered to a dead letter Service. A non-retryable failure can go to the dead letter sink without using the full retry budget:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: payment-authorized
  namespace: production
spec:
  broker: payments
  filter:
    attributes:
      type: com.example.payment.authorized.v1
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: fulfillment
  delivery:
    retry: 5
    backoffPolicy: exponential
    backoffDelay: PT1S
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: payment-dead-letter
```

Apply the dead letter Service before the Trigger so the destination can resolve:

```bash
kubectl apply -f payment-dead-letter.yaml
kubectl apply -f payment-trigger.yaml

kubectl get ksvc payment-dead-letter -n production
kubectl get trigger payment-authorized -n production
kubectl describe trigger payment-authorized -n production
```

Do not send production traffic until both resources report `Ready=True`.

## Understand Every Delivery Field

`retry: 5` requests up to five retry attempts after the initial delivery for a retryable failure, not five total attempts. The normal maximum is therefore six delivery attempts.

`backoffPolicy: exponential` makes the delay grow as the retry number increases. With `backoffDelay: PT1S`, the API describes a delay based on:

```text
backoffDelay × 2^numberOfRetries
```

`PT1S` is an ISO 8601 duration representing one second. Use values such as `PT0.5S`, `PT2S`, or `PT1M`; do not use Kubernetes duration spelling such as `1s` in this field.

Treat the mathematical schedule as a configuration model, not a wall-clock promise. Request duration, scheduling, implementation details, and contention affect observed timestamps.

`deadLetterSink` is a Knative `Destination`. A `ref` should identify an Addressable resource such as a Knative Service, Broker, Channel, or another supported sink. A `uri` can supplement the reference with a path.

## Put the Policy on the Correct Hop

A delivery policy belongs to the resource making a particular delivery:

- a Trigger policy covers Broker-to-subscriber delivery;
- a Subscription policy covers Channel-to-subscriber delivery;
- a Sequence step policy covers that individual step;
- a Broker-level policy supplies defaults for supported Broker deliveries.

Do not assume a policy on a source or an upstream Trigger automatically governs every downstream hop. For a multi-step topology, draw each HTTP delivery edge and decide which resource owns its retries and dead letter sink.

A Trigger-level delivery spec overrides the Broker-level delivery spec for that Trigger; it is not a field-by-field merge with the Broker defaults. Use the rendered manifests to confirm which spec is configured:

```bash
kubectl get broker payments -n production -o yaml
kubectl get trigger payment-authorized -n production -o yaml
```

## Build a Dead Letter Sink for Recovery

A dead letter sink should durably persist at least:

- CloudEvent `specversion`, `source`, `id`, and `type`;
- the event data and content type;
- the time it entered the dead letter path;
- the intended destination and failure information when available;
- replay state, attempts, and operator notes.

Knative may add `knativeerrordest`, `knativeerrorcode`, and `knativeerrordata` extension attributes when it forwards a failed event. Those extensions are implementation-dependent. Make them useful diagnostic fields, but never reject an event because one is absent.

Return `2xx` from the dead letter endpoint only after durable storage succeeds. If the endpoint returns a failure, Knative can retry delivery to it under the same retry configuration, but once that path is exhausted the dispatcher has nowhere else to put the event. Alert on dead letter delivery failures.

Avoid pointing the dead letter sink back to a Broker with an unguarded Trigger that matches the same event. That can create a routing loop. If a Broker is your dead letter destination, add an explicit failure type or extension and filters that cannot rematch the normal route.

## Choose a Retry Budget from the Outage You Can Tolerate

More retries are not automatically safer. They increase duplicate exposure and hold work in the delivery path longer. Estimate:

```text
maximum recovery window ≈ request time across attempts + all backoff delays
```

Then align the budget with:

- the normal duration of subscriber restarts;
- downstream rate limits;
- the Broker or Channel retention behavior;
- the time by which an operator must see a dead letter;
- subscriber concurrency and backlog growth.

For a long dependency outage, a durable dead letter record plus controlled replay is usually easier to operate than hundreds of inline attempts.

## Verify the Failure Path Before Launch

Make the subscriber return `503 Service Unavailable` for one known CloudEvent. Record the `source` and `id`, and then verify:

1. the initial request plus the configured retry attempts arrive;
2. delays grow rather than forming a tight loop;
3. the dead letter sink receives one final handoff;
4. the dead letter sink acknowledges only after persistence;
5. replaying the record does not duplicate business state.

Inspect the resource status and application logs:

```bash
kubectl describe trigger payment-authorized -n production
kubectl logs -n production \
  -l serving.knative.dev/service=fulfillment \
  -c user-container --since=15m
kubectl logs -n production \
  -l serving.knative.dev/service=payment-dead-letter \
  -c user-container --since=15m
```

Label selectors and data-plane component names differ between Broker implementations. Use `kubectl get pods -A` and the resource status to identify the actual dispatcher before reading its logs.

Finally, test a non-retryable `400 Bad Request`, a retryable `503 Service Unavailable`, and a network timeout. They exercise different branches of Knative's shared HTTP sender; verify response classification separately for transports that do not use it.

## Optional `Retry-After` Support

Knative's alpha `delivery-retryafter` feature can let `429` and `503` responses influence the delay through `Retry-After`. While the feature is alpha, the feature gate must be enabled, retries must be configured, and a positive ISO 8601 `retryAfterMax` must be set to opt in. That field caps the header-derived duration, not the normal backoff; Knative uses the larger of the normal backoff and the capped `Retry-After` duration. Support is implementation-dependent, so verify the feature gate and your transport before relying on it.

Exponential backoff protects a temporarily unhealthy subscriber. A durable dead letter sink protects the events that outlive that retry budget. Production systems need both, plus idempotent subscribers, monitoring, and a rehearsed replay procedure.

## Official Documentation

- [Knative event delivery configuration](https://knative.dev/docs/eventing/event-delivery/)
- [Knative delivery `Retry-After` feature](https://knative.dev/docs/eventing/features/delivery-retryafter/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative sinks and destinations](https://knative.dev/docs/eventing/sinks/)
- [CloudEvents 1.0 core specification](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)
