# Validation Summary: How to Prevent CVV and Full Card Numbers from Leaking into Logs

## Status
validated

## Post Type
Technical security guide with an illustrative JSON logging event and implementation guidance for payment telemetry.

## Technologies Covered
- PCI DSS: primary account numbers (PAN), card verification codes (CVV/CVC), and sensitive authentication data.
- Structured JSON logging, event allowlists, and correlation identifiers.
- HTTP middleware, reverse proxies, WAFs, and request buffering.
- OpenTelemetry instrumentation, Collector processing, and persistent exporter queues.
- APM, exception reporting, browser session recording, and database diagnostics.
- Hosted payment collection and synthetic payment testing.

## Sources Consulted
- PCI SSC FAQ 1319: merchant collection of card verification codes and prohibition on post-authorization storage, including encrypted storage. https://www.pcisecuritystandards.org/faqs/1319/
- PCI SSC FAQ 1573: keyed cryptographic hashing requirements for processes that render PAN unreadable, effective after 31 March 2025. https://www.pcisecuritystandards.org/faqs/1573/
- OWASP Logging Cheat Sheet: sensitive-data exclusion, event attributes, input validation, logging verification, access controls, and preserving security events. https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OpenTelemetry handling sensitive data: collection minimization and attribute filtering/redaction. https://opentelemetry.io/docs/security/handling-sensitive-data/
- OpenTelemetry Collector resiliency: persistent sending queues and disk-backed write-ahead logs. https://opentelemetry.io/docs/collector/resiliency/
- NGINX HTTP core module: request bodies can spill from buffers to temporary files. https://nginx.org/en/docs/http/ngx_http_core_module.html#client_body_buffer_size
- PostgreSQL logging documentation: bound parameter logging and separate controls for errors. https://www.postgresql.org/docs/current/runtime-config-logging.html
- Stripe security guide: integrations that collect payment data without passing it through merchant servers. https://docs.stripe.com/security/guide
- Stripe testing documentation: test environments, test cards, verification values, and decline scenarios. https://docs.stripe.com/testing
- Sentry LocalVariables documentation: exception reporting can capture local variables. https://docs.sentry.io/platforms/javascript/guides/bun/configuration/integrations/localvariables/
- Sentry Session Replay changelog: optional collection of network request and response bodies. https://sentry.io/changelog/2023-5-11-enrich-network-data-in-session-replay-with-request-response-bodies/
- RFC 8259: JSON syntax and value types. https://www.rfc-editor.org/rfc/rfc8259

## Issues Found
No technical issues found.

## Review Notes
- The post qualifies for technical review because it contains an event example and concrete controls for collection, serialization, buffering, export, and regression verification.
- Parsed the single JSON code block with Python's JSON parser successfully. The event uses valid strings and a numeric duration. Its field names are an illustrative application schema, not a claimed provider API or OpenTelemetry standard schema.
- Confirmed the merchant CVV retention prohibition and the current keyed-hashing requirement. The advice to avoid ad hoc PAN hashes is appropriate; hashing is not a general exemption from PCI DSS obligations.
- Confirmed that upstream request spools and persistent telemetry queues can contain data before downstream filtering. Removing values from a central index cannot remove those earlier copies.
- The allowlist, constrained event values, capture inventory, and source-level exclusions are technically sound design recommendations. Specific capture settings depend on the products and SDKs deployed; the post does not assert universal defaults or provide vendor-specific configuration.
- Pattern matching cannot establish that no card data exists. Short verification codes require field and data-path context, so preventing collection is appropriate. This is a limitation of content recognition, not a claim that a particular detector was tested.
- Provider-approved fixtures and failure-path testing are appropriate. No payment integration or telemetry deployment accompanies the post, so live authorizations, vendor capture settings, and destination-level leak tests were not executed.
- The incident-response advice appropriately coordinates containment and removal with security owners while avoiding additional copies of sensitive records. Preserving required security events is consistent with OWASP guidance.
- The three technical URLs in the post resolved to the intended official resources. The author link resolved to the named GitHub profile.
- There are no terminal commands, deployable configuration snippets, deprecated API calls, or explicit software version claims to correct. README.md was left unchanged.
