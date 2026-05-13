# Validation Summary: How to Deploy Knative Eventing with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux CD v2
- Knative Eventing
- Knative Brokers and Triggers
- Knative PingSource
- CloudEvents
- Kustomize

## Sources Consulted
- Knative Eventing installation files: https://knative.dev/docs/install/yaml-install/eventing/eventing-installation-files/
- Knative Eventing YAML install guide: https://knative.dev/docs/install/yaml-install/eventing/install-eventing-with-yaml/
- Knative channel-based Broker documentation: https://knative.dev/docs/eventing/brokers/broker-types/channel-based-broker/
- Knative Broker defaults documentation: https://knative.dev/docs/eventing/configuration/broker-configuration/
- Knative Broker creation documentation: https://knative.dev/docs/eventing/brokers/create-broker/
- Knative Trigger documentation: https://knative.dev/docs/eventing/triggers/
- Knative PingSource documentation: https://knative.dev/docs/eventing/sources/ping-source/
- Knative event delivery documentation: https://knative.dev/docs/eventing/event-delivery/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Knative Eventing v1.14.0 release assets and repository layout: https://github.com/knative/eventing/releases/tag/knative-v1.14.0

## Issues Found
- The Flux `GitRepository` allowlist and broker `Kustomization` used the non-existent upstream path `config/channels/multitenant-channel-based-broker/`. Updated them to the v1.14 repository path `config/brokers/mt-channel-broker/`.
- The MTChannelBasedBroker deployment omitted a Channel implementation. Added a Flux `Kustomization` for `config/channels/in-memory-channel` and made the broker depend on it, matching Knative's requirement that the channel-based broker has a Channel implementation installed.
- The verification command used `flux get kustomizations knative-eventing knative-eventing-broker`, but the official Flux CLI synopsis is `flux get kustomizations [flags]`. Changed it to `flux get kustomizations`.

## Review Notes
- The post pins Knative Eventing to `knative-v1.14.0`, which is valid but older than current Knative releases as of 2026-05-13. Future updates should consider moving to a supported newer Knative version and rechecking repository paths and APIs.
- The example uses `InMemoryChannel`, which is useful for simple examples but Knative documentation warns it is not suitable for production use cases.
