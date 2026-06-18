# Validation Summary: How to Handle WebSocket Binary Messages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol and browser WebSocket API
- JavaScript ArrayBuffer, Blob, DataView, Web Crypto API
- Node.js with the ws WebSocket library
- Node.js Buffer, fs, streams, and crypto APIs
- Python asyncio and websockets
- Protocol Buffers with protobuf.js
- MessagePack with @msgpack/msgpack

## Sources Consulted
- RFC 6455: The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- MDN WebSocket binaryType: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/binaryType
- MDN WebSocket message event: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/message_event
- ws API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- Python websockets 16.0 asyncio server API: https://websockets.readthedocs.io/en/stable/reference/asyncio/server.html
- Python websockets upgrade guide: https://websockets.readthedocs.io/en/stable/howto/upgrade.html
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html
- Node.js fs documentation: https://nodejs.org/api/fs.html
- MDN SubtleCrypto digest: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
- protobuf.js documentation: https://github.com/protobufjs/protobuf.js/
- @msgpack/msgpack documentation: https://github.com/msgpack/msgpack-javascript/blob/main/README.md
- MessagePack overview/spec reference: https://msgpack.org/

## Issues Found
- The Blob receiving example reused one object URL for image display and download, then revoked it in multiple places. Changed it to use separate object URLs so revoking the image URL cannot invalidate the download URL.
- The Blob example called an undefined `processBuffer()` helper. Added a minimal helper so the snippet is syntactically complete.
- The Node.js binary protocol parser read the custom 5-byte header without checking the buffer length. Added length validation before `readUInt8()` and `readUInt32LE()`, plus a payload-length check.
- The Node.js file upload example wrote to `/tmp/uploads` without ensuring the directory existed. Added `fs.mkdir(..., { recursive: true })` before `fs.writeFile()`.
- The Node.js example referenced undefined `processSensorData()` and `processCommand()` helpers. Added minimal placeholders to keep the example runnable.
- The Python websockets example used the deprecated two-argument connection handler signature `handle_connection(self, websocket, path)`. Updated it to the current one-argument handler expected by the modern asyncio API.
- The Python binary protocol parser checked for a short header but not an incomplete payload. Added a payload-length guard.
- The MessagePack example and summary made broad size and speed claims that are data-dependent. Reworded them to avoid presenting benchmark-dependent results as guarantees.
- The best-practices list recommended chunking for data larger than a few KB. Reworded it to recommend chunking for large transfers when progress reporting, integrity checks, or application-level flow control are needed.

## Review Notes
- Verified the edited JavaScript code blocks with `node --check`.
- Verified the Python code block with `python3 -m py_compile`.
- The examples remain illustrative and omit production concerns such as authentication, authorization for requested file paths, upload size enforcement, and robust close/error handling.
