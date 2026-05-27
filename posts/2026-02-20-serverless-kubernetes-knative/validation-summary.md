# Validation Summary: How to Run Serverless Workloads on Kubernetes with Knative

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Knative Serving
- Knative Eventing
- Kourier
- Knative Pod Autoscaler (KPA)
- CloudEvents
- Python
- Flask

## Sources Consulted
- Knative Serving YAML installation docs: https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/
- Knative Eventing YAML installation docs: https://knative.dev/docs/install/yaml-install/eventing/install-eventing-with-yaml/
- Knative Serving autoscaling metrics docs: https://knative.dev/docs/serving/autoscaling/autoscaling-metrics/
- Knative Serving autoscaling targets docs: https://knative.dev/docs/serving/autoscaling/autoscaling-targets/
- Knative Serving scale-to-zero docs: https://knative.dev/docs/serving/autoscaling/scale-to-zero/
- Knative Serving scale bounds docs: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Knative Eventing Broker docs: https://knative.dev/docs/eventing/brokers/create-broker/
- Knative Eventing Trigger docs: https://knative.dev/docs/eventing/triggers/
- CloudEvents Python SDK README: https://github.com/cloudevents/sdk-python

## Issues Found
- The install commands used Knative v1.13.0 manifests and the old `knative/net-kourier` repository path. Updated the examples to the current official v1.22.0 YAML install URLs and the `knative-extensions/net-kourier` path.
- The Eventing install steps only installed Eventing CRDs and core components, but the later Broker example requires a Broker implementation. Added the official in-memory Channel and MT-Channel Broker install commands, with the existing caveat that in-memory is not production-suitable.
- The post described Serving and Eventing as Knative's two main components. Current Knative docs also list Functions, so the wording was narrowed to the two cluster components covered by this tutorial.
- The autoscaling example used `autoscaling.knative.dev/scale-to-zero-grace-period` as a per-revision annotation. Official docs define `scale-to-zero-grace-period` as a global-only setting; replaced it with the valid per-revision `autoscaling.knative.dev/scale-to-zero-pod-retention-period` annotation.
- The CloudEvents Python producer used outdated imports and an invalid `to_structured(event, data=data)` call for the current SDK. Updated it to `cloudevents.core.v1.event.CloudEvent` and `to_structured_event(event)`.
- The CloudEvents Python consumer used outdated `cloudevents.http.from_http` and dictionary-style event access. Updated it to `HTTPMessage`, `from_http_event`, and the current getter methods.

## Review Notes
- The in-memory Channel and MT-Channel Broker are appropriate for a simple tutorial but should be replaced with a production broker such as Kafka or RabbitMQ for durable production event delivery.
- The revised CloudEvents SDK examples were syntax-checked and the structured-event round trip was verified locally with the current `cloudevents` Python package.
