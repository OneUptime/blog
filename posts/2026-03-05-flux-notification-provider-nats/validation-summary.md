# Validation Summary: How to Configure Flux Notification Provider for NATS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets and kubectl
- NATS
- NATS Helm chart
- NATS CLI
- Helm

## Sources Consulted
- Flux Notification Controller documentation: https://fluxcd.io/flux/components/notification/
- Flux Provider documentation, including NATS provider examples and secret fields: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux notification-controller source tree showing Provider and Alert under api/v1beta3 and Receiver under api/v1: https://github.com/fluxcd/notification-controller/tree/main/api
- NATS Kubernetes documentation for the official Helm chart and nats-box validation workflow: https://docs.nats.io/running-a-nats-service/nats-kubernetes
- NATS CLI documentation for the `nats sub` command and `--server` flag: https://docs.nats.io/using-nats/nats-tools/nats_cli
- NATS protocol documentation for publish/subscribe semantics: https://docs.nats.io/reference/reference-protocols/nats-protocol

## Issues Found
- The Flux `Provider` and `Alert` examples used `apiVersion: notification.toolkit.fluxcd.io/v1`. Current Flux documentation and source place `Provider` and `Alert` in `notification.toolkit.fluxcd.io/v1beta3`; `v1` currently documents `Receiver`. Updated all Provider and Alert snippets to use `notification.toolkit.fluxcd.io/v1beta3`.
- The NATS subscription command used the in-cluster DNS name directly from a generic terminal. That service DNS name is only resolvable from inside the Kubernetes cluster. Updated the command to run `nats sub` via the Helm chart's `nats-box` deployment in the `nats-system` namespace.

## Review Notes
- The post's use of the Provider `channel` field as the NATS subject is consistent with Flux documentation.
- The post's use of a Secret `address` key is consistent with Flux Provider documentation, which states that a referenced Secret's `address` key overrides `.spec.address`.
- The NATS Helm repository and basic install command match the official NATS Kubernetes documentation.
- The NATS wildcard subscription example `flux.*.events` is correct for matching one token between `flux` and `events`.
