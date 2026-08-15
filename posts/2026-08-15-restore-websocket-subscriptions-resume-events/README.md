# Restore WebSocket Subscriptions and Resume Missed Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WebSocket, Event Streaming, Reconnection, Subscriptions, Cursors, JavaScript

Description: Reconnect a WebSocket without silent gaps by replaying desired subscriptions and resuming from durable event cursors.

---

Reopening a WebSocket restores only the transport. It does not restore application subscriptions, recover events sent while the client was offline, or prove that the client's local view is current.

Reliable recovery needs two separate mechanisms: replay the desired subscription set, then resume each stream from an acknowledged cursor.

## WebSocket Does Not Define Resume Semantics

RFC 6455 provides an opening handshake, message framing, and a closing handshake. The meaning of text and binary messages is left to the application or negotiated subprotocol. A fresh connection therefore has no standard knowledge of the previous connection's subscriptions or last processed event.

Design an application protocol with explicit identifiers:

```json
{
  "type": "subscribe",
  "subscriptionId": "orders:tenant-42",
  "topic": "orders",
  "afterEventId": "0192837465"
}
```

The server should acknowledge the subscription and either replay events after that cursor or reject it with a defined recovery response.

## Track Desired State Separately from Socket State

Do not remove a subscription merely because the socket closed. Keep the caller's desired subscriptions in a registry and replay them only after the new connection is authenticated and ready:

```typescript
type Subscription = {
  id: string;
  topic: string;
  lastAppliedEventId?: string;
};

class SubscriptionRegistry {
  private desired = new Map<string, Subscription>();

  add(subscription: Subscription): void {
    this.desired.set(subscription.id, subscription);
  }

  remove(id: string): void {
    this.desired.delete(id);
  }

  get(id: string): Subscription | undefined {
    return this.desired.get(id);
  }

  restore(socket: WebSocket): void {
    for (const sub of this.desired.values()) {
      socket.send(JSON.stringify({
        type: "subscribe",
        subscriptionId: sub.id,
        topic: sub.topic,
        afterEventId: sub.lastAppliedEventId ?? null,
      }));
    }
  }
}
```

Call `restore` after the application-level `ready` or authentication acknowledgement, not merely from `onopen`. Sending subscriptions before authentication completes can race with server initialization.

## Advance the Cursor After Applying the Event

An event cursor should represent committed local progress:

```typescript
async function onEvent(event: StreamEvent): Promise<void> {
  const sub = registry.get(event.subscriptionId);
  if (!sub) return;

  if (sub.lastAppliedEventId === event.eventId) return;

  await localStore.transaction(async (tx) => {
    await tx.applyEventIdempotently(event);
    await tx.saveCursor(event.subscriptionId, event.eventId);
  });

  sub.lastAppliedEventId = event.eventId;
}
```

Persisting the projection and cursor atomically prevents two bad outcomes:

- Saving the cursor first can skip an event if the client crashes before applying it.
- Applying first without idempotency can duplicate effects if the client crashes before saving the cursor.

Assume at-least-once delivery across reconnects. Deduplicate by a stable event ID, not by arrival time.

## Define Ordering and Retention

A single global cursor is valid only if the server guarantees one total order. Independent topics or partitions usually need independent cursors. If events can arrive out of order, use a server-defined sequence and a gap detector instead of comparing opaque IDs lexically.

The server also needs a replay retention policy. When `afterEventId` is too old, it should return a typed response such as:

```json
{
  "type": "resume_rejected",
  "subscriptionId": "orders:tenant-42",
  "reason": "cursor_expired",
  "snapshotUrl": "/api/orders/snapshot?tenant=42"
}
```

The client can then fetch a consistent snapshot, replace its local projection, store the snapshot cursor, and resubscribe from that point. Silently starting from "now" hides data loss.

## Avoid Reconnect Races

Associate handlers with a connection generation. Ignore late messages and acknowledgements from an older socket after a newer socket becomes active. Make subscription IDs stable across reconnects, but include a connection generation if the server needs to distinguish duplicate subscribe commands.

Backoff only the transport connection. Once connected, restore subscriptions in a controlled batch so thousands of subscriptions do not create a second thundering herd. Bound concurrent snapshot recovery and honor server rate-limit signals.

Server-Sent Events provide a useful contrast: the HTML standard defines `Last-Event-ID` for reconnecting an `EventSource`. WebSocket has no equivalent, so a WebSocket application must define and test its own cursor contract.

## Official Documentation

- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455.html)
- [WHATWG WebSockets Standard](https://websockets.spec.whatwg.org/)
- [HTML Standard: Server-sent events and `Last-Event-ID`](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MDN WebSocket `open` event](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/open_event)
- [MDN WebSocket `message` event](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/message_event)

## Conclusion

Reconnect is a transport operation; recovery is an application protocol. Preserve desired subscriptions, resume from per-stream committed cursors, tolerate replay, and require an explicit snapshot path when the server can no longer honor a cursor.
