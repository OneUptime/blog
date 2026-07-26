# Knative Event Delivery Retries: Which HTTP Status Codes Trigger Redelivery?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, CloudEvents, HTTP, Retries, Dead Letter Sink, Kubernetes

Description: Understand which HTTP responses Knative retries, which responses stop redelivery, and how to make subscriber status codes express the right delivery outcome.

---

A Knative subscriber controls the outcome of an HTTP delivery with its response. A `2xx` response acknowledges the event. A non-`2xx` response fails the delivery, but **not every failure status is retried**.

After its HTTP client has completed any redirect handling, Knative Eventing's shared HTTP dispatcher currently retries:

- a missing HTTP response, such as a connection failure;
- an error returned by the HTTP client;
- every `5xx` status;
- `404 Not Found`;
- `408 Request Timeout`;
- `409 Conflict`;
- `429 Too Many Requests`.

It does not retry a final `1xx`, `2xx`, or `3xx` response, and it does not retry other final `4xx` responses such as `400`, `401`, `403`, `410`, `413`, or `422`. The dispatcher's Go HTTP client follows redirects by default, so a subscriber's `3xx` response is normally resolved before this classification runs. If a `3xx` remains the final response, the dispatcher treats it as a failed delivery but does not retry it. "Not retried" means the retry loop stops and the configured failure path, such as a dead letter sink, can run.

This classification is implementation code, not a CloudEvents protocol guarantee. Confirm it for the Eventing release and transport implementation installed in your cluster, especially if you use a third-party Channel.

## Read the Outcome Table Correctly

| Final result after HTTP redirect handling | Delivery outcome | Retried by the shared HTTP dispatcher? |
| --- | --- | --- |
| `200`-`299` | Acknowledged | No |
| `300`-`399` | Failed | No |
| `404`, `408`, `409`, `429` | Failed | Yes |
| Other `400`-`499` | Failed | No |
| `500`-`599` | Failed | Yes |
| DNS, connect, reset, or timeout error | Failed | Yes |

Do not use redirects as Knative event-routing configuration. Although the dispatcher's HTTP client follows redirects by default, that is HTTP client behavior rather than a Knative `Destination` policy. The response after redirect handling determines delivery success and retry eligibility; configure the Knative `Destination` to point at the intended endpoint.

Retries occur only when the relevant `Broker`, `Trigger`, `Subscription`, `Sequence` step, or other delivery-capable resource has a retry budget. With `retry: 0` or no supported delivery policy, a retryable response is still a failure, but there is no additional attempt.

## Choose Status Codes by Meaning

Return `2xx` only after the subscriber has durably accepted responsibility for the event. That can mean the business work is complete, or it can mean the event was committed to an internal durable queue or database for asynchronous processing.

Use a retryable status for a condition that another attempt may fix:

- `503 Service Unavailable` for a temporary dependency outage;
- `429 Too Many Requests` for overload or rate limiting;
- `500 Internal Server Error` for a transient unclassified server failure;
- `409 Conflict` only when repeating the request can plausibly resolve the conflict.

Use a non-retryable `4xx` for a permanent problem with this event:

- `400 Bad Request` for malformed application data;
- `401` or `403` for a request that will remain unauthorized;
- `422 Unprocessable Content` for a syntactically valid event that violates business validation.

Do not return `200 OK` merely to stop a retry storm unless the subscriber has placed the event somewhere operators can recover it. That turns an operational problem into silent event loss.

## Configure a Bounded Retry Policy

This Trigger allows four redeliveries after the initial attempt:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-created
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
      name: order-worker
  delivery:
    retry: 4
    backoffPolicy: exponential
    backoffDelay: PT1S
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: order-dead-letter
```

`retry` counts retries, not total attempts. Here the maximum is one initial attempt plus four retries. Exponential backoff based on `PT1S` spaces the attempts instead of immediately amplifying an outage.

The dead letter sink is used after delivery ultimately fails. It must also be reachable and return a `2xx` response after safely recording the failed event.

## Test the Contract Deliberately

Deploy a test subscriber that can return a selected status, then send one CloudEvent with a known `source` and `id`. For each case, record:

1. how many requests reached the subscriber;
2. the interval between requests;
3. whether the dead letter sink received the event;
4. the final delivery metrics and logs.

Useful cases are `202`, `302`, `400`, `404`, `409`, `429`, `500`, and `503`, plus a connection refusal. Keep the same `(source, id)` pair throughout one delivery experiment so duplicate attempts are easy to correlate.

Inspect configuration and readiness before interpreting results:

```bash
kubectl get trigger order-created -n production -o yaml
kubectl describe trigger order-created -n production
kubectl get ksvc order-worker order-dead-letter -n production
```

If a supposedly retryable result is delivered once, check that `spec.delivery.retry` survived admission and that the chosen Broker or Channel implementation supports the delivery fields. The Kafka Broker supports the Knative delivery options; a channel-based Broker inherits limitations from its backing Channel.

## Account for `Retry-After`

Knative has an alpha `delivery-retryafter` feature. When enabled and supported, `spec.delivery.retryAfterMax` allows a `429` or `503` response's `Retry-After` header to influence the delay. The sender caps the header-derived delay at `retryAfterMax`, then uses the larger of that value and its normal backoff.

Do not put `retryAfterMax` into production manifests until you have enabled the feature and verified implementation support. Without it, design around the configured `backoffPolicy` and `backoffDelay`.

## Design for Ambiguous Outcomes

A timeout does not prove that the subscriber failed before committing its work. It may have completed the transaction and lost the response, after which Knative retries. Every subscriber should therefore be idempotent, normally by storing the CloudEvent `(source, id)` identity with the business result in one transaction.

HTTP status codes decide whether another attempt is useful. They do not provide exactly-once processing.

## Official Documentation

- [Knative event delivery and retries](https://knative.dev/docs/eventing/event-delivery/)
- [Knative delivery `Retry-After` feature](https://knative.dev/docs/eventing/features/delivery-retryafter/)
- [Knative shared HTTP retry classification](https://github.com/knative/eventing/blob/main/pkg/kncloudevents/retries.go)
- [Knative shared HTTP dispatcher implementation](https://github.com/knative/eventing/blob/main/pkg/kncloudevents/event_dispatcher.go)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [CloudEvents HTTP protocol binding](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
