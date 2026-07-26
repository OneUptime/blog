# How to Send a Valid CloudEvent to a Knative Broker with curl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, CloudEvents, Kubernetes, curl, Broker, Troubleshooting

Description: Build, send, and verify valid binary-mode and structured-mode CloudEvents against a Knative Broker without confusing ingress acceptance with subscriber completion.

---

A Knative Broker accepts CloudEvents over HTTP. For a CloudEvents 1.0 event, `specversion`, `id`, `source`, and `type` are required. The easiest `curl` test uses HTTP binary content mode: CloudEvent attributes go in `ce-` headers, while the event data remains the request body.

The word "binary" does not mean that the payload must contain binary bytes. It describes where the CloudEvent metadata is carried.

## Get the Exact Broker Address

Check readiness and read the address published by the Broker:

```bash
kubectl get broker orders -n production

BROKER_URL="$(kubectl get broker orders -n production \
  -o jsonpath='{.status.address.url}')"
printf '%s\n' "$BROKER_URL"
```

The normal address is cluster-local, for example:

```text
http://kafka-broker-ingress.knative-eventing.svc.cluster.local/production/orders
```

Run `curl` from a Pod unless you have deliberately exposed and secured that ingress:

```bash
kubectl run ce-curl \
  --namespace production \
  --image=curlimages/curl:8.12.1 \
  --restart=Never \
  --rm -it -- sh
```

Inside the Pod, set the URL again or paste the value returned above.

## Send a Binary-Mode CloudEvent

Use a unique ID for a distinct occurrence:

```bash
EVENT_ID="order-1042-created-1"

curl --fail-with-body --include \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Ce-Specversion: 1.0' \
  --header "Ce-Id: ${EVENT_ID}" \
  --header 'Ce-Source: https://orders.example.com/production' \
  --header 'Ce-Type: com.example.order.created.v1' \
  --header 'Ce-Subject: orders/1042' \
  --data-binary '{"orderId":"1042","total":73.40}' \
  "$BROKER_URL"
```

HTTP header names are case-insensitive, although lower-case `ce-*` names are easier to compare with specifications and logs. `source` is a URI-reference; an absolute URI is recommended. The producer must keep the `(source, id)` pair unique for each distinct event. If it retries the same occurrence after an ambiguous network result, it should reuse that pair so consumers can identify the duplicate.

A successful Broker ingress commonly returns `202 Accepted`. That means the Broker accepted the event into its ingress path. It does not prove that every matching Trigger subscriber finished its business operation. Inspect the subscriber and Eventing delivery telemetry separately.

## Send a Structured-Mode CloudEvent

Structured JSON puts the attributes and data in one envelope. Its media type is `application/cloudevents+json`:

```bash
curl --fail-with-body --include \
  --request POST \
  --header 'Content-Type: application/cloudevents+json' \
  --data-binary @- \
  "$BROKER_URL" <<'JSON'
{
  "specversion": "1.0",
  "id": "order-1043-created-1",
  "source": "https://orders.example.com/production",
  "type": "com.example.order.created.v1",
  "subject": "orders/1043",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "1043",
    "total": 41.25
  }
}
JSON
```

Choose one content mode per request. A common broken test sends a structured envelope as ordinary `application/json` but omits the required `ce-*` headers; the receiver then sees neither a valid structured event nor a valid binary-mode event.

## Prove That Routing Worked

Create a narrow Trigger rather than an unfiltered production subscription:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-created-debug
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
      name: event-display
```

Then inspect both resource state and subscriber logs:

```bash
kubectl get broker,trigger -n production
kubectl describe trigger order-created-debug -n production
kubectl logs -n production \
  -l serving.knative.dev/service=event-display \
  -c user-container --tail=100
```

Check that the received `id`, `source`, `type`, `subject`, `datacontenttype`, and data match what was sent.

## Diagnose Rejected Requests

- `400 Bad Request`: inspect required attributes, URI and timestamp syntax, structured JSON validity, and the content type.
- `404 Not Found`: use the complete Broker path. Kafka Broker ingress identifies the namespaced Broker from `/<namespace>/<broker>`.
- `405 Method Not Allowed`: send `POST`, not `GET`.
- `401` or `403`: satisfy the authentication and authorization policy on the ingress; CloudEvent headers are not credentials.
- connection or DNS failure: the published URL is usually cluster-local. Test from a Pod or configure a controlled external route.
- `202` but no subscriber log: inspect Trigger readiness and exact filter values. Attribute filtering is case-sensitive for values.
- duplicate processing: retry the same occurrence with the same `(source, id)` and make the consumer idempotent. Acceptance cannot eliminate an ambiguous client-side retry.

Avoid `curl -k` in production. Fix the CA chain and hostname instead of disabling TLS verification.

## Official Documentation

- [Knative Broker configuration and curl example](https://knative.dev/docs/eventing/configuration/broker-configuration/)
- [Knative Eventing overview](https://knative.dev/docs/eventing/)
- [CloudEvents 1.0 core specification](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)
- [CloudEvents HTTP protocol binding](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
- [CloudEvents JSON event format](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/formats/json-format.md)
