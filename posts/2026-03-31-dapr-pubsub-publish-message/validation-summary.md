# Validation Summary: How to Publish a Message Using the Dapr Pub/Sub API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Dapr HTTP API (publish endpoint)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK (`dapr-client`)
- Dapr Node.js SDK (`@dapr/dapr`)
- CloudEvents specification
- Redis (as pub/sub broker example)

## Sources Consulted
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Bulk Publish documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr JavaScript Client SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JS SDK source (DaprClient): https://github.com/dapr/js-sdk/blob/main/src/implementation/Client/DaprClient.ts
- Dapr Go SDK client package: https://github.com/dapr/go-sdk/tree/main/client
- Dapr Python SDK: https://github.com/dapr/python-sdk
- Dapr Quickstarts (pub/sub): https://github.com/dapr/quickstarts/tree/master/pub_sub
- CloudEvents specification v1.0: https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md

## Issues Found

1. **Description mentioned gRPC but post does not cover it.** The description claimed the post covers "the HTTP API, gRPC, and language SDKs" but there is no gRPC section in the post. Changed to "the HTTP API and language SDKs".

2. **Bulk publish URL used deprecated alpha API prefix.** The endpoint was `v1.0-alpha1/publish/bulk/...` but the bulk publish API has been stable since Dapr 1.12. Changed to `v1.0/publish/bulk/...`.

3. **Bulk publish response example was incorrect.** The example showed `{"failedEntries": [], "invalidEntries": []}` but `invalidEntries` is not part of the Dapr bulk publish response schema. Additionally, a fully successful bulk publish returns `204 No Content` with no body — the JSON response with `failedEntries` only appears when some entries fail (HTTP 500). Replaced with an accurate description: success returns 204, and the error response format shows `failedEntries` with `entryId`/`error` fields plus an `errorCode`.

## Review Notes
- The Node.js example calls `client.stop()` after publishing. While `DaprClient.stop()` is a valid method, the official Dapr quickstart examples do not call it for short-lived publisher scripts. It is harmless and technically correct but not strictly necessary.
- The HTTP API examples, CloudEvent format, component YAML, Go SDK, and Python SDK usage are all correct and current.
- The `metadata.ttlInSeconds` query parameter usage is correct per Dapr docs.
