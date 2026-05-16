# Validation Summary: How to Set Up Event-Driven Architecture on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Helm
- NATS
- NATS JetStream
- NATS CLI
- nats.js
- NATS Surveyor
- Node.js
- CQRS
- Event-driven architecture

## Sources Consulted
- NATS Kubernetes documentation: https://docs.nats.io/running-a-nats-service/nats-kubernetes
- Official NATS Helm chart values: https://github.com/nats-io/k8s/blob/main/helm/charts/nats/values.yaml
- NATS CLI stream command source and flags: https://github.com/nats-io/natscli/blob/main/cli/stream_command.go
- NATS CLI consumer command source and flags: https://github.com/nats-io/natscli/blob/main/cli/consumer_command.go
- NATS JetStream consumer concepts: https://docs.nats.io/nats-concepts/jetstream/consumers
- nats.js JetStream API documentation: https://nats-io.github.io/nats.js/jetstream/index.html
- NATS Surveyor documentation: https://github.com/nats-io/nats-surveyor
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The NATS Helm values used outdated/incorrect JetStream keys (`memStorage` and `fileStorage`). Updated them to the current chart keys `memoryStore` and `fileStore`, including the nested PVC settings for file-backed JetStream storage.
- The NATS container resource requests were nested under `container.merge.resources`, but the official chart exposes `container.resources` directly. Updated the snippet to use the supported field.
- The stream creation commands could enter interactive prompts in the NATS CLI. Added `--defaults` so the commands are suitable for scripted setup.
- The consumer code retrieved a durable consumer named `inventory-service`, but the tutorial never created that consumer. Added a `nats consumer add ORDER_EVENTS inventory-service` command with an explicit-ack pull consumer filtered to `orders.created`.
- The JavaScript examples used the deprecated `nats` npm package. Updated the code to use the current `@nats-io/transport-node` and `@nats-io/jetstream` packages and the current `jetstream(nc)` API.
- The Node.js Kubernetes examples mounted source files from ConfigMaps but used the plain `node:20-alpine` image, which does not include the NATS client dependencies. Updated the container commands to install the required packages into `/tmp` before running the mounted application code.
- The dead letter stream creation command could also prompt interactively. Added `--defaults`.
- The NATS Surveyor example used `--observe ">"`, but Surveyor's JetStream stream and consumer metrics are collected with JSZ flags. Replaced the observation flags with `--jsz=all`, `--jsz-leaders-only`, and a consumer lag focused `--jsz-filter`.

## Review Notes
- The `storageClassName` value is now shown as `<your-storage-class>` because Talos Linux itself does not provide a Kubernetes storage class; users must install or choose an appropriate CSI/local storage provider.
- The example installs npm dependencies at container startup for tutorial simplicity. A production deployment should build application images with dependencies preinstalled.
