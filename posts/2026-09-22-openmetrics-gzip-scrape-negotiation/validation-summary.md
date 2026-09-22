# Validation Summary: How to Serve Gzipped OpenMetrics with Correct Scrape Negotiation

## Status
validated

## Post Type
Technical guide with a complete Go example and shell commands.

## Technologies Covered
- Go and the standard library HTTP server
- Prometheus client_golang and promhttp
- OpenMetrics 1.0 and Prometheus text exposition
- HTTP media-type and content-encoding negotiation
- Gzip, curl, and reverse proxies
- Prometheus scrape compression and body-size limits

## Sources Consulted
- promhttp API documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp
- Versioned promhttp implementation: https://raw.githubusercontent.com/prometheus/client_golang/v1.24.1/prometheus/promhttp/http.go
- Prometheus scrape protocol content negotiation: https://prometheus.io/docs/instrumenting/content_negotiation/
- OpenMetrics 1.0 specification: https://prometheus.io/docs/specs/om/open_metrics_spec/
- Prometheus scrape configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config
- HTTP semantics, including Content-Type, Content-Encoding, Content-Length, Accept, Accept-Encoding, quality values, and Vary: https://www.rfc-editor.org/rfc/rfc9110.html
- Go net/http documentation: https://pkg.go.dev/net/http
- Go gzip writer completion: https://pkg.go.dev/compress/gzip#Writer.Close
- Official curl command-line manual: https://curl.se/docs/manpage.html
- Local Apple gzip 487.0.1 `gzip --help`, confirming `-t`, `-d`, and `-c`.
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post is technically relevant and its examples use supported APIs.
- Extracted the exact Go code into an isolated temporary module and successfully compiled it with Go 1.25.3 and client_golang v1.24.1. No dependencies or test artifacts were added to the blog repository.
- Ran the compiled server on its documented localhost address. Checked OpenMetrics 1.0 and classic text 0.0.4 with gzip, identity, and `gzip;q=0, identity;q=1`: all six requests returned HTTP 200 with the expected media type and compression behavior.
- Confirmed the responses retained Cache-Control: no-store and both Vary fields, and that explicit gzip refusal produced an uncompressed response.
- Verified compressed responses using `gzip -t` and decoded them using `gzip -dc`. Each decoded response contained the gauge value 7; OpenMetrics responses ended with `# EOF` followed by a newline. Decoded gzip and identity bodies matched for each format.
- Executed the curl `--compressed` example and confirmed its output matched the uncompressed OpenMetrics body. The manual also confirms that saved headers remain unchanged after curl decodes a body.
- Confirmed that media type and content coding are separate negotiation decisions, zero quality excludes gzip, and compression requires correct length/framing and completion of the gzip stream.
- Confirmed that Prometheus exposes enable_compression and applies body_size_limit to the uncompressed response. Actual bandwidth, scrape-duration, and CPU effects require measurement on the deployed scrape path.
- The client-version caveat is appropriate: OfferedCompressions availability and defaults depend on the pinned version. The example explicitly offers gzip and identity, so additional default encodings do not affect these checks.
- The post's documentation and author links resolve to the intended resources. No deprecated API usage was identified in the example.
- No deployed ingress or Prometheus instance was supplied; proxy transformations and production scrape health were reviewed against documentation rather than tested in a deployment.
