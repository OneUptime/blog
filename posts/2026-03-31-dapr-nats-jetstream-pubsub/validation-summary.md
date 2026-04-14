# Validation Summary: How to Configure Dapr with NATS JetStream Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub component system)
- NATS JetStream (durable messaging)
- NATS Helm chart for Kubernetes
- Dapr JavaScript SDK (`@dapr/dapr`)
- NATS CLI (`natscli`)

## Sources Consulted
- Dapr components-contrib source code (`pubsub/jetstream/metadata.go`, `metadata.yaml`) — https://github.com/dapr/components-contrib
- Dapr JS SDK source code (`@dapr/dapr` v3.x) — https://github.com/dapr/js-sdk
- NATS Helm chart values.yaml — https://github.com/nats-io/k8s
- NATS CLI source code — https://github.com/nats-io/natscli
- NATS Server release history for JetStream GA version

## Issues Found

1. **NATS version requirement was incorrect.** The post stated "version 2.6 or later" for JetStream support. JetStream was GA in NATS Server 2.2.0 (March 2021); there is nothing special about 2.6. Changed to "version 2.2 or later".

2. **Helm chart values for JetStream file storage were wrong.** The post used `config.jetstream.fileStorage.enabled` and `config.jetstream.fileStorage.size`, but the official NATS Helm chart uses `config.jetstream.fileStore.enabled` and `config.jetstream.fileStore.pvc.size`. Fixed both values.

3. **`maxMessages` is not a valid Dapr JetStream metadata field.** There is no such field in the component metadata schema. The closest fields are `maxDeliver` (already present) and `maxAckPending`. Removed the invalid field.

4. **`deliverAll` is not a valid Dapr JetStream metadata field.** The correct field is `deliverPolicy`, which accepts string values: `"all"`, `"last"`, `"new"`, `"sequence"`, or `"time"`. Replaced `deliverAll: "false"` with `deliverPolicy: "new"` in the main component config, and `deliverAll: "true"` with `deliverPolicy: "all"` in the Replaying Messages section.

## Review Notes
- The `nats server info` command used for verification requires system account privileges. In practice, `nats account info` may be more reliable inside a pod without special credentials. This is a usability concern rather than a technical error, so it was left as-is.
- The `startSequence` value of `"0"` is technically valid but effectively means "not set" in Dapr's implementation (it is only applied to the consumer config when > 0). This is acceptable behavior for the tutorial context.
- The `backOff` field format (`"1s,2s,4s,8s,16s"`) is correct; Dapr's metadata decoder handles comma-separated duration slices.
- All JavaScript SDK code examples (`DaprClient`, `DaprServer`, `pubsub.publish`, `pubsub.subscribe`) were verified as correct and current against the latest SDK (v3.6.1).
