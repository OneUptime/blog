# Why Dead Letter Handling Fails Inside Knative Sequences—and How to Fix Each Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Sequence, Dead Letter Sink, Retries, CloudEvents, Kubernetes

Description: Give every Knative Sequence step its own retry and dead letter policy, then distinguish delivery failures from successful responses that emit no reply event.

---

A Knative Sequence is not one HTTP call. The controller creates Channels and Subscriptions that wire a series of subscriber deliveries. Consequently, a dead letter policy at the Sequence ingress cannot automatically protect every internal hop.

Current Knative APIs make each Sequence step a `Destination` with its own optional `delivery` specification. Put retry and dead letter settings on every step whose failure you need to recover.

## Why an Upstream Dead Letter Sink Is Not Enough

Consider this topology:

```text
Broker -> Trigger -> Sequence -> validate -> enrich -> persist -> reply
```

The Trigger owns delivery from the Broker to the Sequence address. Once the Sequence ingress accepts the event, that Trigger delivery succeeded. If `enrich` later returns `503`, the Trigger's dead letter sink is not involved. The generated Subscription for the `enrich` step owns that failure.

Likewise, there is no top-level `spec.delivery` on a Sequence that automatically applies to all steps. The Eventing API explicitly gives each `SequenceStep` its own delivery options.

## Configure Every Step Explicitly

This example uses Kafka Channels between steps and a separate dead letter Service for each stage:

```yaml
apiVersion: flows.knative.dev/v1
kind: Sequence
metadata:
  name: order-pipeline
  namespace: production
spec:
  channelTemplate:
    apiVersion: messaging.knative.dev/v1beta1
    kind: KafkaChannel
    spec:
      numPartitions: 6
      replicationFactor: 3
  steps:
    - ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: validate-order
      delivery:
        retry: 4
        backoffPolicy: exponential
        backoffDelay: PT1S
        deadLetterSink:
          ref:
            apiVersion: serving.knative.dev/v1
            kind: Service
            name: validate-order-dead-letter
    - ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: enrich-order
      delivery:
        retry: 6
        backoffPolicy: exponential
        backoffDelay: PT2S
        deadLetterSink:
          ref:
            apiVersion: serving.knative.dev/v1
            kind: Service
            name: enrich-order-dead-letter
    - ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: persist-order
      delivery:
        retry: 8
        backoffPolicy: exponential
        backoffDelay: PT2S
        deadLetterSink:
          ref:
            apiVersion: serving.knative.dev/v1
            kind: Service
            name: persist-order-dead-letter
  reply:
    ref:
      apiVersion: eventing.knative.dev/v1
      kind: Broker
      name: orders
```

Install the Kafka Channel implementation before applying this manifest. Match `apiVersion` to the CRD installed by your Knative Kafka release. The referenced Knative Services and `orders` Broker must already exist, and `replicationFactor: 3` requires at least three Kafka brokers. If `channelTemplate` is omitted, Knative uses the namespace or cluster default Channel; do not allow that to resolve to an InMemoryChannel in production.

Separate dead letter destinations make ownership and replay position unambiguous. A shared dead letter store also works if it persists a required stage identifier and the intended next destination.

## A Step Must Return a CloudEvent to Continue

Sequence progression uses subscriber replies. A successful HTTP response that contains a valid reply CloudEvent feeds the next Channel. A `2xx` response with no CloudEvent headers and an empty body is a successful delivery with no output, so the Sequence stops at that step. A malformed non-empty response can instead be treated as a delivery failure by the Channel implementation.

That is not a delivery failure and will not activate the dead letter sink.

This distinction explains a common report: "`validate-order` returned `204`; `enrich-order` never ran; the dead letter sink is empty." Knative did exactly what the response said. If validation should continue the pipeline, return a valid CloudEvent in binary or structured content mode. If rejection is a business outcome, emit an explicit rejection event to an intentional destination instead of relying on dead lettering.

Also keep subscriber request handling synchronous enough to return the reply within the delivery timeout. Returning `202` and emitting an unrelated event later is a different asynchronous design, not a Sequence reply.

## Understand What Reaches the Dead Letter Sink

When a step delivery fails after any applicable retries, the dead letter sink receives the input event to that step's Subscription. This is also true if the subscriber succeeds but forwarding its reply fails: the dead letter event is the step input, not the reply CloudEvent. That input may not be the original event sent to the Sequence:

- `validate-order` sees the ingress event;
- `enrich-order` sees the CloudEvent returned by validation;
- `persist-order` sees the CloudEvent returned by enrichment.

Knative may add `knativeerrordest`, `knativeerrorcode`, and `knativeerrordata` extensions. Persist them when present, but do not depend on them because enhancement is Channel-implementation-dependent.

Dead lettering ends the normal path. Knative does not automatically resume at the next step after the dead letter endpoint later succeeds.

## Replay at the Correct Stage

Replaying every dead letter event to the Sequence ingress can repeat earlier side effects and change its meaning. Store enough information to choose the recovery target:

- Sequence name and generation;
- failed step index and logical stage name;
- original and current CloudEvent `(source, id)`;
- failed subscriber or reply destination URI;
- failure code and diagnostic body;
- number and time of replay attempts.

For a transient `enrich-order` failure, replay the stage input to the generated Channel or, preferably, to a stable recovery ingress designed to invoke enrichment and then continue. Do not build automation around generated child resource names; they are controller-owned implementation details. A dedicated recovery Broker with stage-specific Triggers is easier to version and authorize.

Every step must be idempotent. A timeout can occur after a step commits work but before its reply reaches Knative, producing a retry even though the first attempt succeeded.

## Inspect the Generated Resources

Sequence status exposes the child Channel and Subscription state in step order:

```bash
kubectl get sequence order-pipeline -n production -o yaml
kubectl describe sequence order-pipeline -n production
kubectl get channels,subscriptions -n production
```

Inspect:

- `status.conditions`;
- `status.channelStatuses`;
- `status.subscriptionStatuses`;
- the delivery spec rendered on each generated Subscription;
- the subscriber and reply URIs resolved for each step.

Use owner references to associate child resources with the Sequence:

```bash
kubectl get subscription -n production -o json | \
  jq -r '.items[] |
    select(any(.metadata.ownerReferences[]?;
      .kind == "Sequence" and .name == "order-pipeline")) |
    [.metadata.name, .spec.subscriber.ref.name,
     (.spec.delivery.deadLetterSink.ref.name // "-")] | @tsv'
```

Then correlate application and dispatcher logs with a known CloudEvent ID. Test one step at a time by making it return `503`, allowing its retry budget to exhaust, and proving that only that step's dead letter destination receives the current event.

## Guard the Final Reply

The Sequence `reply` is another event-delivery edge. If the reply is a Broker, add filters that prevent the output event from matching the Trigger that starts the same Sequence, or you can create an infinite loop. Change the CloudEvent `type` at a deliberate stage and route only that output type to downstream consumers.

Reliable Sequence failure handling is therefore per-hop: each step has its own delivery policy, each response intentionally emits or suppresses a reply event, and each dead letter record knows where recovery should restart.

## Official Documentation

- [Knative Sequence concepts and generated resources](https://knative.dev/docs/eventing/flows/sequence/)
- [Knative Eventing API reference for `SequenceStep.delivery`](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Subscriptions](https://knative.dev/docs/eventing/channels/subscriptions/)
- [Knative Channel types and defaults](https://knative.dev/docs/eventing/channels/channel-types-defaults/)
