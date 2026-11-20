# Validation Summary: Fix Browser OTLP/HTTP Preflight Failures with Restricted Collector CORS

## Status
validated

## Post Type
Technical troubleshooting guide with Collector YAML configuration and a curl preflight diagnostic command.

## Technologies Covered
- OpenTelemetry Collector and browser JavaScript exporters
- OTLP over HTTP and the trace ingestion endpoint
- CORS and HTTP preflight requests
- Content Security Policy (CSP), mixed content, and HTTPS
- Reverse proxies, authentication, and ingestion security
- YAML and curl

## Sources Consulted
- [Collector HTTP server configuration](https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md) — CORS fields, allowed headers, origin patterns, and preflight caching.
- [OTLP receiver documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md) — HTTP protocol configuration, port 4318, and the default `/v1/traces` path.
- [Debug exporter documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md) — supported verbosity values and diagnostic output.
- [Collector configuration](https://opentelemetry.io/docs/collector/configuration/) — named components and service pipeline wiring.
- [JavaScript exporters](https://opentelemetry.io/docs/languages/js/exporters/) — browser HTTP transport, CORS, CSP, and public Collector considerations.
- [Collector configuration security best practices](https://opentelemetry.io/docs/security/config-best-practices/) — network exposure, authentication, and abuse controls.
- [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/#http-cors-protocol) — preflight headers, response authorization, credential handling, and caching.
- [MDN CORS guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) — origin matching and browser enforcement.
- [W3C Content Security Policy Level 3](https://www.w3.org/TR/CSP3/#directive-connect-src) — connection restrictions and pre-request checks.
- [W3C Mixed Content](https://www.w3.org/TR/mixed-content/) — insecure requests from secure contexts.
- [curl manual](https://curl.se/docs/manpage.html) — `--include`, `--request`, and repeated `--header` options.

## Issues Found
No technical issues found.

## Review Notes
- The README was left unchanged. Its configuration uses supported fields and explicitly limits browser origins to the two listed applications. `max_age: 600` represents a 600-second preflight cache lifetime, subject to browser limits.
- The named receiver is correctly referenced by the traces pipeline. The debug exporter supports `verbosity: basic`; it provides diagnostic summaries rather than delivering spans to a production backend.
- The HTTP binding listens on all IPv4 interfaces. The existing instructions correctly require a trusted HTTPS proxy and restricted receiver reachability.
- The curl example uses the correct OTLP trace path and preflight headers. `--include` remains supported, although current curl documentation calls the option `--show-headers`.
- Origin scheme, host, and port distinctions, custom-header preflights, wildcard restrictions for credentialed requests, proxy interference, and separate validation of the actual POST are technically sound.
- CORS is correctly distinguished from authentication. Preflight does not authenticate the sender, and non-browser clients are not constrained by browser CORS checks. Privileged credentials should remain on the server.
- CSP and mixed-content failures can block delivery independently of receiver CORS. Cached preflight decisions can also affect retesting.
- No specific Collector or SDK version is claimed. The review used current official documentation; custom Collector distributions must contain the OTLP receiver and debug exporter.
- Validation was a documentation and snippet review, not a live end-to-end deployment test. The example domains are placeholders; no production telemetry endpoint or browser export was exercised.
