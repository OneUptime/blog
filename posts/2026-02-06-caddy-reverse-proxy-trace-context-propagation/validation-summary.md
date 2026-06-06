# Validation Summary: How to Configure Caddy as a Reverse Proxy with W3C Trace Context

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Caddy
- Caddyfile reverse proxy configuration
- OpenTelemetry tracing
- W3C Trace Context
- W3C Baggage
- HTTP headers
- CORS
- Python Flask
- curl

## Sources Consulted
- Caddy `tracing` directive documentation: https://caddyserver.com/docs/caddyfile/directives/tracing
- Caddy `reverse_proxy` directive documentation: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddyfile concepts and global options documentation: https://caddyserver.com/docs/caddyfile/concepts
- Caddy placeholders documentation: https://caddyserver.com/docs/caddyfile/concepts#placeholders
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- W3C Baggage Recommendation: https://www.w3.org/TR/baggage/
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- Flask quickstart documentation: https://flask.palletsprojects.com/en/stable/quickstart/

## Issues Found
- The Caddyfile examples incorrectly placed `tracing { span ... }` in the global options block and then used bare `tracing` inside the site block. Caddyfile site directives must be inside site blocks, so the snippets were updated to configure `tracing { span ... }` directly inside the site blocks.
- The Python client example used an invalid `traceparent` value (`00-abc123-def456-01`). W3C Trace Context requires a 32-lowercase-hex-character trace ID and 16-lowercase-hex-character parent ID, so the example was replaced with a valid Trace Context value.
- The multi-upstream section claimed each `reverse_proxy` directive creates a new child span. Caddy's `tracing` handler creates and propagates trace context for the matched route; the text was adjusted to say the matched proxy forwards the propagated context.
- The CORS example omitted `Access-Control-Allow-Methods`, which is part of a successful preflight response for non-simple requests. The header was added, and the explanation was corrected to say browsers fail the preflight and skip the actual request rather than stripping headers.
- The TLS example placed `header_up` at the site-block level, but `header_up` is a `reverse_proxy` subdirective. It was moved inside the `reverse_proxy` block.
- The TLS section referred to a specific `http.scheme` span attribute. Current OpenTelemetry HTTP semantic conventions use `url.scheme` for the scheme, while Caddy documents HTTP semantic-convention attributes generally. The sentence was made attribute-name-neutral.

## Review Notes
The post is technically relevant and accurate after the fixes. I could not run `caddy adapt` locally because the `caddy` binary is not installed in this workspace, so configuration validation was performed against the official Caddy documentation.
