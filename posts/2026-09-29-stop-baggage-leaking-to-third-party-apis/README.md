# How to Stop OpenTelemetry Baggage from Leaking Customer IDs to Third-Party APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Context Propagation, Security, Python

Description: Keep customer identifiers out of third-party requests by applying destination-aware baggage policy before HTTP instrumentation injects headers.

An internal customer identifier placed in OpenTelemetry baggage can reach a payment, messaging, or analytics provider through an instrumented HTTP client. Removing that identifier from exported spans does not remove it from the outgoing HTTP request. The two operations happen at different points.

OpenTelemetry explicitly calls out unintended third-party propagation and the lack of integrity protection for baggage. Treat it as untrusted request metadata, with a separate decision about which destinations may receive it. [Baggage concepts](https://opentelemetry.io/docs/concepts/signals/baggage/)

## Map where the identifier travels

Start with one synthetic identifier in a test environment. Inspect baggage at ingress, immediately before the outbound client call, and at a controlled receiving endpoint. Use a mock provider you operate; do not send a real customer identifier merely to confirm a suspected leak.

Record which layer injects headers: an HTTP library integration, language agent, application wrapper, gateway, or service mesh. Two injectors can undo each other's filtering. Also inspect manually supplied headers and retry/redirect behavior. A safe first request does not establish that a redirected request is safe.

Choose a policy with explicit boundaries:

| Destination | Example baggage policy |
| --- | --- |
| Approved internal service | Allow only documented, bounded fields |
| External provider | Clear all baggage by default |
| Unknown or dynamically selected host | Apply the external policy |
| Redirect target | Reevaluate the destination before forwarding |

An internal hostname suffix alone is not a trust proof. Match parsed scheme, host, and port using your service inventory and enforce the same boundary at egress.

## Clear the active baggage before injection

In Python, clearing baggage returns a new context. It does not mutate the current context in place. Attach that context around the client operation so instrumentation sees it, and always restore the previous context. [Python baggage API](https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html)

```python
from opentelemetry import baggage, context

def call_external(send_request):
    external_context = baggage.clear(context.get_current())
    token = context.attach(external_context)
    try:
        return send_request()
    finally:
        context.detach(token)
```

Here `send_request` is a synchronous callback that makes and completes the instrumented request. It must not reuse a manually populated `baggage` header. For asynchronous clients, keep the context attached throughout the awaited operation; do not return an unawaited coroutine and immediately detach.

The trace context remains available, so client spans can still be children of the active request. Decide separately whether the external provider should receive `traceparent` and `tracestate`. Clearing baggage is not a general removal of trace context. [Baggage API specification](https://opentelemetry.io/docs/specs/otel/baggage/api/)

If no service needs distributed baggage, configure the SDK's propagators without the baggage propagator, where supported by the chosen distribution. For example, `OTEL_PROPAGATORS=tracecontext` selects W3C trace propagation alone in implementations supporting that environment setting. It is a process-wide choice; it will also affect internal calls. Confirm the actual bootstrap configuration rather than assuming the environment overrides programmatic initialization. [SDK environment variables](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/)

## Allow only intentional internal fields

An internal allowlist should include field owners, permitted values, maximum lengths, and removal dates. A small routing category can be useful; a raw email address is rarely necessary. Do not derive authorization or tenant access from baggage received over the network.

If an identifier is needed only for local diagnostics, keep it in an access-controlled application record or approved local telemetry field. Hashing an identifier does not automatically make it anonymous, and the result can still be linked across requests.

Redaction at the Collector remains useful for stored telemetry, but it cannot retract headers already sent to another service. Apply outbound filtering before the HTTP library injects the carrier, then test the carrier itself.

## Verify both containment and restoration

Exercise external calls with success, timeout, exception, retry, and redirect outcomes. After each call, make a permitted internal call and verify that the original internal baggage policy still works. Run two requests concurrently with different synthetic identifiers to detect context leakage.

Add a receiver-side assertion that no prohibited baggage key arrived. Checking only exported client spans misses the actual failure mode. Also test preexisting header dictionaries and clients that cache default headers, because they can bypass context-based filtering entirely.

## Conclusion

Keep the policy at the outbound request boundary: select the destination, remove disallowed baggage before instrumentation runs, and restore the calling context afterward. Verify what the receiver sees, including retries and redirects, to prove that customer identifiers stay inside their intended boundary.
