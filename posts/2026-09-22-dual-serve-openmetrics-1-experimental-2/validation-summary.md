# Validation Summary: How to Dual-Serve OpenMetrics 1.0 and Experimental 2.0

## Status

validated

## Post Type

Technical migration guide with exposition fixtures and HTTP verification commands.

## Technologies Covered

- OpenMetrics 1.0 and experimental OpenMetrics 2.0
- Prometheus exporters and scrape protocol configuration
- HTTP content negotiation, media types, quality values, and caching
- curl and Bash

## Sources Consulted

- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/) — counter suffixes, metadata, text format, and EOF requirements.
- [OpenMetrics 2.0 experimental specification](https://prometheus.io/docs/specs/om/open_metrics_spec_2_0/) — draft status, family/sample naming, composite values, timestamps, exemplars, and media type.
- [OpenMetrics 2.0 migration guide for client libraries](https://prometheus.io/docs/guides/open_metrics_2_0_migration/) — default version, opt-in negotiation, and serialization changes.
- [Prometheus scrape configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config) — supported scrape protocol identifiers.
- [Prometheus scrape protocol content negotiation](https://prometheus.io/docs/instrumenting/content_negotiation/) — protocol selection, weights, and response content types.
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — sections 12.4.2, 12.5.1, and 12.5.5 covering quality values, Accept, and Vary.
- [curl command-line manual](https://curl.se/docs/manpage.html) — --fail-with-body, -s, -S, -D, -H, and -o.

## Issues Found

No technical issues found.

## Review Notes

- The published specification identifies OpenMetrics 2.0 as experimental version 2.0.0-rc0. Its specified HTTP media type uses version=2.0.0; the omission of the release-candidate suffix in the examples is intentional and correct.
- The configuration reference does not list OpenMetricsText2.0.0. The post appropriately distinguishes a draft specification from available scraper implementations and requires a tested consumer revision.
- Both counter fixtures match the respective naming rules: the 1.0 family omits the sample's _total suffix, while the 2.0 family and sample names match. Each fixture includes the required EOF marker. These are minimal examples, not full encoder conformance suites.
- The older OpenMetrics default and explicit opt-in for 2.0 match the migration guide. Quality values and exclusions must still govern requests offering multiple representations.
- The displayed media-type values match the OpenMetrics specifications and migration guide. Implementations integrating broader Prometheus negotiation should also follow its escaping-parameter requirements; the example names use the legacy-compatible character set.
- Structured snapshots, separate encoding paths, semantic comparison, isolated experimental storage, and revision-sensitive retesting are sound migration recommendations. Relabeling serialized 1.0 data as 2.0 does not establish compatibility.
- The Bash command block passed bash -n. The curl options are valid; --fail-with-body requires curl 7.76.0 or newer and retains an HTTP error body while returning an error status.
- No running exporter or pinned experimental parser was supplied, so live HTTP negotiation and parser acceptance were not executed. The review validates the examples against documentation and syntax, not a particular encoder or consumer implementation.
- The referenced specification and documentation URLs resolve to the intended resources. README.md was left unchanged.
