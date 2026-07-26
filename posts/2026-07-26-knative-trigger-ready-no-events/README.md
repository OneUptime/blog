# Trigger Is Ready but No Events Arrive: A Knative Eventing Debugging Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Trigger, CloudEvent, Troubleshooting, Kubernetes, Event Delivery

Description: Trace a missing Knative event from producer through Broker ingress, Trigger filtering, dispatcher delivery, and subscriber acknowledgement.

---

`Ready=True` on a Knative Trigger means the control plane resolved its Broker and subscriber and registered the desired route. It does not prove that:

- the producer sent an event to that Broker;
- the event was a valid CloudEvent;
- the Trigger filter matched;
- the Broker data plane attempted delivery;
- the subscriber was reachable or returned success.

Debug the event in travel order. Use one unique CloudEvents `id` and a narrow time window so logs and metrics describe the same attempt.

## Record the Exact Route

Capture the two control-plane objects and the Trigger description before changing anything:

```bash
namespace=production
broker_namespace=production
broker=commerce
trigger=order-created

kubectl -n "$broker_namespace" get broker "$broker" -o yaml
kubectl -n "$namespace" get trigger "$trigger" -o yaml
kubectl -n "$namespace" describe trigger "$trigger"
```

Set `broker_namespace` to `spec.brokerRef.namespace` when using a cross-namespace Broker.

Verify:

- the Broker and Trigger are in the intended namespaces;
- `spec.broker` names the intended same-namespace Broker, or the feature-gated `brokerRef` correctly references a cross-namespace Broker;
- Broker and Trigger both report `Ready=True`;
- `status.observedGeneration` matches `metadata.generation`;
- `status.subscriberUri` is the expected resolved target;
- `status.address.url` exists on the Broker;
- the Trigger has the filter actually deployed, not just the local file.

Extract the key values:

```bash
kubectl -n "$broker_namespace" get broker "$broker" \
  -o jsonpath='{.status.address.url}{"\n"}'

kubectl -n "$namespace" get trigger "$trigger" \
  -o jsonpath='{.status.subscriberUri}{"\n"}'
```

If the Trigger is Ready but the resolved URI points to the wrong Service, fix the subscriber reference. Do not continue debugging the intended Service while the data plane is calling another address.

## Confirm the Producer Targets This Broker

For a Knative Source, inspect both its desired sink and resolved sink URI:

```bash
kubectl -n "$namespace" get sources -o yaml
```

The `sources` resource category expands to the Source kinds installed in the cluster. Confirm the relevant Source's conditions are current and Ready, then compare its resolved sink with the Broker address.

For an application producer, inspect its deployed configuration, not a workstation environment file. Common mistakes include:

- sending to a Broker with the same name in another namespace;
- retaining an old Broker URL after migration;
- using a cluster-local URL from outside the cluster;
- a proxy stripping `ce-*` headers;
- treating an HTTP retry as proof that the Broker accepted the request.

Check producer logs for the destination, CloudEvents `id`, response status, and response body. A log line saying "published" before the HTTP request completes is not evidence of acceptance.

## Send a Known CloudEvent Directly

Test from a temporary pod in the producer's namespace:

```bash
broker_url=$(kubectl -n "$broker_namespace" get broker "$broker" \
  -o jsonpath='{.status.address.url}')

kubectl -n "$namespace" run event-probe \
  --image=curlimages/curl:8.12.1 \
  --restart=Never --rm -i -- \
  curl -v -X POST "$broker_url" \
    -H 'Ce-Specversion: 1.0' \
    -H 'Ce-Id: debug-order-20260726-001' \
    -H 'Ce-Source: urn:debug:orders' \
    -H 'Ce-Type: com.example.order.created' \
    -H 'Ce-Region: eu-west' \
    -H 'Content-Type: application/json' \
    --data '{"orderId":"debug-001"}'
```

Use an approved image in restricted clusters. If NetworkPolicy or mesh policy depends on pod labels or service accounts, give the probe equivalent labels and identity; a pod created by `kubectl run` does not inherit them. The request above is a binary-mode CloudEvent: context attributes are HTTP headers and `data` is the JSON body.

Interpret the result precisely:

- DNS or connection error: Broker Service, cluster DNS, NetworkPolicy, or mesh routing.
- `4xx`: malformed CloudEvent, authorization, policy, or wrong ingress.
- `5xx`: Broker receiver, backing route, or a downstream delivery failure surfaced synchronously by the implementation.
- `2xx`: ingress accepted the event; continue through filtering and delivery.

Do not treat a `2xx` response as a portable end-to-end acknowledgement from the Trigger subscriber. A Broker implementation may acknowledge after enqueueing the event or after synchronous downstream delivery.

## Compare the Filter with the Event Envelope

Read the deployed Trigger:

```bash
kubectl -n "$namespace" get trigger "$trigger" \
  -o jsonpath='{.spec.filter}{"\n"}{.spec.filters}{"\n"}'
```

For a legacy attributes filter:

```yaml
spec:
  broker: commerce
  filter:
    attributes:
      type: com.example.order.created
      region: eu-west
```

Both values must match CloudEvents context attributes or extensions. The filter cannot see `data.region`. Matching is exact, including case. `com.example.order.Created` does not match `com.example.order.created`.

If both `spec.filter` and `spec.filters` are present, the newer `filters` array overrides the legacy filter. Multiple entries in `filters` are combined as logical AND, so every entry must evaluate to true.

The newer filter dialects are currently supported by the Apache Kafka Broker and MTChannelBasedBroker. For other Broker implementations, use the legacy attributes filter unless that implementation documents support.

To observe the actual envelope, route a copy to a controlled event-display or logging sink using a temporary catch-all Trigger in a non-production Broker or an approved diagnostic namespace. Do not log sensitive event bodies. Compare `specversion`, `id`, `source`, `type`, `subject`, and extensions with the filter.

If a catch-all Trigger receives the probe, Broker ingress works. If the filtered Trigger still does not deliver it, compare the filter first, then confirm that Trigger's registration and delivery path.

## Verify Trigger Registration in the Implementation

The generic Trigger can be Ready while an implementation is restarting or its data-plane state is stale. Inspect:

```bash
kubectl -n knative-eventing get deployment,pod
kubectl -n knative-eventing get events \
  --sort-by=.metadata.creationTimestamp
kubectl -n knative-eventing logs -l app=eventing-controller \
  --since=30m --tail=-1 --all-containers=true
```

Then inspect receiver, filter, dispatcher, and Broker-specific controller logs for the selected Broker class. Discover deployments from the installed manifests and Broker documentation; KafkaBroker and MTChannelBasedBroker do not use identical components or labels.

Search by:

- Broker namespace and name;
- Trigger namespace, name, and UID;
- CloudEvents `id`;
- subscriber URI;
- the test request timestamp.

Confirm the Trigger's current generation has propagated after any edit. Restarting all Eventing pods before collecting evidence can erase the transient error and cause avoidable delivery disruption.

## Test Subscriber Reachability

First inspect the resolved object:

```bash
kubectl -n "$namespace" get service,endpointslices
kubectl -n "$namespace" get kservice
kubectl -n "$namespace" get pod
```

For a Knative Service subscriber, check its Ready condition and Revision pods. For a Kubernetes Service, verify selectors actually select Ready endpoints and that `targetPort` matches the container.

From a pod in the Eventing data plane's network context, test the resolved subscriber URI if policy permits. Send a valid CloudEvent and watch subscriber logs. A plain `GET` health check does not exercise the POST handler, content type, body size, authentication, or CloudEvents parser.

Common delivery failures include:

- subscriber has no Ready endpoints;
- NetworkPolicy allows the producer but not Eventing namespaces;
- service mesh requires an identity or audience the dispatcher does not have;
- TLS certificate or CA configuration is wrong;
- subscriber route expects a different path;
- request body exceeds a proxy limit;
- handler returns `404`, `401`, `429`, or `5xx`;
- handler takes longer than the delivery timeout.

Return a documented success response only after the handler has durably accepted the event. Returning success and then dropping an in-memory task will look healthy to Knative.

## Inspect Retry and Dead-Letter Behavior

A subscriber failure may move the event into retries or a dead-letter sink rather than make it visible in the primary subscriber.

Inspect the effective delivery configuration:

```bash
kubectl -n "$namespace" get trigger "$trigger" -o yaml
kubectl -n "$broker_namespace" get broker "$broker" -o yaml
```

Per-Trigger delivery settings override Broker delivery settings where documented. Check retry count, backoff policy, delay, timeout features enabled in the installed version, and dead-letter sink readiness.

Correlate repeated attempts by the same CloudEvents `id`. Expect duplicate delivery in failure and timeout scenarios; subscribers should be idempotent.

## Use Metrics to Locate the Gap

Knative Eventing can export implementation-specific ingress, dispatch, retry, and latency metrics. After confirming that metric export and collection are working, compare counters over the probe window:

1. Did the source or producer send?
2. Did Broker ingress receive and accept?
3. Did filtering select the Trigger?
4. Did dispatch attempt the subscriber?
5. What HTTP response and latency did delivery record?
6. Was a retry or dead-letter attempt made?

A flat ingress counter points upstream. Ingress rising without dispatch suggests filter or routing state. Dispatch rising with subscriber errors points downstream. Use the metric names and labels documented for the installed Knative release because they can evolve.

## Minimal Isolation Sequence

Use these tests in order:

1. Send a unique event directly to the real Broker.
2. Confirm a catch-all diagnostic Trigger can receive it.
3. Compare the event envelope with the production filter.
4. Send an equivalent event with a second unique `id` directly to the resolved subscriber so deduplication does not hide the probe.
5. Correlate Broker data-plane and subscriber logs by event ID.
6. Exercise a deliberate subscriber failure and confirm retry or dead-letter behavior.

Together, these tests isolate the path layer by layer and make the first failing edge clear.

## Official Documentation

- [Knative Triggers](https://knative.dev/docs/eventing/triggers/)
- [Knative Brokers](https://knative.dev/docs/eventing/brokers/)
- [Knative Eventing API](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative Eventing troubleshooting](https://knative.dev/docs/eventing/troubleshooting/)
- [Knative Eventing metrics](https://knative.dev/docs/eventing/observability/metrics/eventing-metrics/)
- [Knative Eventing logs](https://knative.dev/docs/eventing/observability/logging/collecting-logs/)
