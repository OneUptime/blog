# What Happens to a Knative Trigger Subscriber’s Reply Event?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Trigger, Broker, CloudEvents, Reply Event, Event Routing

Description: Follow a subscriber response CloudEvent back into a Knative Broker, distinguish acknowledgements from replies, and prevent routing loops and duplicate side effects.

---

When a Knative Trigger subscriber returns a valid CloudEvent in a successful HTTP response, Knative treats it as a **reply event** and republishes it to the Broker associated with the Trigger. The Broker then evaluates that new event against its Triggers like any other ingress event.

It is not returned synchronously to the producer that originally posted to the Broker. Broker ingress acknowledgement and subscriber reply routing are separate operations.

## The Four Response Cases

| Subscriber response | Knative result |
| --- | --- |
| `2xx` with no body | Original delivery succeeds; no reply event |
| `2xx` with a non-CloudEvent body | Original delivery succeeds; body is not routed as an event |
| `2xx` with a valid binary- or structured-mode CloudEvent | Original delivery succeeds and the reply is sent back to the Broker |
| Non-`2xx` or transport error | Original delivery fails; retry/dead letter policy applies |

A JSON document is not automatically a structured CloudEvent. It needs `Content-Type: application/cloudevents+json` and all required attributes. A binary-mode reply needs the required `ce-*` response headers.

## Return a Valid Reply Event

A structured response can look like:

```http
HTTP/1.1 200 OK
Content-Type: application/cloudevents+json

{
  "specversion": "1.0",
  "id": "validation-1042-1",
  "source": "https://validator.example.com",
  "type": "com.example.order.validated.v1",
  "subject": "orders/1042",
  "correlationid": "order-request-1042-1",
  "data": {
    "orderId": "1042",
    "valid": true
  }
}
```

The reply is a new event occurrence. Give it an appropriate `source`, a unique `id` within that source, and a type that describes the output. Carry causation or correlation in an extension or data field instead of reusing the input identity.

If the subscriber should only acknowledge work, return `204 No Content` or another empty `2xx`.

## Route the Reply with Another Trigger

Use narrow, disjoint event types:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: validate-order
  namespace: production
spec:
  broker: orders
  filter:
    attributes:
      type: com.example.order.requested.v1
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-validator
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: persist-validated-order
  namespace: production
spec:
  broker: orders
  filter:
    attributes:
      type: com.example.order.validated.v1
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: validated-order-writer
```

The returned `com.example.order.validated.v1` event re-enters `orders` and matches the second Trigger. It can match several Triggers, so reply processing can fan out.

Trigger does not have a user-selected `reply` destination like a Subscription. Its built-in reply destination is the Broker. To reach a specific service, route the reply through a filtered Trigger, or have the application publish through a durable outbox and return an empty acknowledgement.

## Prevent an Infinite Reply Loop

An unfiltered Trigger, or a subscriber that returns the same type it consumes, can invoke itself repeatedly:

```text
Broker -> Trigger -> subscriber -> reply Broker -> same Trigger -> ...
```

Knative's EventTransform documentation explicitly warns about this loop. Prevent it structurally:

- filter the input Trigger on an exact type;
- emit a distinct output type;
- add source or stage filters when useful;
- test that no output can rematch its producing Trigger;
- set monitoring for unexpected event-rate amplification.

Do not rely on an in-memory counter or a maximum-hop field added by one service. Every producer and transform should make its routing transition explicit.

## Reply Forwarding Can Also Fail

There are two delivery operations:

```text
1. Trigger dispatcher -> subscriber
2. subscriber response event -> Broker reply URL
```

The current shared Knative dispatcher applies its retry configuration when forwarding the reply. If the subscriber returns a valid event but republishing it fails, the overall dispatch can fail and the subscriber may receive the original event again.

That creates an important ambiguous window:

1. the subscriber commits its business work;
2. it returns a reply CloudEvent;
3. Knative cannot forward the reply;
4. Knative retries the original subscriber request.

The subscriber must deduplicate the input `(source, id)`, and it must produce a deterministic durable output event through the same transaction or outbox. Re-running the handler should not create a second business mutation or a second logical reply.

When a dead letter sink is configured, failed reply forwarding can send the original input event to that sink with Knative error extensions. `knativeerrordest` can identify the reply URL that failed. Do not assume the dead letter payload is the reply CloudEvent; inspect the attributes and store both the input identity and diagnostic destination.

## A Reply Is Not Request-Response RPC

The original publisher normally receives an ingress response such as `202 Accepted` after the Broker accepts its event. It does not wait for all matching subscribers or receive their reply bodies.

If a client needs a business response:

- give the request a correlation attribute;
- publish the request;
- consume a matching result event asynchronously; or
- use a purpose-built synchronous API.

Knative also has an experimental `RequestReply` API in current Eventing references, but its lifecycle and suitability must be evaluated against the installed release. Do not infer synchronous RPC behavior from ordinary Broker and Trigger replies.

## Preserve the CloudEvent Correctly

The response must follow the CloudEvents HTTP binding:

For binary mode:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Ce-Specversion: 1.0
Ce-Id: validation-1042-1
Ce-Source: https://validator.example.com
Ce-Type: com.example.order.validated.v1

{"orderId":"1042","valid":true}
```

For structured mode, use one JSON CloudEvent envelope and `application/cloudevents+json`. Do not mix a structured envelope with unrelated `ce-*` headers.

A successful response whose headers do not identify any CloudEvent encoding—such as ordinary JSON without the CloudEvents HTTP binding—is treated as a non-event response body and discarded from the reply path. That is different from a response that declares binary or structured CloudEvent encoding but is malformed: creating or forwarding the reply can fail, causing the overall dispatch to fail and potentially retry the original subscriber delivery. Validate reply construction in the subscriber's CloudEvents SDK and test against the Broker data plane.

## Observe Both Event Identities

Log and trace:

- input `source`, `id`, and `type`;
- output `source`, `id`, and `type`;
- correlation or causation identifier;
- subscriber attempt;
- subscriber response status;
- reply-forwarding result;
- downstream Trigger and subscriber.

Test the empty `204`, arbitrary JSON `200`, valid CloudEvent `200`, subscriber `503`, and Broker reply failure paths. Also deliberately return an event that would rematch the input filter in a non-production environment and confirm your policy or test catches the loop.

The clean mental model is: a subscriber response CloudEvent is a new asynchronous Broker event, and both the subscriber call and reply forwarding are at-least-once failure boundaries.

## Official Documentation

- [Knative Eventing overview and response events](https://knative.dev/docs/eventing/)
- [Knative EventTransform built-in Broker reply feature](https://knative.dev/docs/eventing/transforms/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative handling delivery failure and reply destinations](https://knative.dev/docs/eventing/event-delivery/)
- [Knative shared event dispatcher implementation](https://github.com/knative/eventing/blob/main/pkg/kncloudevents/event_dispatcher.go)
- [CloudEvents HTTP protocol binding](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
