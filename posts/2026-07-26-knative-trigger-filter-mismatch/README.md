# Why Doesn’t My Knative Trigger Filter Match the CloudEvent?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Trigger Filters, CloudEvents, CESQL, KafkaBroker, Troubleshooting

Description: Fix Knative Trigger filter mismatches by inspecting the real CloudEvent envelope, filter API, case, composition, and Broker support.

---

Knative Trigger filters evaluate CloudEvents context attributes and extensions. They do not inspect the CloudEvent `data` field.

That distinction explains many silent mismatches. A Trigger can be `Ready=True`, a Broker can accept the event, and no delivery is attempted because filtering correctly evaluates to false.

Debug the deployed filter and one captured event envelope side by side. Do not compare the filter with the producer's application object before CloudEvents encoding.

## Start with the Actual Deployed Trigger

Retrieve the server-side object:

```bash
namespace=production
trigger=order-created

kubectl -n "$namespace" get trigger "$trigger" -o yaml
kubectl -n "$namespace" get trigger "$trigger" \
  -o jsonpath='{.metadata.generation}{" "}{.status.observedGeneration}{"\n"}'
```

Confirm:

- `status.observedGeneration` has caught up with `metadata.generation`;
- the Trigger references the expected Broker;
- the deployed `filter` or `filters` is the one under investigation;
- no deployment overlay or GitOps controller rewrote it;
- the Broker class supports the selected filter API.

The singular `spec.filter` is the legacy exact-attributes API. The plural `spec.filters` is the CloudEvents Subscriptions API filter array. If both are present, `filters` overrides `filter`.

## Inspect the CloudEvent Envelope

Capture one event at a controlled diagnostic subscriber with no filter, or inspect the producer's serialized HTTP request. Avoid logging sensitive `data`.

In binary mode, the envelope is split between HTTP headers and body:

```http
POST / HTTP/1.1
Ce-Specversion: 1.0
Ce-Id: order-123
Ce-Source: urn:example:checkout
Ce-Type: com.example.order.created
Ce-Subject: customers/42
Ce-Region: eu-west
Content-Type: application/json

{"order":{"status":"created"}}
```

The filterable values include `type`, `source`, `subject`, and the `region` extension. `order.status` is inside `data` and cannot be used by a Trigger filter.

In structured mode, the same context appears in the JSON envelope:

```json
{
  "specversion": "1.0",
  "id": "order-123",
  "source": "urn:example:checkout",
  "type": "com.example.order.created",
  "subject": "customers/42",
  "region": "eu-west",
  "datacontenttype": "application/json",
  "data": {
    "order": {
      "status": "created"
    }
  }
}
```

HTTP header capitalization is not the matching issue; HTTP header names are case-insensitive. Attribute values are case-sensitive for exact, prefix, and suffix filters.

## Check the Legacy Exact Filter

The legacy API matches every listed context attribute or extension exactly:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-created
  namespace: production
spec:
  broker: commerce
  filter:
    attributes:
      type: com.example.order.created
      region: eu-west
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: fulfillment
```

The example event matches. These do not:

- `type: com.example.order.Created`;
- `region: EU-WEST`;
- an event without the `region` extension;
- an event where only `data.region` equals `eu-west`.

Only string values are supported. Quote values that YAML might otherwise coerce:

```yaml
filter:
  attributes:
    attempt: "1"
    enabled: "true"
```

An empty string in the legacy attributes API is documented as matching any string value for that attribute. It still does not turn a payload path into a filterable attribute.

## Check `filters` Composition

For KafkaBroker and MTChannelBasedBroker, the current Trigger documentation supports `exact`, `prefix`, `suffix`, `all`, `any`, `not`, and `cesql`. Other Broker implementations should use the legacy attribute filter unless their own documentation states that they support `filters`.

Separate entries in the top-level array are combined with logical AND:

```yaml
spec:
  broker: commerce
  filters:
    - exact:
        region: eu-west
    - prefix:
        type: com.example.order.
    - suffix:
        type: .created
```

The event must satisfy all three expressions.

A common error is intending OR:

```yaml
# This means created AND updated, so no normal event can match.
filters:
  - exact:
      type: com.example.order.created
  - exact:
      type: com.example.order.updated
```

Use `any` instead:

```yaml
filters:
  - any:
      - exact:
          type: com.example.order.created
      - exact:
          type: com.example.order.updated
```

Use `all` when nesting makes the intended AND explicit:

```yaml
filters:
  - all:
      - prefix:
          source: "urn:example:"
      - not:
          exact:
            region: test
```

Exact, prefix, and suffix compare string values case-sensitively. A missing attribute does not match an expression that requires it.

## Validate CESQL Against the Installed Version

CESQL is useful for readable combinations:

```yaml
spec:
  broker: commerce
  filters:
    - cesql: >-
        source LIKE 'urn:example:%'
        AND type IN ('com.example.order.created',
                     'com.example.order.updated')
```

Knative 1.15 and later support CloudEvents SQL v1.0. The official documentation warns that expressions written before 1.15 must be revalidated because the specification changed.

When CESQL does not match:

1. reduce it to one equality comparison;
2. use an attribute visible in the captured envelope;
3. confirm quoting and string case;
4. add one clause at a time;
5. inspect Broker filter logs for parse or evaluation errors.

Do not assume SQL table syntax, JSON path functions, or database-specific casts exist in CESQL. Use the CloudEvents SQL version supported by the installed Knative release.

## Prove Whether Filtering Is the Failing Layer

Send one known binary-mode CloudEvent to the actual Broker:

```bash
broker_url=$(kubectl -n "$namespace" get broker commerce \
  -o jsonpath='{.status.address.url}')

kubectl -n "$namespace" run filter-probe \
  --image=curlimages/curl:8.21.0 \
  --restart=Never --rm -i --command -- \
  curl -v -X POST "$broker_url" \
    -H 'Ce-Specversion: 1.0' \
    -H 'Ce-Id: filter-debug-001' \
    -H 'Ce-Source: urn:example:checkout' \
    -H 'Ce-Type: com.example.order.created' \
    -H 'Ce-Region: eu-west' \
    -H 'Content-Type: application/json' \
    --data '{"order":{"status":"created"}}'
```

Use an approved image in restricted environments. Then:

1. Confirm Broker ingress accepted `filter-debug-001`.
2. Confirm an approved catch-all diagnostic Trigger receives the same event.
3. Temporarily reduce the test Trigger to one exact `type` comparison in a non-production or canary route.
4. Add each expression back until the mismatch returns.
5. Compare filter and dispatch metrics for the same interval.

If neither a catch-all Trigger nor the filtered Trigger receives the event, investigate Broker ingress and routing. If the catch-all receives it, the Broker path works and the difference is filter evaluation or implementation support.

## Check Producer Encoding and Intermediaries

The object in producer code may not be the event received by the Broker. Confirm:

- the CloudEvents SDK sets `type`, `source`, and extensions on the event context;
- a gateway does not drop `ce-*` extension headers;
- structured JSON mode uses `Content-Type: application/cloudevents+json`;
- binary-mode `Content-Type` describes `data`, with required `ce-*` headers separate;
- a transformation step does not rename or overwrite attributes;
- the producer sends to the Broker and namespace tested.

For example, this payload value is not an extension:

```json
{
  "region": "eu-west"
}
```

The producer must set the CloudEvents `region` extension through its SDK or, in binary mode, the `Ce-Region` header.

## Avoid Misleading Fixes

- Restarting the subscriber does not change a false filter result.
- Making the Trigger catch-all permanently can leak events across trust boundaries.
- Adding several filter dialects at once makes the first mismatch harder to identify.
- Keeping both `filter` and `filters` during migration hides the legacy rule because `filters` wins.
- Filtering sensitive payload values by copying them into extensions can expose them in headers, logs, and metrics. Review the event contract first.

## A Reliable Filter Test Matrix

Before production rollout, test:

| Event | Expected result |
| --- | --- |
| Every required attribute matches | Delivered |
| One exact value differs only by case | Not delivered |
| One required extension is absent | Not delivered |
| One value matches only inside `data` | Not delivered |
| Each branch of an `any` expression | Delivered |
| A `not` expression's excluded value | Not delivered |
| Event includes extra unrelated extensions | Delivered if all required expressions match |

Use unique event IDs and assert both positive and negative cases. A filter is correct only when it excludes the events that must not cross the route as well as delivering the desired ones.

## Official Documentation

- [Knative Trigger filtering](https://knative.dev/docs/eventing/triggers/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative Brokers](https://knative.dev/docs/eventing/brokers/)
- [Knative Eventing troubleshooting](https://knative.dev/docs/eventing/troubleshooting/)
- [CloudEvents HTTP protocol binding](https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/http-protocol-binding.md)
- [CloudEvents SQL specification](https://github.com/cloudevents/spec/blob/main/cesql/spec.md)
