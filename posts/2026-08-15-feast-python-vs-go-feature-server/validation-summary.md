# Validation Summary: Feast Python vs Alpha Go Server for Non-Python Clients

## Status

validated

## Post Type

Comparative deployment guide

## Technologies Covered

- Feast Python feature server
- Feast Alpha Go feature server
- HTTP/JSON and FastAPI OpenAPI
- gRPC and Protocol Buffers
- Feast FeatureService and on-demand feature views (ODFVs)
- Python transformation service
- Prometheus metrics and OpenTelemetry tracing
- Feast authorization and permissions

## Sources Consulted

- [Feast feature servers](https://docs.feast.dev/reference/feature-servers)
- [Feast Python feature server](https://docs.feast.dev/reference/feature-servers/python-feature-server)
- [Feast Alpha Go feature server](https://docs.feast.dev/reference/feature-servers/go-feature-server)
- [Feast feature-server component](https://docs.feast.dev/getting-started/components/feature-server)
- [Feast permissions](https://docs.feast.dev/getting-started/concepts/permission)
- [Feast Authorization Manager](https://docs.feast.dev/getting-started/components/authz_manager)
- [Running Feast in production](https://docs.feast.dev/how-to-guides/running-feast-in-production)
- [Feast v0.65.0 release](https://github.com/feast-dev/feast/releases/tag/v0.65.0)
- Feast source at commit `e79bd331694ffc7dd6023465b17348470afbe4e6`: [Python serve CLI](https://github.com/feast-dev/feast/blob/e79bd331694ffc7dd6023465b17348470afbe4e6/sdk/python/feast/cli/serve.py), [Python feature server](https://github.com/feast-dev/feast/blob/e79bd331694ffc7dd6023465b17348470afbe4e6/sdk/python/feast/feature_server.py), and [FeatureStore](https://github.com/feast-dev/feast/blob/e79bd331694ffc7dd6023465b17348470afbe4e6/sdk/python/feast/feature_store.py)
- Feast Go source at the same commit: [server entry point](https://github.com/feast-dev/feast/blob/e79bd331694ffc7dd6023465b17348470afbe4e6/go/main.go), [HTTP server](https://github.com/feast-dev/feast/blob/e79bd331694ffc7dd6023465b17348470afbe4e6/go/internal/feast/server/http_server.go), [Go FeatureStore](https://github.com/feast-dev/feast/blob/e79bd331694ffc7dd6023465b17348470afbe4e6/go/internal/feast/featurestore.go), and [Go server README](https://github.com/feast-dev/feast/blob/e79bd331694ffc7dd6023465b17348470afbe4e6/go/README.md)
- [Feast RepoConfig source](https://github.com/feast-dev/feast/blob/e79bd331694ffc7dd6023465b17348470afbe4e6/sdk/python/feast/repo_config.py)
- [Historical Feast v0.30 Go feature-server documentation](https://github.com/feast-dev/feast/blob/v0.30-branch/docs/reference/feature-servers/go-feature-server.md)
- [RFC 9112: HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112.html)

## Issues Found

- The raw HTTP/1.1 example omitted the mandatory `Host` field and request-body framing, so it was not a complete runnable request. It was replaced with an equivalent `curl` command that supplies the URL, JSON content type, and framed request body automatically.
- The client guidance said JSON should preserve integer widths, although JSON has no distinct integer-width types. It now says to preserve 64-bit integer values, which expresses the actual interoperability requirement without implying width metadata in JSON.
- The Python endpoint summary grouped authentication and metrics with application endpoints and referred generically to document retrieval. Feast does not provide an authentication endpoint, Prometheus runs on a separate endpoint, and current unversioned documentation makes `/search` the vector-search route while deprecating `/retrieve-online-documents`. The sentence now distinguishes vector-search endpoints, authorization configuration, and the separate Prometheus endpoint.
- The comparison table described gRPC as merely not being Python's primary online API. The current Python `FeatureStore.serve()` implementation is HTTP-only and rejects non-HTTP server types, so the table now says gRPC is not supported by the Python feature server.
- The Python column used “standard reference” as though it were an official stability label. Feast only marks the Go page Alpha; the Python page has no Alpha marker. The row now describes the documentation maturity marker exactly.
- The transformation-service wording could imply that every Go read requires Python. Current Go source requires the separate Python service when an ODFV is requested, while ordinary feature-view reads can run without it. The dependency and conclusion are now qualified to ODFVs.
- The parity instructions did not account for the Go HTTP server omitting statuses and event timestamps by default. They now direct clients to append `?status=true` to the Go endpoint when comparing those fields.
- The deployment advice called `entity_key_serialization_version` a registry serialization version. That option controls online-store entity-key serialization, not registry serialization, so the exact configuration name is now used.

## Review Notes

Feast v0.65.0 is the latest tagged release as of the validation date, while the unversioned documentation includes newer master changes, notably the preferred `/search` endpoint. Pin a Feast release and check its matching source or documentation before deployment. The Go server remains marked Alpha. Its repository README documents generic Prometheus request and process metrics on a separate port, but the current Go reference page does not list those metrics and neither source documents the Python server's feature-freshness metric for Go. Feast authorization defaults to `no_auth`, and the official permission model describes enforcement through Python servers rather than the Go server.
