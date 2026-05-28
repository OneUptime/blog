# Validation Summary: How to Use End-to-End Distributed Tracing Across GKE Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- Cloud Run
- Cloud Functions 2nd gen / Cloud Run functions
- Cloud Trace
- OpenTelemetry Python SDK
- OpenTelemetry Flask, Requests, and SQLAlchemy instrumentation
- Pub/Sub
- SQLAlchemy
- Flask
- Google Cloud CLI

## Sources Consulted
- Google Cloud Trace Python OpenTelemetry setup: https://docs.cloud.google.com/trace/docs/setup/python-ot
- Google Cloud Trace instrumentation overview: https://cloud.google.com/trace/docs/setup/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Requests instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- Google Cloud Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Functions Pub/Sub CloudEvent sample: https://docs.cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- gcloud functions deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- SQLAlchemy 2.0 connection documentation: https://docs.sqlalchemy.org/20/core/connections.html

## Issues Found
- The architecture diagram showed the Cloud Run service calling the Cloud Function directly through Pub/Sub and receiving an ack from the function. Pub/Sub delivery to a Cloud Function is asynchronous, so I changed the diagram to include Pub/Sub as its own participant, return a message ID to Cloud Run, and deliver the event separately to the function.
- The Pub/Sub propagation example only forwarded `traceparent`. W3C Trace Context includes `traceparent` and `tracestate`, and OpenTelemetry propagation injects the carrier fields that should be forwarded. I changed the code to pass the injected carrier as Pub/Sub message attributes and updated the explanation and flow diagram accordingly.
- The Pub/Sub publish call did not wait for the publish future. I changed the example to call `future.result(timeout=30)` so the tutorial does not imply that returning from `publish()` alone confirms the message was accepted by Pub/Sub.

## Review Notes
Google's current Cloud Trace Python documentation recommends using an OpenTelemetry Collector with OTLP when the environment supports it, while still documenting direct in-process export as an option for some environments. The post's direct `CloudTraceSpanExporter` approach remains technically valid, but a future update could mention the collector-based deployment pattern.
