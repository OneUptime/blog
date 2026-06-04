# Validation Summary: How to Configure Knative Eventing with Dead Letter Sinks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Knative Eventing
- Knative Serving
- Kubernetes
- CloudEvents
- Node.js and Express
- PostgreSQL
- Python asyncio, aiohttp, and psycopg2
- Prometheus Operator ServiceMonitor and PrometheusRule

## Sources Consulted
- Knative documentation: Handling Delivery Failure - https://knative.dev/docs/eventing/event-delivery/
- Knative documentation: DeliverySpec.Timeout field - https://knative.dev/docs/eventing/features/delivery-timeout/
- Knative documentation: Sinks - https://knative.dev/docs/eventing/sinks/
- Knative documentation: Creating a Broker - https://knative.dev/docs/eventing/brokers/create-broker/
- Knative Eventing API reference - https://knative.dev/v1.20-docs/eventing/reference/eventing-api/

## Issues Found
- The dead letter handler read `ce-knativedeliveryattempts` and `ce-knativelasterror` headers as if they were Knative delivery context. The official Knative delivery failure documentation describes dead-letter error context as CloudEvent extension attributes such as `knativeerrordest`, `knativeerrorcode`, and `knativeerrordata`, depending on the implementation. Updated the handler to read the corresponding binary-mode CloudEvent headers: `ce-knativeerrordest`, `ce-knativeerrorcode`, and `ce-knativeerrordata`.
- The reprocessing examples used `http://orders-broker-broker.default.svc.cluster.local` as the Broker URL. Current Knative examples show Broker addresses resolved through `status.address.url`, commonly in the form `http://broker-ingress.knative-eventing.svc.cluster.local/<namespace>/<broker>`. Updated the JavaScript fallback and Kubernetes `BROKER_URL` value to `http://broker-ingress.knative-eventing.svc.cluster.local/default/orders-broker`.

## Review Notes
The delivery configuration fields used in the Broker and Trigger examples are valid for current Knative Eventing APIs. The `timeout` delivery field is currently documented as beta and enabled by default. Broker delivery parameter support varies by Broker implementation, so production users should confirm their selected Broker class supports the fields they configure.
