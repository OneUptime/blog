# Validation Summary: How to Use Dapr Secrets Management for TLS Certificates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Secrets Management API (v1.0)
- Dapr secret store component (`secretstores.kubernetes`)
- Dapr Kafka pubsub component (`pubsub.kafka`)
- Kubernetes Secrets
- Go (`crypto/tls`, `net/http`)
- TLS / mTLS certificate management

## Sources Consulted
- [Dapr Apache Kafka Pubsub Component Reference](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/) — verified correct metadata field names for TLS/mTLS configuration (`caCert`, `clientCert`, `clientKey`, `authType`)
- [Dapr Secrets API Reference](https://docs.dapr.io/reference/api/secrets_api/) — verified the HTTP secrets API endpoint format (`/v1.0/secrets/<store-name>/<secret-name>`)
- [Dapr Kubernetes Secret Store Component](https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/) — verified component spec format and type name
- [Go `net/http` Server.ListenAndServeTLS documentation](https://pkg.go.dev/net/http#Server.ListenAndServeTLS) — verified that passing empty strings for certFile/keyFile is valid when TLSConfig.Certificates is set

## Issues Found

### 1. Incorrect Kafka pubsub TLS metadata field names
- **What was wrong:** The Kafka pubsub component YAML used `tlsCa`, `tlsCert`, and `tlsKey` as metadata field names. These are not valid metadata fields for the `pubsub.kafka` Dapr component.
- **What was changed:** Renamed to `caCert`, `clientCert`, and `clientKey` respectively, matching the official Dapr Kafka pubsub component specification.
- **Why:** Using incorrect field names would cause the component to silently ignore the TLS configuration, resulting in an unencrypted or failing connection to Kafka.

### 2. Missing `authType` metadata field in Kafka component
- **What was wrong:** The Kafka pubsub component provided client certificate and key for mutual TLS but did not specify `authType: mtls`.
- **What was changed:** Added `- name: authType` with `value: "mtls"` to the component metadata.
- **Why:** Without `authType: mtls`, Dapr defaults to no authentication and ignores the client certificate/key fields, so mTLS would not actually be enabled.

## Review Notes
- The Go code in the "Retrieving Certificates at Application Startup" section silently discards errors from `io.ReadAll` and `json.Unmarshal`. This is acceptable for a concise blog example but would not be appropriate in production code.
- The Go code does not check the HTTP response status code from the Dapr sidecar before parsing the body. A non-200 response would produce empty strings rather than a clear error.
- The `for range ticker.C` syntax in the certificate refresher snippet requires Go 1.22+. This is current but worth noting for readers on older Go versions.
- The certificate rotation section correctly notes that Dapr fetches secrets from Kubernetes on each API call (no caching by default), so updated secrets are picked up on the next request.
