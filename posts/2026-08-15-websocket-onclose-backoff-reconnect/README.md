# Reconnect a Cleanly Closed WebSocket with Backoff

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WebSocket, JavaScript, Reconnection, Backoff, Browser APIs, Resilience

Description: Treat browser WebSocket close events as policy inputs so clean transport shutdowns can reconnect when the application requires it.

---

A browser fires `close` whether the WebSocket ended cleanly or failed abruptly. `CloseEvent.wasClean` indicates whether the connection closed after the WebSocket closing handshake completed. It does not mean that the application should stay disconnected forever.

If the client is expected to maintain a live session, `onclose` must feed a reconnection state machine.

## Transport Cleanliness Is Not Reconnect Policy

The close event exposes three useful fields:

- `code`, the WebSocket close status code
- `reason`, the UTF-8-decoded close reason provided by the server when present
- `wasClean`, whether the connection closed cleanly

A server restart might deliberately send code `1001` and complete a clean closing handshake. That is clean at the WebSocket layer, but a long-lived dashboard may still need to reconnect. Conversely, code `1008` can indicate a policy violation that retrying will not fix.

Define reconnect policy from the code and application state:

```typescript
function shouldReconnect(event: CloseEvent, stoppedByUser: boolean): boolean {
  if (stoppedByUser) return false;

  switch (event.code) {
    case 1000: // Normal closure
      return false; // Change to true for an always-on application session.
    case 1002: // Protocol error
    case 1008: // Policy violation
      return false;
    case 1011: // Server internal error
      return true;
    default:
      return true;
  }
}
```

Close codes are signals, not complete truth. Browsers commonly report `1006` for abnormal closure, but `1006` is a reserved value and cannot be sent in a Close frame. The `3000` to `3999` range is reserved for registered library, framework, and application codes; `4000` to `4999` is for private use by prior agreement. In either range, the client still needs an explicit contract for retry behavior.

## Put `onclose` into a State Machine

Use one scheduled reconnect, cancel it on shutdown, and reset the failure streak only when the connection has reached a meaningful healthy point:

```typescript
class ReconnectingSocket {
  private socket: WebSocket | undefined;
  private reconnectTimer: number | undefined;
  private failures = 0;
  private stopped = true;

  constructor(private readonly url: string) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    const socket = this.socket;
    this.socket = undefined;
    socket?.close(1000, "client shutdown");
  }

  private connect(): void {
    if (this.stopped) return;

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      // If the protocol has an auth/ready acknowledgement, reset there instead.
      this.failures = 0;
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      this.handleMessage(event.data);
    };

    socket.onerror = () => {
      // Observe only. The close event is the single reconnect trigger.
    };

    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = undefined;
      if (!shouldReconnect(event, this.stopped)) {
        this.stopped = true;
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== undefined) return;

    const ceiling = Math.min(30_000, 500 * 2 ** Math.min(this.failures, 10));
    const delay = Math.floor(Math.random() * ceiling);
    this.failures += 1;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
  }

  private handleMessage(data: unknown): void {
    console.log(data);
  }
}
```

Using `close` as the only retry trigger prevents `error` and `close` from scheduling two connections for the same failure.

## Handle Lifecycle and Connectivity Hints

`navigator.onLine` and `online` events can be useful hints, but they do not prove the server is reachable. Keep the capped backoff and optionally let an `online` event bring the next attempt forward.

Also account for page lifecycle. Stop timers when the owning component is destroyed. Decide whether a hidden page should remain connected, and avoid creating a second socket when the page becomes visible again.

The browser WebSocket API has no built-in reconnect, retry, or message replay mechanism. A new `WebSocket` object creates a new protocol connection. Authentication, subscription restoration, and missed-event recovery belong to the application protocol.

## Official Documentation

- [MDN `WebSocket` API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [MDN WebSocket `close` event](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close_event)
- [MDN `CloseEvent.wasClean`](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/wasClean)
- [RFC 6455 close status codes](https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4)
- [WHATWG WebSockets Standard](https://websockets.spec.whatwg.org/)

## Conclusion

A clean close only says that the connection closed after the WebSocket closing handshake completed. Route every `close` event through explicit application policy, schedule at most one jittered reconnect, and stop retrying for user shutdowns or terminal protocol errors.
