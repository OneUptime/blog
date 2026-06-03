# Validation Summary: How to Build a Serverless Event Gateway with Kong and Knative on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kong Gateway
- Kong Ingress Controller
- Knative Eventing
- Knative Serving
- Kubernetes Services and Ingress
- CloudEvents HTTP binding
- Node.js, Express, Axios
- Helm
- Prometheus

## Sources Consulted
- Kong Ingress Controller Helm install documentation: https://developer.konghq.com/kubernetes-ingress-controller/install/
- Kong Ingress Controller annotations reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Kong Request Transformer plugin documentation: https://developer.konghq.com/plugins/request-transformer/examples/add-header/
- Kong Key Authentication with Kubernetes documentation: https://docs.konghq.com/kubernetes-ingress-controller/latest/get-started/key-authentication/
- Kong Rate Limiting plugin documentation: https://docs.konghq.com/hub/kong-inc/rate-limiting/
- Kong Gateway monitoring documentation: https://developer.konghq.com/gateway/monitoring/
- Knative Broker creation documentation: https://knative.dev/docs/eventing/brokers/create-broker/
- Knative Broker configuration documentation: https://knative.dev/docs/eventing/configuration/broker-configuration/
- CloudEvents HTTP protocol binding: https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/http-protocol-binding.md

## Issues Found
- The Kong installation used the older `kong/kong` chart configuration and disabled CRD installation while later examples used Kong CRDs. Updated the installation to the current documented `kong/ingress` chart and adjusted the proxy service name to `kong-gateway-proxy`.
- The Knative Broker upstream host was incorrect. Knative Brokers are addressed through `broker-ingress.knative-eventing.svc.cluster.local/<namespace>/<broker>`, not a per-Broker service named `orders-broker-ingress.default.svc.cluster.local`. Added a Broker resource, changed the ExternalName target to `broker-ingress.knative-eventing.svc.cluster.local`, and used `konghq.com/path: /default/orders-broker`.
- The ExternalName Service had no declared port even though the Ingress referenced port 80. Added the Service port definition.
- The Request Transformer example attempted to use `Ce-Id:$(uuid)`, which is not a documented basic request-transformer header generation feature. Changed the section to explain that the basic plugin adds static headers and that the transformer service should generate dynamic event IDs.
- The transformer service used an invalid Broker URL, `orders-broker-broker.default.svc.cluster.local`. Updated it to the Knative Broker ingress URL for the `orders-broker` Broker.
- The JavaScript transformer created extension attributes inside an `extensions` object but did not send them as CloudEvents extension headers. Changed the example to map `gateway` and optional `userid` as `ce-` extension headers in binary HTTP mode.
- The monitoring commands referenced older Kong service and label names. Updated the Admin API port-forward target to `kong-gateway-admin` and the log selector to the Helm release label.

## Review Notes
The request-transformer-only path still depends on clients or another upstream transformer providing a unique `ce-id`; the Node.js transformer example is the more complete CloudEvents conversion path. For production, use a durable Knative Broker backend instead of an InMemoryChannel-backed Broker.
