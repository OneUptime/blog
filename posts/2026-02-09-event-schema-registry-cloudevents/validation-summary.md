# Validation Summary: How to Implement Event Schema Registry Validation for CloudEvents on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- CloudEvents
- Confluent Schema Registry
- Kubernetes Deployments and Services
- Knative Serving and Eventing Sequence
- JSON Schema
- Python
- Flask
- python-jsonschema

## Sources Consulted
- Confluent Schema Registry API Reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Evolution and Compatibility Types: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- Confluent Docker Image Configuration Reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- CloudEvents JSON Event Format specification: https://github.com/cloudevents/spec/blob/main/cloudevents/formats/json-format.md
- CloudEvents HTTP Protocol Binding specification: https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/http-protocol-binding.md
- Knative Sequence documentation: https://knative.dev/docs/eventing/flows/sequence/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- python-jsonschema validation documentation: https://python-jsonschema.readthedocs.io/en/stable/validate/

## Issues Found
- The Schema Registry Deployment used `replicas: 2` with the same `SCHEMA_REGISTRY_HOST_NAME` for every pod. Confluent documents that host names must be resolvable for multi-node forwarding, and a plain Deployment with one shared host name is not a correct multi-node identity setup. Changed the tutorial example to `replicas: 1` to keep it correct without introducing a StatefulSet or headless Service.
- The Python snippets hardcoded `SCHEMA_REGISTRY_URL`, while the Knative Service configured the same value through an environment variable. Updated the registration, validation, and compatibility snippets to read `SCHEMA_REGISTRY_URL` from the environment with the original in-cluster URL as the default.
- The validator treated `request.get_json()` as event data for all CloudEvents. That only matches HTTP binary mode with JSON event data. CloudEvents structured mode places the full event envelope in the request body and the payload under `data`. Added a small extractor that handles structured `application/cloudevents+json` events and keeps the existing binary-mode behavior.

## Review Notes
The remaining examples are intentionally minimal. A production deployment should add Schema Registry authentication/TLS, health probes, stronger schema cache invalidation, error handling for malformed CloudEvents, and a proper high-availability Schema Registry topology if more than one replica is required.
