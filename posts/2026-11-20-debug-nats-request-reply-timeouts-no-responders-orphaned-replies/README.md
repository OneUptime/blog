# Debug NATS Request-Reply Timeouts and Orphaned Replies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NATS, Messaging, Go, Troubleshooting

Description: Separate no-responders errors from request deadlines, trace late replies through inbox permissions, and retry safely when a responder may already have completed work.

A request times out. The responder logs that it finished successfully. Both statements can be true: the caller stopped waiting before the response arrived. Increasing every timeout may hide the symptom while leaving duplicate side effects, permission errors, and slow handlers untouched.

Debug the request and reply as two separate publications joined by a temporary reply subject. This walkthrough uses **NATS Server 2.11.4** and **nats.go v1.42.0**. It focuses on Core NATS request-reply, not JetStream pull requests or a durable job queue.

## Establish what the caller actually observed

The caller publishes a request with a reply address, usually under `_INBOX`. A responder receives that address and publishes its answer there. The client matches the reply to a waiting request. The [request-reply resilience guide](https://docs.nats.io/learn/resilient-clients/request-reply-resilience) describes the exchange and the no-responders signal.

| Caller result | What it establishes | What it does not establish |
| --- | --- | --- |
| Reply received | A reply arrived before the caller stopped waiting | The business operation succeeded; inspect the response |
| No responders | The server reported no matching responder interest visible for that request | Every instance of the service is down everywhere |
| Timeout | No accepted reply arrived within the wait | The responder never received or executed the operation |
| Context canceled | The caller canceled its local wait | Remote execution was canceled |
| Other client error | A specific connection or API operation failed | A generic service-latency problem |

An authorization failure, broken reply path, reconnecting client, or overloaded handler can all appear near a timeout. Do not diagnose database latency from that one result alone.

## Classify errors without parsing their text

This helper is for Go code importing `context`, `errors`, and `github.com/nats-io/nats.go`. It separates outcomes suitable for low-cardinality metrics, meaning a small fixed set of labels rather than one label per request.

```go
func outcome(err error) string {
    switch {
    case err == nil:
        return "reply"
    case errors.Is(err, nats.ErrNoResponders):
        return "no_responders"
    case errors.Is(err, context.DeadlineExceeded),
        errors.Is(err, nats.ErrTimeout):
        return "timeout"
    case errors.Is(err, context.Canceled):
        return "canceled"
    default:
        return "transport_or_client_error"
    }
}
```

The distinction between `context.DeadlineExceeded` and `nats.ErrTimeout` matters when different call sites use context-based and duration-based APIs. The [pinned context implementation](https://github.com/nats-io/nats.go/blob/v1.42.0/context.go) returns the context's error when its deadline or cancellation wins. It also maps the protocol's empty 503 response to `ErrNoResponders`.

At the call site, keep the deadline local and explicit:

```go
ctx, cancel := context.WithTimeout(parent, 750*time.Millisecond)
defer cancel()

msg := nats.NewMsg("inventory.check")
msg.Header.Set("X-Request-ID", requestID)
msg.Data = payload
started := time.Now()
reply, err := nc.RequestMsgWithContext(ctx, msg)
log.Printf("request_id=%s outcome=%s elapsed=%s",
    requestID, outcome(err), time.Since(started))
if err != nil {
    return err
}
return handleReply(reply.Data)
```

This fragment belongs inside a function returning an error. Supply `parent`, a connected `nc`, a non-sensitive correlation identifier `requestID`, the request bytes `payload`, and your response-validation function `handleReply`. It additionally imports `time` and `log`. The header is an application convention, not automatic duplicate protection. Log the identifier at the responder too, without logging credentials or sensitive payloads.

## Trace the request in order

First compare the exact request subject, account, and service import/export configuration. A subscription to `inventory.check` in a different account is not automatically visible. A typo, missing import, or responder that has not registered its subscription can explain no responders even while its process is running.

Next establish subscription readiness. During startup, creating a subscription locally is not the same observation as the server having processed it. A bounded `FlushTimeout` after subscription setup is useful before declaring a test responder ready. It does not certify database readiness or handler health.

Then examine the responder's receipt and processing timestamps for the correlation ID. Separate time spent waiting behind other work from time spent inside the handler. A matching subscription can exist while its handler is blocked or deliberately never replies; that case normally reaches the caller's deadline rather than producing no responders.

Finally inspect reply handling. Verify that the handler calls `Respond`, checks its error, and uses the received reply address rather than inventing a subject from the request ID. Also collect asynchronous client errors. Publish and subscription permission violations may arrive through the error callback, so a timeout log alone can omit the cause.

## Understand an orphaned reply

Here, an orphaned reply means a response that arrives after its request is no longer waiting. It is an application troubleshooting term, not a durable NATS queue you can browse later.

```mermaid
sequenceDiagram
    participant C as Caller
    participant N as NATS
    participant R as Responder
    C->>N: Request with reply inbox
    N->>R: Deliver request
    Note over C: Deadline expires; caller returns
    R->>R: Finish business operation
    R->>N: Publish late reply
    N-->>C: Reply may reach client transport
    Note over C: Original request is no longer waiting
```

In the pinned Go client, the context timeout removes the pending request entry. The response handler normally uses the reply token to find that entry and delivers one response to its waiter. A late response therefore does not rescue the already-returned call. See the [request map and response handler](https://github.com/nats-io/nats.go/blob/v1.42.0/nats.go).

The responder's `Respond` returning nil is not proof that the original caller consumed the answer. Core publication does not provide a business-level receipt. Nor does canceling the caller's context send a general-purpose remote cancellation message. If cancellation is required, design a separate protocol and decide what it means once an irreversible operation has started.

## Check permissions in both directions

The requester needs publication rights on the service subject and subscription rights covering its actual inbox prefix. The responder needs subscription rights on the service subject and an appropriate way to publish replies. A custom inbox prefix must agree with the requester's client configuration and its authorization rules.

Do not solve a failed reply by granting broad publication rights everywhere. NATS supports response-oriented permissions; the [authorization documentation](https://docs.nats.io/learn/security/authorization) explains the available controls. Review their response count and time limits against your service's behavior, especially for intentionally delayed or multiple responses.

Also check account boundaries and imports. A successful request crossing a boundary does not justify assuming any arbitrary reply subject will traverse the same path. Preserve the address provided by the server/client flow and test with the real identities.

## Retry only with a business-safe rule

For a read-only inventory lookup, a bounded retry within the overall user deadline may be reasonable. For a charge, reservation, or write, a timeout means the result may be unknown. Retry with the same operation identifier only if the service stores and enforces idempotency, or query the existing operation's status first.

Use bounded attempts, backoff, and jitter. Do not restart a full timeout budget after every attempt indefinitely. Count original requests and retries separately so a failing dependency cannot quietly multiply load.

Our local fixture distinguished absent responders from a subscribed-but-silent handler, observed a late reply published after the caller's deadline, and verified that a subsequent request received its own fresh response. It also checked canceled-context classification. Those tests did not exercise account imports, TLS, authorization failures, or real database side effects. Reproduce those boundaries in staging before treating a retry policy as safe for production writes.
