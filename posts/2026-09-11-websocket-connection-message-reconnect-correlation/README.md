# Correlate WebSocket Connections, Messages, and Reconnects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, WebSocket, Node.js, Messaging, Observability

Description: Separate WebSocket connection, message, and workflow identities, establish per-message logging scopes, and create fresh connection IDs after reconnects.

---

A WebSocket connection can last for hours and carry thousands of unrelated commands. Reusing its connection ID as the only correlation ID turns every log search into a large pile of events. Reusing that ID after reconnects also hides which transport session actually failed.

Use separate identifiers for the connection, the individual message, and any longer business workflow. The connection ID explains transport behavior. The message ID explains one envelope. A workflow correlation ID connects related operations across messages and reconnects when the application has a real workflow to preserve.

## Assign identifiers by lifetime

| Identifier | Lifetime | Example use |
| --- | --- | --- |
| `connection_id` | one successful connection | close events and transport errors |
| `message_id` | one server-created message | delivery and reply matching |
| `correlation_id` | one command or known workflow | application logs and processing |
| `client_message_id` | client-provided request reference | matching the client's local request |

Treat client references as untrusted input. Validate them and never let knowledge of an ID authorize a resume, subscription, or command.

Browser WebSocket construction accepts a URL and optional subprotocols, not an arbitrary request-header object. Use the application's message envelope for per-command metadata. Avoid putting identifiers or credentials into URLs simply to imitate HTTP headers; URLs can appear in proxy logs and history.

## Establish context for each message

This local demonstration uses `ws` and Node.js `AsyncLocalStorage`. Install `ws`, save the file as `server.mjs`, and run it with Node:

```javascript
import { WebSocketServer, WebSocket } from 'ws';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

const messages = new AsyncLocalStorage();
const server = new WebSocketServer({
  host: '127.0.0.1', port: 8080, maxPayload: 64 * 1024,
});
const validReference = /^[A-Za-z0-9_-]{1,64}$/;

function log(event, fields = {}) {
  console.log(JSON.stringify({ ...fields, ...messages.getStore(), event }));
}

server.on('connection', (socket) => {
  const connectionId = randomUUID();
  socket.send(JSON.stringify({ type: 'hello', connection_id: connectionId }));

  socket.on('message', (data, isBinary) => {
    if (isBinary) return socket.close(1003, 'Text messages required');
    let command;
    try { command = JSON.parse(data.toString()); }
    catch { return socket.close(1007, 'Invalid JSON'); }
    if (!command || command.type !== 'ping'
        || typeof command.id !== 'string'
        || !validReference.test(command.id)) {
      return socket.close(1008, 'Invalid command');
    }

    const context = Object.freeze({
      connection_id: connectionId,
      correlation_id: randomUUID(),
      client_message_id: command.id,
    });
    messages.run(context, async () => {
      try {
        log('command.started');
        await Promise.resolve();
        if (socket.readyState !== WebSocket.OPEN) {
          log('command.reply_unavailable');
          return;
        }
        socket.send(JSON.stringify({
          type: 'pong',
          id: randomUUID(),
          in_reply_to: command.id,
          correlation_id: context.correlation_id,
          connection_id: connectionId,
        }), (error) => {
          log(error ? 'reply.failed' : 'reply.written');
        });
      } catch (error) {
        log('command.failed', { error_type: error.name });
      }
    });
  });

  socket.on('error', () => {
    console.error(JSON.stringify({ event: 'connection.error', connection_id: connectionId }));
  });
  socket.on('close', (code) => {
    console.log(JSON.stringify({ event: 'connection.closed', connection_id: connectionId, code }));
  });
});
```

The server creates a fresh correlation scope per command, so overlapping asynchronous message handlers cannot overwrite each other's ID. The connection ID is captured separately for transport events that occur outside a message scope.

This is a local correlation example. Before exposing it, integrate authentication, origin validation, authorization for each command, rate limiting, and application backpressure into the upgrade and message handling paths.

## Keep replies and delivery claims precise

The reply has its own server message ID and an `in_reply_to` reference to the client's message. The server-generated correlation ID is also returned so the UI can display it when reporting a failed operation.

A successful `socket.send` callback means the write completed according to the library's contract; it does not prove the remote application processed the message. If business delivery matters, define an application acknowledgement containing the message ID and persist the relevant state.

Never use a correlation ID as an idempotency key by accident. A client retry after reconnect may need the same command identity to prevent duplicate side effects while receiving a new transport connection ID and processing-attempt ID.

## Handle reconnects as new transports

After a disconnect, the browser creates a new WebSocket and receives a new `connection_id`. Log a relationship to the previous connection only when the application has validated a resume session or another trustworthy association.

Do not let a caller submit someone else's connection ID and thereby access their subscriptions. Resume tokens and authorization state belong to the security protocol; diagnostic identifiers merely describe the outcome.

A continuing import, collaboration session, or order workflow may preserve a durable workflow ID. Resolve it through authenticated application state and include it in message logs alongside the current connection ID. New independent commands should still receive their own operation identities.

## Verify concurrent messages and reconnection

Open two clients and send several commands concurrently. Confirm every reply points to the right client message, all messages on one socket share its connection ID, and each independent command has its own correlation ID.

Disconnect while a command is processing and reconnect. Verify the new hello contains a different connection ID and the old operation's failure records remain searchable. Send invalid JSON and an oversized message to confirm the diagnostic path does not log uncontrolled payload content.

The [ws API reference](https://github.com/websockets/ws/blob/master/doc/ws.md) documents message events, payload limits, sends, and lifecycle events. Inspect the version you deploy when selecting limits and delivery handling.

## Conclusion

Use connection IDs for transport sessions, message IDs for envelopes, and correlation IDs for operations or validated workflows. Create a fresh message scope for every command and a new connection ID on reconnect so logs remain specific even when a socket is long-lived.

## Official Documentation

- [ws WebSocket API](https://github.com/websockets/ws/blob/master/doc/ws.md)
- [WebSocket standard](https://websockets.spec.whatwg.org/)
- [Node.js asynchronous context](https://nodejs.org/api/async_context.html)
