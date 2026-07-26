# How to Expose a Knative Kafka Broker Outside the Cluster Without Breaking CloudEvents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Kafka Broker, CloudEvents, Kubernetes Gateway API, TLS, Security

Description: Publish a narrow HTTPS route to Knative Kafka Broker ingress while preserving the Broker path, CloudEvent headers, body, authentication, and delivery semantics.

---

External producers do not connect to the Kafka bootstrap servers to publish to a Knative Kafka Broker. They send an HTTP CloudEvent to the Kafka Broker's ingress service. Expose that HTTP endpoint through an authenticated TLS gateway and map a public path to the Broker's internal `/<namespace>/<broker>` path.

Do not change the Broker's `status.address.url`; controllers use that cluster-local address.

## Discover the Ingress Service and Broker Path

```bash
kubectl get broker orders -n production \
  -o jsonpath='{.status.address.url}{"\n"}'
kubectl get service kafka-broker-ingress -n knative-eventing
```

A shared-data-plane Kafka Broker normally publishes an address like:

```text
http://kafka-broker-ingress.knative-eventing.svc.cluster.local/production/orders
```

The path is significant. Shared ingress uses it to select the Broker. `KafkaNamespaced` places `kafka-broker-ingress` in the workload namespace, but the path still identifies the namespaced Broker.

## Create a Narrow Gateway Route

This Gateway API example exposes only `https://events.example.com/orders` and rewrites it to the exact internal Broker path:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: public-events
  namespace: knative-eventing
spec:
  gatewayClassName: example-gateway-class
  listeners:
    - name: https
      hostname: events.example.com
      port: 443
      protocol: HTTPS
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: events-example-com-tls
      allowedRoutes:
        namespaces:
          from: Same
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: external-orders-broker
  namespace: knative-eventing
spec:
  parentRefs:
    - name: public-events
      sectionName: https
  hostnames:
    - events.example.com
  rules:
    - matches:
        - path:
            type: Exact
            value: /orders
      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplaceFullPath
              replaceFullPath: /production/orders
      backendRefs:
        - name: kafka-broker-ingress
          port: 80
```

Replace the GatewayClass and port with values supported by your installation. If Eventing transport encryption is strict, configure the gateway-to-backend TLS behavior and trusted CA for the HTTPS service address rather than silently downgrading it.

Placing the Gateway in another namespace requires its listener to allow the route namespace. A backend in a different namespace also requires the appropriate Gateway API cross-namespace reference authorization. Keep the example same-namespace unless your platform team intentionally manages those boundaries.

## Preserve the CloudEvent

The gateway must forward:

- the original HTTP method, normally `POST`
- the request body byte-for-byte
- `Content-Type`
- all `ce-*` headers for binary content mode
- `traceparent` and other explicitly approved observability headers

Do not configure middleware that parses and reserializes JSON, strips unknown headers, converts the request to a form body, or redirects `POST` to another URL. Structured-mode events use `Content-Type: application/cloudevents+json`; binary-mode events use ordinary data content types plus `ce-*` headers.

Set explicit request-body and header-size limits that accommodate your event contract. CloudEvents does not remove proxy limits.

## Authenticate Before Broker Ingress

The Broker endpoint is a publish capability. Protect it with the mechanisms supported by your gateway, such as mTLS, OIDC/JWT, or a workload identity integration. Restrict:

- hostname and exact path
- `POST` and, if required, `OPTIONS`
- trusted producer identities
- event rate and maximum body size
- source networks where useful

CloudEvent `source` is producer-supplied context, not authenticated identity. Never authorize a publisher solely because it sends a trusted-looking `ce-source`.

Knative documents Istio JWT authorization for Broker ingress. Apply equivalent policy at the actual ingress layer in your cluster and avoid publishing the entire `kafka-broker-ingress` Service as an unauthenticated LoadBalancer, which would expose paths for every shared Broker.

## Test Both Content Modes

Binary mode:

```bash
curl --fail-with-body --include \
  --request POST \
  --header 'Authorization: Bearer REPLACE_WITH_TOKEN' \
  --header 'Content-Type: application/json' \
  --header 'Ce-Specversion: 1.0' \
  --header 'Ce-Id: external-order-2048-1' \
  --header 'Ce-Source: https://partner.example.net/orders' \
  --header 'Ce-Type: com.partner.order.created.v1' \
  --data-binary '{"orderId":"2048"}' \
  https://events.example.com/orders
```

Structured mode:

```bash
curl --fail-with-body --include \
  --request POST \
  --header 'Authorization: Bearer REPLACE_WITH_TOKEN' \
  --header 'Content-Type: application/cloudevents+json' \
  --data-binary '{
    "specversion":"1.0",
    "id":"external-order-2049-1",
    "source":"https://partner.example.net/orders",
    "type":"com.partner.order.created.v1",
    "data":{"orderId":"2049"}
  }' \
  https://events.example.com/orders
```

Use a short-lived real token through a secret-aware test process; do not put credentials in shell history or manifests.

The expected successful ingress response is commonly `202 Accepted`. Confirm downstream delivery through a narrow test Trigger and subscriber state. A gateway `2xx` generated without contacting the backend is a broken health illusion.

## Troubleshoot by Hop

```bash
kubectl describe gateway public-events -n knative-eventing
kubectl describe httproute external-orders-broker -n knative-eventing
kubectl get endpointslice -n knative-eventing \
  -l kubernetes.io/service-name=kafka-broker-ingress
kubectl get broker orders -n production
kubectl get trigger -n production
```

- gateway `404`: check hostname, public match, and route attachment
- Broker `404`: check the rewritten `/<namespace>/<broker>` path
- `400`: capture safely and compare `Content-Type`, required attributes, headers, and JSON validity
- `401` or `403`: debug gateway or mesh authorization, not Trigger filters
- `431`: raise justified header limits or reduce CloudEvent extensions
- `413`: enforce an event-size contract or move large data to object storage and send a reference
- `202` with no subscriber result: ingress worked; inspect Trigger filtering and delivery

Version the public event contract separately from the internal Broker name. That allows a Broker migration without forcing producers to learn cluster topology.

## Official Documentation

- [Knative Kafka Broker](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative Kafka Broker shared and isolated ingress paths](https://knative.dev/blog/articles/kafka-broker-with-isolated-data-plane/)
- [Knative Broker configuration and Istio JWT protection](https://knative.dev/docs/eventing/configuration/broker-configuration/)
- [Knative Eventing transport encryption](https://knative.dev/docs/eventing/features/transport-encryption/)
- [Kubernetes Gateway API HTTPRoute](https://gateway-api.sigs.k8s.io/reference/api-types/httproute/)
- [CloudEvents HTTP protocol binding](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
