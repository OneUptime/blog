# Validation Summary: How to Deploy a CloudEvents Router with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CloudEvents
- Knative Eventing
- Knative Broker, Trigger, ApiServerSource, and EventType resources
- Kubernetes manifests and RBAC
- Flux CD Kustomization
- Kustomize
- kubectl and flux CLI commands

## Sources Consulted
- Knative Eventing overview: https://knative.dev/docs/eventing/
- Knative Broker creation and configuration: https://knative.dev/docs/eventing/brokers/create-broker/
- Knative Broker developer configuration options: https://knative.dev/docs/eventing/brokers/broker-developer-config-options/
- Knative event delivery configuration: https://knative.dev/docs/eventing/event-delivery/
- Knative Trigger documentation: https://knative.dev/v1.21-docs/eventing/triggers/
- Knative ApiServerSource documentation: https://knative.dev/docs/eventing/sources/apiserversource/getting-started/
- Knative ApiServerSource reference: https://knative.dev/docs/eventing/sources/apiserversource/reference/
- Knative Event registry / EventType documentation: https://knative.dev/docs/eventing/event-registry/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- CloudEvents specification repository: https://github.com/cloudevents/spec

## Issues Found
- The Kubernetes prerequisite used a fixed `1.24+` version. Current Knative releases have their own supported Kubernetes version matrix, so this was changed to require a Kubernetes version supported by the installed Knative Eventing release.
- The ApiServerSource example referenced `event-watcher-sa` but did not define the ServiceAccount, Role, or RoleBinding required to watch Kubernetes Event resources. Added the missing RBAC resources.
- The ApiServerSource comment said it sent all Kubernetes Warning events, but the manifest watches Kubernetes Event resources in the namespace and does not filter on the Event payload's `type: Warning`. Updated the comment to match the manifest behavior.
- The Flux Kustomize resource list omitted `api-source.yaml`, so the event source would not be applied. Added it to the `resources` list.
- The `dependsOn` best practice claimed it ensured the Broker was ready before Triggers and Sources referenced it. Flux `dependsOn` orders Kustomization reconciliation, not individual resources within one Kustomization. Updated the note to say it ensures Knative Eventing is ready, and to split Broker/Trigger/Source resources into separate Kustomizations with health checks if readiness ordering is required.

## Review Notes
- The edited YAML snippets were parsed successfully.
- The Broker uses `MTChannelBasedBroker`, which is still documented by Knative, but Knative notes that its default in-memory channel is not appropriate for production. A production version of this guide should call out a durable Broker or Channel implementation such as Kafka or RabbitMQ.
- `spec.delivery.timeout` is documented as experimental in the Knative Eventing API.
