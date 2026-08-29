# Which HTTP Status Codes Belong in an Availability SLI?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HTTP, HTTP Status Codes, SLI, SLO, Availability, gRPC

Description: Classify eligible HTTP outcomes by the service promise instead of treating every non-5xx response as success.

---

HTTP status classes describe protocol semantics, not your product promise. “All non-5xx responses are good” is a useful starter SLI for server availability, and Google SRE uses it in an example, but it is not universally correct. A valid request rejected with `429` inside a promised quota can be an availability failure; a `404` for a resource that genuinely does not exist can be a correct response.

Define eligibility and goodness per operation, then implement that policy with status codes plus application context.

## Separate Eligible, Good, and Bad

For each completed interaction, answer:

1. Was this request inside the supported contract and therefore eligible?
2. Did the service provide the intended outcome within its constraints?
3. If not, which failure class explains it?

The SLI is:

```text
good eligible outcomes / all eligible outcomes
```

Do not put unsupported, malformed, abusive, health-check, or internal control traffic in the denominator unless the service explicitly promises an outcome for it.

## Use Status Classes as a Starting Point

| Response | Typical treatment | Questions to resolve |
|---|---|---|
| `1xx` | Not a final outcome | Was a final response observed? |
| `2xx` | Good | Did the body and durable action actually satisfy the operation? |
| `3xx` | Good only when intended | For redirects, did the client follow successfully or enter an unexpected loop? For `304`, was cache revalidation intended? |
| `4xx` | Contract-specific | Was the request invalid, outside quota, or rejected because the service failed? |
| `5xx` | Bad for eligible requests | Did a gateway generate it before the application observed the request? |
| No HTTP response | Often bad | Did DNS, TLS, connection, or timeout failure prevent the outcome? |

RFC 9110 defines `2xx` as successful receipt, understanding, and acceptance, `4xx` as apparent client error, and `5xx` as failure to fulfill an apparently valid request. Those categories help, but application semantics still decide the SLI.

## Classify Important 4xx Cases

- `400` for malformed syntax: normally ineligible. Track it for abuse and client quality, not server availability.
- `401` is normally correct when the request lacks valid authentication credentials; `403` is normally correct when the server understands the request but refuses to fulfill it. If valid sessions are rejected because your identity dependency failed, the user outcome is bad even though the wire status is `401`.
- `404`: good when absence is the correct answer; bad when routing or deployment lost a resource that should exist.
- `408`: investigate the measurement point. An incomplete upload from a client is different from a server that stopped reading within its promised limit.
- `409` or `412`: often a valid concurrency/precondition outcome, but product-specific.
- `429`: exclude requests above a documented customer quota. Count `429` within the supported envelope as bad; capacity protection does not fulfill the request.

Avoid a blanket status regex once these cases matter. Emit bounded labels such as `sli_eligible="true|false"`, `sli_result="good|bad"`, and `sli_reason="server|auth_dependency|quota|client"` at a trusted boundary.

```promql
sum(rate(http_server_requests_total{
  service="orders",
  sli_eligible="true",
  sli_result="good"
}[5m]))
/
sum(rate(http_server_requests_total{
  service="orders",
  sli_eligible="true"
}[5m]))
```

Initialize the expected bounded label combinations, including the eligible/good series, to zero; otherwise an all-bad interval can produce no data rather than an SLI of zero.

Keep `sli_reason` to a controlled vocabulary. Do not label metrics with raw URLs, user IDs, or arbitrary error messages.

## Treat Async Acceptance Carefully

`202 Accepted` only means processing was accepted; RFC 9110 explicitly notes that it may or may not eventually be acted upon. If the promise is durable completion, count the later job outcome, not the `202`. It is reasonable to have two objectives: acceptance availability and completion-by-deadline.

## Handle Cancellations and Deadlines by Cause

A cancellation is not automatically a client fault. gRPC documents `CANCELLED` as typically caller initiated. A client whose deadline expires receives `DEADLINE_EXCEEDED`; the operation may still have completed successfully, while an in-progress server-side call is cancelled when that deadline passes.

Correlate client-side outcomes and deadlines with server-side timestamps; gRPC does not send the client's cancellation reason to the server:

- User navigated away before a reasonable deadline: usually ineligible.
- Client set an impossible deadline outside the supported contract: ineligible.
- Client abandoned because the service exceeded its promised latency: bad.
- Proxy recorded a vendor-specific client-closed code after an upstream stall: bad at the journey layer.
- Caller did not observe successful completion before its supported deadline: bad even if server logs later show success.

Measure at the client when possible; otherwise use the load balancer to expose downstream transport failures and requests that never reach the application. A load balancer cannot observe attempts that fail before reaching it. Reconcile edge and application counts; a large unexplained difference is a telemetry defect.

## Test the Policy

Create fixtures for every eligible status and failure path, including gateway-generated errors, auth dependency failure, within-quota throttling, true client cancellation, deadline expiry, and a dropped connection with no status. Review classifications with product, API owners, and support before using the budget for decisions.

## References

- [RFC 9110: HTTP Semantics, Status Codes](https://www.rfc-editor.org/rfc/rfc9110.html#section-15)
- [Google SRE Workbook: API and HTTP server availability](https://sre.google/workbook/implementing-slos/)
- [gRPC status codes](https://grpc.io/docs/guides/status-codes/)
- [gRPC deadlines](https://grpc.io/docs/guides/deadlines/)
- [gRPC cancellation](https://grpc.io/docs/guides/cancellation/)

## Conclusion

Status codes are evidence, not the SLO definition. Count valid promised interactions, classify their actual outcomes, and preserve enough causal context to distinguish correct rejection from a service-caused failure.
