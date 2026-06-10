# Validation Summary: How to Build Real-time Applications with Go and SSE (Server-Sent Events)

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Go (`net/http`, `http.Flusher`, `context`, goroutines, channels, `sync.RWMutex`)
- Server-Sent Events (SSE) protocol (WHATWG HTML spec)
- JavaScript `EventSource` API
- Nginx (reverse proxy configuration for SSE)
- HAProxy (long-lived connection handling)
- AWS Application Load Balancer (idle timeout)
- Redis pub/sub via `github.com/redis/go-redis` v9 (horizontal scaling)
- Linux `ulimit` / `/etc/security/limits.conf`

## Sources Consulted
- WHATWG HTML Living Standard, Server-Sent Events section: https://html.spec.whatwg.org/multipage/server-sent-events.html
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- AWS Application Load Balancer attributes documentation (default idle timeout = 60s): https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- HAProxy SSE timeout discussion (community / issue tracker)
- go-redis v9 PubSub guide: https://redis.uptrace.dev/guide/go-redis-pubsub.html
- Nginx `proxy_*` directive documentation

## Issues Found

1. **Race condition: concurrent writes to `http.ResponseWriter` from a heartbeat goroutine.**
   - The "Heartbeats" section showed a standalone `startHeartbeat` function and recommended launching it with `go startHeartbeat(ctx, w, flusher)` while the main handler loop also writes to the same `w`. The dashboard example had the same pattern (an inline `go func()` heartbeat).
   - `http.ResponseWriter` (and `http.Flusher`) is not documented as safe for concurrent use, and the underlying buffered writer in `net/http` is not goroutine-safe. The race is real (would be caught by `-race`).
   - **Fix**: Removed the goroutine-based heartbeat pattern from both the Heartbeats section and the dashboard example. Replaced with the canonical safe pattern — a `time.Ticker` added as an additional `case` in the same `select` loop that writes events, so all writes to `w` happen from a single goroutine. Added a brief inline note explaining why.

2. **Misleading HAProxy recommendation.**
   - Original text recommended `option http-server-close` "to allow long-lived connections". This directive controls connection reuse mode and does not actually solve the SSE timeout problem. For SSE the relevant knobs are `timeout client` and `timeout server`; `timeout tunnel` doesn't apply because SSE doesn't perform a protocol upgrade.
   - **Fix**: Replaced the bullet to recommend raising `timeout client` and `timeout server` above the heartbeat interval, with a note that `timeout tunnel` only applies after a protocol upgrade (e.g., WebSockets).

## Review Notes
- SSE protocol claims (blank line as event separator, `:`-prefixed comments, `retry:` in milliseconds, `Last-Event-ID` reconnection header, default event type `message`, multi-line `data:`) all verified correct against the WHATWG spec.
- Nginx config (`proxy_buffering off`, `proxy_http_version 1.1`, `proxy_set_header Connection ""`, long `proxy_read_timeout`) is correct for SSE.
- AWS ALB default idle timeout claim (60s) is correct.
- go-redis v9 API usage (`rdb.Subscribe(ctx, "events")`, `pubsub.Channel()`) is correct. A minor improvement (not made, to avoid scope creep) would be to `defer pubsub.Close()` and check the `Unmarshal` error.
- The `EventBuffer.Add` method uses `eb.events = eb.events[1:]` followed by `append`. This is functionally correct but allocates a new backing array on every push once the buffer is full; a rotating index ring buffer would be more efficient. Left as-is since the code works correctly.
- The notification handler writes `userID` directly into a JSON string via `fmt.Fprintf`, which would break if `userID` contained `"` or `\n`. Acceptable for a tutorial illustrating the flow; would want `json.Marshal` in production. Left as-is.
- The `Connection: keep-alive` response header set in several handlers is unnecessary on HTTP/1.1 (it's default) and is stripped by Go's HTTP/2 server (Connection is a hop-by-hop header forbidden in HTTP/2). Harmless, common in SSE examples — left as-is.
