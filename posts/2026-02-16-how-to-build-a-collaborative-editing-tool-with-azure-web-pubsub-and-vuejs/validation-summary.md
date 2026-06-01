# Validation Summary: How to Build a Collaborative Editing Tool with Azure Web PubSub and Vue.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Web PubSub
- Azure Web PubSub JavaScript server SDK
- Azure Web PubSub Express event handler middleware
- Azure Web PubSub JSON WebSocket subprotocol
- Vue.js
- Node.js and Express
- WebSocket
- Operational Transformation and CRDT concepts

## Sources Consulted
- Microsoft Learn: Azure Web PubSub supported JSON WebSocket subprotocol `json.webpubsub.azure.v1` - https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-json-webpubsub-subprotocol
- Microsoft Learn: `WebPubSubServiceClient` JavaScript API reference - https://learn.microsoft.com/en-us/javascript/api/%40azure/web-pubsub/webpubsubserviceclient?view=azure-node-latest
- Microsoft Learn: `WebPubSubGroup` JavaScript API reference - https://learn.microsoft.com/en-us/javascript/api/%40azure/web-pubsub/webpubsubgroup?view=azure-node-latest
- Microsoft Learn: `WebPubSubEventHandler` JavaScript API reference - https://learn.microsoft.com/en-us/javascript/api/%40azure/web-pubsub-express/webpubsubeventhandler?view=azure-node-latest
- Vue.js Options API lifecycle documentation - https://vuejs.org/api/options-lifecycle
- Yjs documentation - https://docs.yjs.dev/
- Automerge documentation - https://automerge.org/docs/reference/concepts/
- Published npm package type definitions for `@azure/web-pubsub` 1.2.0 and `@azure/web-pubsub-express` 1.0.6

## Issues Found
- The operation model comments listed `retain`, but the code only implements `insert`, `delete`, and cursor updates. Updated the comment to match the code.
- The insert/insert transform comment said the earlier timestamp wins, but the code does not compare timestamps. Reworded the comment to describe the actual position-shift behavior.
- The server sent stringified JSON without explicitly setting `text/plain`. The current JavaScript SDK treats string messages without the text content type as JSON payloads, which can produce an extra JSON-string layer. Added a `sendText` helper and used it for server-to-client messages.
- The broadcast examples used an OData filter string to exclude the sender. Replaced that with the SDK-supported `excludedConnections` option, which avoids quoting issues and matches the documented group send options.
- The token generation included `webpubsub.sendToServerEvent`, which is not a documented role for the JSON WebSocket subprotocol. Removed it; event requests are supported by the subprotocol without that role.
- The operation history trimming broke version-to-history indexing after old operations were discarded. Added `baseVersion` tracking and changed the missed-operation slice calculation to use `op.version - doc.baseVersion`.

## Review Notes
The tutorial remains a simplified collaborative editing example, not a production-grade OT implementation. The post already notes that production use should consider Yjs or Automerge; this is appropriate because robust collaborative text editing requires more complete handling of pending local operations, reconnection, persistence, and complex concurrent edits.
