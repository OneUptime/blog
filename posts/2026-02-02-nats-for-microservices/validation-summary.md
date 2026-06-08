# Validation Summary: How to Use NATS for Microservices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NATS (core messaging server)
- NATS JetStream (persistence layer)
- nats.js (Node.js NATS client library)
- Docker (for running NATS locally)
- Kubernetes / Helm (for deploying NATS clusters)
- Prometheus / prom-client (for metrics export)
- Express.js (for metrics HTTP endpoint)

## Sources Consulted
- Official NATS documentation: https://docs.nats.io/
- NATS Helm chart values.yaml: https://github.com/nats-io/k8s/tree/main/helm/charts/nats
- nats.js client library (npm "nats") API reference: https://github.com/nats-io/nats.js
- NATS JetStream concepts: https://docs.nats.io/nats-concepts/jetstream
- NATS subject wildcards reference: https://docs.nats.io/nats-concepts/subjects
- NATS server monitoring endpoints (`/varz`, `/connz`, `/subsz`, `/routez`, `/jsz`, `/healthz`): https://docs.nats.io/running-a-nats-service/configuration/monitoring
- prom-client (npm) documentation: https://github.com/siimon/prom-client

## Issues Found

1. **Outdated NATS Helm chart values structure.** The original `helm install nats nats/nats --set ...` command used the legacy 0.x chart key paths (`jetstream.enabled`, `jetstream.memStorage.size`, `jetstream.fileStorage.size`, `cluster.enabled`, `cluster.replicas`). The current `nats-io/k8s` chart (1.x+) nests these under `config.*` and renamed several fields. Updated to:
   - `config.jetstream.enabled`
   - `config.jetstream.memoryStore.enabled` / `config.jetstream.memoryStore.maxSize`
   - `config.jetstream.fileStore.enabled` / `config.jetstream.fileStore.pvc.size`
   - `config.cluster.enabled` / `config.cluster.replicas`

2. **Unnecessary `await` on `nc.publish()` in the `InstrumentedNATS` wrapper.** `nats.js` `publish()` is synchronous (returns `void`), not a Promise. The `async`/`await` was misleading and removed; the method is now synchronous, matching all other examples in the post that correctly use `nc.publish()` without `await`.

## Review Notes

- **`JSONCodec` is being phased out.** In the latest `nats.js` releases the `JSONCodec` / `StringCodec` helpers are marked for deprecation in favor of simply using `JSON.stringify` / `JSON.parse` with `TextEncoder`/`TextDecoder`. The current usage still works, so no change was applied, but readers should be aware this API may change.
- **`redeliveryCount` semantics**: In `msg.info.redeliveryCount` the value starts at 1 on first delivery (it reflects the NATS `numDelivered` field). The DLQ example's `attempt ${deliveryCount + 1}` is therefore slightly off-by-one in the printed string, but the DLQ threshold logic (`>= 4`) still produces a reasonable retry count. Left as-is since it does not affect correctness of the pattern.
- **`rejectUnauthorized: true`** in the TLS options is a Node `tls.connect` option that `nats.js` passes through, not a documented field of `nats.js` `TlsOptions`. It works in practice but is implementation-dependent.
- **Tags include "Go"** but the post contains only Node.js / JavaScript code examples. This is a tagging discrepancy, not a technical correctness issue, so it was not modified.
- **Docker `nats:latest` with `-js -m 8222`** is correct: `-js` enables JetStream and `-m 8222` enables the HTTP monitoring listener on port 8222 (the `-p 8222:8222` exposes it from the container).
- **Kubernetes `/healthz` endpoint**: confirmed as the correct NATS server health endpoint on the monitoring port.
- **All JetStream API usages** (`jsm.streams.add`, `jsm.consumers.add`, `js.publish`, `js.consumers.get(...).consume({ max_messages, expires })`, `msg.ack()`, `msg.nak()`, `PubAck.stream/seq/duplicate`) match the current `nats.js` 2.x simplified consumer API.
