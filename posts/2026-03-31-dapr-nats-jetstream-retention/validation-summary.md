# Validation Summary: How to Configure NATS JetStream Retention Policies for Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (pub/sub component)
- NATS JetStream (stream retention policies)
- Python (Dapr SDK for publishing)
- Kubernetes (kubectl commands for NATS CLI access)
- NATS CLI

## Sources Consulted
- Dapr NATS JetStream pub/sub component documentation: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-jetstream/
- Dapr components-contrib source code (pubsub/jetstream/metadata.go, jetstream.go): https://github.com/dapr/components-contrib/tree/main/pubsub/jetstream
- NATS JetStream streams documentation: https://docs.nats.io/nats-concepts/jetstream/streams
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr declarative subscriptions documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/

## Issues Found

### 1. Stream-level config fields incorrectly presented as Dapr component metadata (Critical)
**What was wrong:** The post presented `retentionPolicy`, `maxMsgs`, `maxBytes`, `maxAge`, `maxMsgSize`, `discardPolicy`, and `filterSubject` as valid Dapr `pubsub.jetstream` component metadata fields. These fields do NOT exist in the Dapr JetStream component metadata struct (`metadata.go`) and are not listed in the official Dapr documentation. The Dapr component only manages consumer-level settings; stream-level configuration must be done directly on the NATS server.

**What was changed:**
- Removed all unsupported stream-level fields from the Dapr component YAML (`retentionPolicy`, `maxMsgs`, `maxBytes`, `maxAge`, `maxMsgSize`, `filterSubject`)
- Updated the Overview to clarify that retention policies are configured at the NATS stream level, not through Dapr metadata
- Added a clarifying note to the Dapr Component Configuration section
- Converted the Limits-Based, Work Queue, and Interest-Based Retention sections from invalid Dapr metadata YAML to NATS CLI `nats stream add` commands, which is the correct way to configure stream retention
- Updated the Summary section to accurately describe the configuration approach

**Why:** The Dapr JetStream component's `Subscribe` function only builds a `nats.ConsumerConfig`, not a `nats.StreamConfig`. Streams must be pre-created with the desired retention policy using the NATS CLI, server config, or NATS client libraries.

### 2. Misleading section heading "Creating Streams via NATS CLI"
**What was wrong:** The section was titled "Creating Streams via NATS CLI" but the introductory text said "Verify the stream configuration created by Dapr," implying Dapr creates streams. Additionally, the first comment said "# Install NATS CLI" but the command was actually viewing stream info.

**What was changed:** Renamed section to "Inspecting Streams via NATS CLI", updated intro text to "Verify stream configuration and consumer state", and fixed the misleading comment.

**Why:** Dapr does not create or configure JetStream streams. The commands shown were for inspection, not creation.

## Review Notes
- The Dapr declarative Subscription YAML uses `apiVersion: dapr.io/v1alpha1` with the `route` field. The current Dapr documentation shows `dapr.io/v2alpha1` with `routes.default` as the newer format. Both are functional, but `v1alpha1` is the older format. Not changed since it is still valid.
- The Python SDK code (`publish_event` with `pubsub_name`, `topic_name`, `data`, `data_content_type`) is correct and verified against the SDK source.
- The valid Dapr component metadata fields retained (`natsURL`, `name`, `streamName`, `replicas`, `deliverPolicy`, `ackPolicy`, `ackWait`, `maxDeliver`) were all confirmed in the component source code.
- The NATS JetStream retention policy descriptions (limits, interest, workqueue) are accurate per NATS documentation.
