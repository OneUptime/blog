# Validation Summary: How to Use NATS with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NATS server (2.10+)
- NATS JetStream (persistence, streams, consumers)
- NATS Node.js client (`nats` package, v2.x API)
- Docker / `docker run`
- Docker Compose (single-node, three-node cluster, multi-service app stack)
- NATS clustering (mesh routes)
- NATS TLS and bcrypt-based authorization
- prometheus-nats-exporter

## Sources Consulted
- NATS server configuration docs: https://docs.nats.io/running-a-nats-service/configuration
- NATS clustering: https://docs.nats.io/running-a-nats-service/configuration/clustering/cluster_config
- NATS JetStream: https://docs.nats.io/nats-concepts/jetstream
- NATS HTTP monitoring: https://docs.nats.io/running-a-nats-service/configuration/monitoring
- NATS server errors.json (error code `10058` = StreamNameExist)
- Official NATS Docker image (Docker Hub): https://hub.docker.com/_/nats
- nats-docker repo (Dockerfile sources): https://github.com/nats-io/nats-docker
- nats.js v2.x client docs and source: https://github.com/nats-io/nats.js
- prometheus-nats-exporter: https://github.com/nats-io/prometheus-nats-exporter
- Docker Compose `depends_on` / `condition` reference: https://docs.docker.com/compose/compose-file/05-services/#depends_on

## Issues Found

1. **Healthcheck uses `wget`, but `nats:latest` is a `scratch`-based image with no shell or tools.**
   The official NATS Docker image (`nats:latest`, `nats:2.x`) is built `FROM scratch` and contains only the `nats-server` binary — no `wget`, `curl`, `nc`, or shell. Every `healthcheck: ["CMD", "wget", ...]` in the post would therefore fail when copy-pasted against `nats:latest`, leaving containers stuck in `unhealthy` and breaking any `depends_on: condition: service_healthy` chains.
   **Fix:** Changed `image: nats:latest` to `image: nats:alpine` in the three Compose examples that define a wget-based healthcheck (single-node, three-node cluster, and full app stack). The `nats:alpine` tag exists on Docker Hub and bundles BusyBox `wget`. The plain `docker run` examples that don't use healthchecks were left as `nats:latest` since they're unaffected. Added a short inline comment in each Compose snippet explaining why the alpine variant is used.

2. **Broken `depends_on: condition: service_healthy` chain in the three-node cluster compose.**
   `nats-2` had no `healthcheck`, yet `nats-3` declared `depends_on: nats-2: condition: service_healthy`. Docker Compose does not implicitly mark a service "healthy" when no healthcheck is defined — the dependent service waits indefinitely. Same risk for nats-2 depending on nats-1, but at least nats-1 had a healthcheck.
   **Fix:** Added the same wget-based healthcheck block to both `nats-2` and `nats-3` so the chain can actually resolve.

## Review Notes

- **NATS Node.js client version assumption.** The code uses the v2.x API surface (`const { connect, StringCodec, AckPolicy } = require('nats')`, `nc.jetstream()`, `nc.jetstreamManager()`, `js.consumers.get(...).consume()`). This is correct and current for nats.js v2.x. In nats.js v3.x the imports move to `@nats-io/nats-core` / `@nats-io/jetstream` and `StringCodec` is removed in favor of `TextEncoder`/`TextDecoder`. The post doesn't pin a version; readers using `npm install nats@latest` may land on a v3 release where these snippets would need adjustment. Left unchanged since v2.x is still widely used and explicitly documented.
- **Docker Compose `version: '3.8'` field is obsolete** in Compose v2 (it's ignored and prints a deprecation warning). Not a functional error, left as-is.
- **Cluster config only shows `nats-1.conf`.** The post says "Create configuration files for each cluster node" but only provides one. Readers must adapt `server_name` and the `routes` list for `nats-2.conf` and `nats-3.conf`. This is a documentation gap rather than a technical error; left unchanged.
- **`max_payload: 1MB`** matches the NATS default, so this line is functionally a no-op. Not incorrect, just non-illustrative.
- **JetStream "exactly-once delivery"** is accurate NATS terminology, achieved via publisher dedup with the `Nats-Msg-Id` header within the stream's `duplicate_window` (default 2 minutes) plus consumer double-ack. The post's one-liner is a simplification but not wrong.
- **Error code `10058`** (`StreamNameExist`) is correctly used to detect the "stream already exists" case.
- **Prometheus exporter flags** (`-varz`, `-jsz=all`) and positional monitoring URL are all valid per the upstream exporter.
