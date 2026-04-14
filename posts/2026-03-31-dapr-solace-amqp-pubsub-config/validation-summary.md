# Validation Summary: How to Configure Solace AMQP for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (pub/sub component system)
- Solace PubSub+ Standard (enterprise messaging platform)
- AMQP 1.0 protocol
- Docker (for running Solace broker)
- Solace SEMP v2 REST API (broker management)
- Kubernetes (secrets, component deployment)
- Node.js / JavaScript (@dapr/dapr SDK)

## Sources Consulted
- Dapr components-contrib repository — `pubsub/solace/amqp/` source code and metadata (https://github.com/dapr/components-contrib)
- Dapr official docs — Solace AMQP pub/sub component reference (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-solace-amqp/)
- Solace Docker setup documentation (https://docs.solace.com/Software-Broker/SW-Broker-Set-Up/Containers/Set-Up-Docker-Container-Linux.htm)
- Solace SEMP v2 API architecture docs (https://docs.solace.com/Admin/SEMP/SEMP-API-Archit.htm)
- Solace wildcard topic subscription docs (https://docs.solace.com/Messaging/Wildcard-Charaters-Topic-Subs.htm)
- Solace default port numbers reference (https://docs.solace.com/Admin/Default-Port-Numbers.htm)
- @dapr/dapr npm package (v3.6.1) — DaprClient class and pubsub.publish method signature
- Dapr declarative subscription spec (v1alpha1 and v2alpha1)

## Issues Found
1. **`--shm-size=2g` changed to `--shm-size=1g`**: The official Solace Docker documentation specifies `--shm-size=1g` as the recommended value for the Standard edition. While `2g` would still work (it just over-allocates shared memory), it does not match the official recommendation. Fixed to `1g`.

2. **"Solace CLI (SEMP API)" changed to "SEMP REST API"**: The text incorrectly labeled the SEMP REST API as the "Solace CLI." The Solace CLI is a separate command-line interface accessed via SSH (typically port 2222) or the broker console. The curl commands shown in the post use the SEMP v2 REST management API, not the CLI. Fixed the label to "SEMP REST API."

## Review Notes
- The Dapr declarative subscription uses `apiVersion: dapr.io/v1alpha1`, which is the older API version. The current recommended version is `dapr.io/v2alpha1` with a slightly different spec structure (`routes.default` instead of `route`). However, v1alpha1 is still supported and the format shown is valid, so no change was made.
- The Dapr Solace AMQP component is listed as **beta** status in the Dapr component registry. This is worth noting for production deployments but is not an error in the post.
- The Solace `>` wildcard requires at least one more topic level — e.g., `orders/>` matches `orders/new` but not `orders` by itself. The post's usage is correct but readers should be aware of this behavior.
