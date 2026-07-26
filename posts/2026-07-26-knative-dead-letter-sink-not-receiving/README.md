# Knative Dead Letter Sink Is Not Receiving Failed Events: What to Check

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Dead Letter Sink, Troubleshooting, Retries, CloudEvent, Kubernetes

Description: Trace a failed Knative event from its delivery owner to the dead letter endpoint and find why the expected handoff never arrives.

---

A dead letter sink is the last branch of a specific Knative delivery operation. It is not a cluster-wide error collector. When it receives nothing, first identify the exact hop that failed and the resource responsible for that hop.

For example, a dead letter sink on a Trigger covers delivery from that Trigger to its subscriber. It does not cover the source-to-Broker request, another Trigger, or every internal step of a Sequence.

## 1. Confirm the Event Reached This Delivery Hop

Start with the routing object and its filter:

```bash
kubectl get broker orders -n production
kubectl get trigger order-created -n production -o yaml
kubectl describe trigger order-created -n production
```

Check that:

- the Broker and Trigger report `Ready=True`;
- `spec.broker`, or `spec.brokerRef` when cross-namespace event links are enabled, identifies the Broker that received the event;
- the filter matches the event's exact CloudEvent attributes;
- the subscriber reference resolves to the endpoint you tested;
- the delivery policy appears under this Trigger's `spec.delivery`, or under the Broker's `spec.delivery` if the Trigger has no delivery override.

A Trigger filter mismatch is not a delivery failure. It means the Trigger never selected the event, so its dead letter sink has nothing to receive.

## 2. Prove the Subscriber Actually Failed

An empty `2xx` subscriber response acknowledges delivery. An application that logs an error but returns an empty `200` or `204` has told Knative that delivery succeeded. A malformed non-empty response can still fail if the data plane tries to parse it as a reply event.

Correlate requests with the CloudEvent `source` and `id`, and record the HTTP result:

```bash
kubectl logs -n production \
  -l serving.knative.dev/service=order-worker \
  -c user-container --since=15m --tail=-1
```

Test with a deterministic response such as `503 Service Unavailable`. Do not use a random application exception, because a framework-level error handler may translate it into `200`, close the connection, or replace the status.

Also distinguish subscriber failure from a reply event. A valid CloudEvent returned with `200 OK` on a reply-capable path is a reply, not a failed delivery.

## 3. Wait for the Retry Budget to Finish

The dead letter handoff occurs after delivery has ultimately failed. With this policy:

```yaml
delivery:
  retry: 5
  backoffPolicy: exponential
  backoffDelay: PT2S
  deadLetterSink:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-dead-letter
```

there is one initial delivery and five retries. Request execution time and backoff mean the dead letter event may arrive much later than the first failure.

Knative's shared HTTP sender retries connection errors, every `5xx`, and selected `4xx` statuses (`404`, `408`, `409`, and `429`). Most other `4xx` responses stop the retry loop immediately. Both branches can lead to a dead letter handoff, but they do so on different timelines.

## 4. Inspect the Resolved Dead Letter Destination

Read both spec and status:

```bash
kubectl get trigger order-created -n production \
  -o jsonpath='{.spec.delivery.deadLetterSink}{"\n"}'
kubectl get broker orders -n production \
  -o jsonpath='{.spec.delivery.deadLetterSink}{"\n"}'
kubectl get trigger order-created -n production -o yaml
kubectl get ksvc order-dead-letter -n production
```

Look for the Trigger's ready condition and resolved dead letter sink URI in status, then check the destination's readiness. If the URI is missing or the endpoint is not ready, common causes are:

- misspelled `apiVersion`, `kind`, or `name`;
- a `ref.namespace` that differs from the Trigger's namespace;
- an Addressable resource that has not published an address;
- a Knative Service whose latest Revision is not ready;
- an admission or authorization policy blocking the reference.

Omitting `namespace` defaults a `Destination` reference to the namespace of the object that contains it. A Trigger's `Destination` object references must use that namespace; cross-namespace event links apply to its Broker reference, not to its subscriber or dead letter sink. Do not assume it finds a similarly named Service elsewhere.

## 5. Check Transport Support

Delivery fields are implemented by the data plane. The native Kafka Broker supports `deadLetterSink`, `retry`, `backoffPolicy`, and `backoffDelay`. An `MTChannelBasedBroker` depends on its backing Channel. Knative's InMemory and Kafka Channels support those core fields, while some other Channel implementations do not.

Find the Broker class and backing configuration:

```bash
kubectl get broker orders -n production \
  -o jsonpath='{.metadata.annotations.eventing\.knative\.dev/broker\.class}{"\n"}'
kubectl get broker orders -n production -o yaml
```

If you use an extension or vendor transport, verify its own release documentation. A valid API field does not prove that a particular data plane enforces it.

## 6. Test the Dead Letter Endpoint Directly

Read the resolved URI from status, then send a valid CloudEvent to it from inside the cluster. A direct request separates endpoint problems from failure-routing problems:

```bash
DLQ_URL="http://order-dead-letter.production.svc.cluster.local"

curl --fail-with-body --include \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Ce-Specversion: 1.0' \
  --header 'Ce-Id: dlq-probe-1' \
  --header 'Ce-Source: https://diagnostics.example.com' \
  --header 'Ce-Type: com.example.dlq.probe.v1' \
  --data-binary '{"probe":true}' \
  "$DLQ_URL"
```

Run that command from a diagnostic Pod. The endpoint must be reachable through cluster DNS, accept the event format, and return `2xx` only after durable storage.

Check NetworkPolicies, service-mesh authorization, TLS trust, OIDC requirements, DNS, endpoints, and readiness. A dead letter Service scaled to zero should be reachable through Knative Serving, but a broken Revision, startup timeout, or policy denial can still fail the handoff.

## 7. Look at the Correct Data-Plane Logs and Metrics

Controller logs explain reconciliation and destination resolution. Delivery failures occur in the Broker or Channel data plane, so controller logs alone are insufficient.

List the installed components before choosing a log target:

```bash
kubectl get pods -n knative-eventing
kubectl get pods -A | grep -E 'broker|dispatcher|channel|kafka'
```

Then search dispatcher logs for the subscriber URL, dead letter URL, CloudEvent ID, final response code, or text such as `dead letter`. Names and labels differ by implementation and installation mode.

Monitor the delivery metrics exposed by your Eventing implementation, plus application-side attempt and dead letter counts. An increase in failed or retried events without a matching dead letter write is an alert condition.

## 8. Do Not Require Optional Error Extensions

Supported Channel implementations may add:

- `knativeerrordest`;
- `knativeerrorcode`;
- `knativeerrordata`.

The data field can be empty or truncated. Enhancement is implementation-dependent, so a receiver that rejects events without these attributes can make the dead letter path fail. Persist the original CloudEvent even when diagnostic extensions are incomplete.

## Run One Controlled End-to-End Test

Use a unique `(source, id)` pair and make the subscriber always return `503`. The test passes only when you can show:

1. the Trigger selected the event;
2. the configured attempts reached the subscriber;
3. the final failed event reached the resolved dead letter endpoint;
4. the endpoint durably stored it and returned `2xx`;
5. the record can be replayed idempotently.

That evidence usually identifies whether the missing event is a routing, retry-timing, destination-resolution, transport-support, or dead letter application problem.

## Official Documentation

- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative Broker types](https://knative.dev/docs/eventing/brokers/)
- [Knative sinks and destinations](https://knative.dev/docs/eventing/sinks/)
- [Knative Eventing metrics reference](https://knative.dev/docs/eventing/observability/metrics/eventing-metrics/)
