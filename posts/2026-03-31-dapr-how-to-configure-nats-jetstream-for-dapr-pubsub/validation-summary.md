# Validation Summary: How to Configure NATS JetStream for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub building block)
- NATS JetStream (persistent messaging)
- Go (Dapr Go SDK publisher)
- Python / Flask (Dapr subscriber)
- Kubernetes / Helm
- Docker
- NATS CLI

## Sources Consulted
- Dapr JetStream pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-jetstream/
- Dapr pub/sub API reference (subscription response protocol): https://docs.dapr.io/reference/api/pubsub_api/
- NATS CLI source and documentation: https://github.com/nats-io/natscli
- Dapr Go SDK: https://github.com/dapr/go-sdk
- Dapr subscription how-to guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/

## Issues Found

1. **`backoff` metadata field name incorrect → fixed to `backOff`**: The Dapr JetStream component uses `backOff` (capital O) as the metadata key for retry backoff intervals. The post used lowercase `backoff` in the component YAML, the key options list, and the summary paragraph. All three occurrences were corrected.

2. **TLS and auth metadata field names incorrect → fixed**: The authentication section used `natsCredentialsFile`, `tlsClientCert`, `tlsClientKey`, and `tlsCACert`. None of these are valid Dapr JetStream component metadata fields. The correct auth fields are `jwt` and `seedKey` (for decentralized NATS auth) or `token` (for token auth). The correct TLS fields are `tls_client_cert` and `tls_client_key` (snake_case). There is no `tls_ca_cert` or equivalent field in the JetStream component. Fixed the YAML and explanatory text accordingly.

3. **`deliveryPolicy` subscription metadata key incorrect → fixed to `deliverPolicy`**: In the Python subscriber's programmatic subscription response, the metadata key was `deliveryPolicy`. The correct Dapr JetStream metadata key is `deliverPolicy` (without the "y"). Fixed in the subscriber code.

4. **Subscriber RETRY response used HTTP 500 → fixed to HTTP 200**: The Dapr pub/sub protocol specifies that subscribers should return HTTP 200 with `{"status": "RETRY"}` in the body to request message redelivery. The post returned HTTP 500, which also triggers a retry but through the error path rather than the intentional retry signaling path. Fixed to return HTTP 200 with the RETRY status.

5. **`nats stream sub` is not a valid NATS CLI command → fixed to `nats stream view`**: The NATS CLI does not have a `sub` subcommand under `nats stream`. The correct command for viewing messages in a stream is `nats stream view`. The invalid `--count 10` flag was also removed (the view command accepts a positional page size argument instead).

## Review Notes
- The NATS Helm chart values (`config.jetstream.enabled`, `config.jetstream.fileStore.enabled`, `config.jetstream.fileStore.pvc.size`) appear to follow the newer NATS Helm chart (v1.x) convention. Users on older chart versions may need different value paths.
- The Go publisher code correctly uses the Dapr Go SDK's `PublishEvent` API. The `json.Marshal` error is silently ignored with `_`, which is acceptable for a tutorial but not recommended for production code.
- The Dapr Subscription CRD uses `apiVersion: dapr.io/v1alpha1`, which is valid but older. Dapr also supports `v2alpha1` subscriptions with additional features like bulk subscribe and dead letter topics.
- The `nats server info --server` command syntax should work, though `-s` is the more commonly documented short form for specifying the NATS server URL.
