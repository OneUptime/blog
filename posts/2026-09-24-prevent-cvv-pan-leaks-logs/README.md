# How to Prevent CVV and Full Card Numbers from Leaking into Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Logging, Data Security

Description: Prevent card-data logging at collection points, use explicit event schemas, and test every telemetry destination with synthetic payment flows.

---

The most reliable way to keep card numbers out of logs is to prevent logging systems from receiving them. Redacting a central search index is too late if the original payload has already been written to a proxy spool, trace exporter queue, crash report, or vendor ingestion buffer.

For merchant payment flows, card verification codes must not remain stored after authorization, even encrypted. That rule includes accidental storage in troubleshooting logs. [PCI SSC FAQ 1319](https://www.pcisecuritystandards.org/faqs/1319/) makes both the prohibition and the need to prevent retention explicit.

## Inventory the points that can copy a request

Follow a payment request from the browser to the processor and list every observer. Include the CDN or WAF, load balancer, reverse proxy, API middleware, application logger, APM agent, trace instrumentation, exception tracker, queue consumer, and support tooling.

Review the following separately:

| Data source | Common accidental capture | Safer design |
| --- | --- | --- |
| HTTP middleware | Entire request body on errors | Route, method, status, internal correlation ID |
| SDK exceptions | Serialized provider request | Controlled error category and provider request reference |
| Browser recording | Form values or DOM snapshots | Exclude payment pages and sensitive fields using vendor-supported controls |
| Database diagnostics | Bound SQL parameters | Query shape and execution metadata |
| Retry messages | Original payment submission | Provider reference and operation state |

If a hosted provider can collect card details directly, use that boundary to remove raw card data from the application path. If your service legitimately handles PAN, apply the logging controls before serialization, buffering, and export.

## Build a schema from operational questions

Ask what an engineer needs to answer during an incident. Usually it is which order failed, where it failed, whether the processor accepted the operation, and whether retrying is safe. Those questions rarely require a PAN or CVV.

An example payment event is:

```json
{
  "event": "payment.authorization",
  "order_id": "ord_example",
  "attempt_id": "attempt_example",
  "provider_request_id": "provider_example",
  "outcome": "declined",
  "reason_code": "processor_decline",
  "duration_ms": 427
}
```

Generate identifiers from trusted application records. Keep event names, outcomes, and reason codes constrained to a known vocabulary. Do not put a customer-supplied message into `reason_code`, and do not embed arbitrary exception objects into the event.

This is an allowlist: only named, reviewed values enter the logger. A denylist that removes `card_number` but leaves `paymentPayload`, `debug`, or `request` is easy to bypass accidentally.

## Stop broad capture at the source

Disable request- and response-body capture on payment routes in each product that can collect it. Check error-only capture, debug modes, sampling overrides, and administrative “capture next request” features. A setting disabled for successful responses may still be active for failures.

Configure exception reporting to exclude local variables and request bodies containing sensitive input. Review headers and URL query strings too; card data should not be placed in URLs, where many infrastructure products record it automatically.

The [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) recommends excluding payment card data and other sensitive values from logs. OpenTelemetry's [sensitive-data guidance](https://opentelemetry.io/docs/security/handling-sensitive-data/) describes minimizing collection and processing telemetry to remove sensitive attributes. Collector processing is useful defense in depth, but it cannot undo upstream disk writes.

## Use detection without assuming perfect recognition

PAN-like pattern checks can flag likely leaks, including formatted values with spaces or hyphens. They cannot prove absence: encodings, nested structures, unexpected lengths, and truncated values complicate detection.

CVVs are particularly unsuitable for generic content-based recognition. A three- or four-digit string is indistinguishable from many harmless numbers without context. Prevent collection by field and data path instead of trying to identify every possible verification code in a text stream.

Do not hash CVVs for correlation or retain an encrypted copy for support. Use an attempt identifier. For PAN matching, do not add an ad hoc hash to logs; current PCI DSS has specific requirements for keyed hashing used to render PAN unreadable, and correlation can expand risk.

## Verify all destinations with controlled fixtures

Use processor-approved test cards and synthetic verification values in a non-production test. Exercise successful authorization, validation failure, timeout, retry, provider decline, and unhandled exception. Inspect local application files, collector queues, vendor error events, and exported archives.

Check that useful operational events survive the filtering. A logging change that deletes the entire audit trail solves the wrong problem. Keep required access and security events while excluding payment payloads.

When you find real data, invoke the organization's incident process, restrict access to the affected stores, stop further ingestion, and coordinate containment and removal with the relevant security and compliance owners. Do not paste the offending record into a ticket as evidence. Record its location and a safe identifier instead.

Maintain a regression checklist with the logging schema and capture settings. Re-run the relevant checks whenever payment instrumentation, middleware, or observability vendors change.
