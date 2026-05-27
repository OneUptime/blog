# Validation Summary: How to Use WebSockets with Cloud Run for Real-Time Communication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Run
- WebSockets
- Python
- websockets Python library
- Docker
- Google Cloud CLI
- Browser WebSocket API
- Node.js ws package
- Redis Pub/Sub
- Server-Sent Events
- Cloud Monitoring

## Sources Consulted
- Cloud Run WebSockets documentation: https://docs.cloud.google.com/run/docs/triggering/websockets
- Cloud Run deploy command reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- websockets 12.0 asyncio server reference: https://websockets.readthedocs.io/en/12.0/reference/asyncio/server.html
- redis-py asyncio examples: https://redis.readthedocs.io/en/latest/examples/asyncio_examples.html
- Redis redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- Cloud Run monitoring documentation: https://docs.cloud.google.com/run/docs/monitoring
- Cloud Monitoring time-series retrieval documentation: https://docs.cloud.google.com/monitoring/custom-metrics/reading-metrics
- Cloud Monitoring projects.timeSeries.list REST reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list

## Issues Found
- The `--min-instances=1` explanation said it prevents scale-to-zero from disconnecting all clients. Cloud Run treats open WebSocket connections as active requests, so active connections keep instances alive until the request timeout or disconnect. Changed the wording to say it keeps one warm instance available when there are no active connections.
- The Redis Pub/Sub snippet used `aioredis`, which is no longer the recommended current Python Redis asyncio API. Updated it to use `redis.asyncio` from redis-py.
- The connection limit guidance claimed a 512 MB instance could reasonably handle 5,000-10,000 connections. Cloud Run supports up to 1,000 concurrent requests per container instance, and WebSocket connections count as requests. Changed the guidance to reflect the 1,000 concurrency ceiling.
- The monitoring example used `gcloud monitoring time-series list`, but current official documentation describes reading time series through the Cloud Monitoring API and client libraries, and no current official gcloud reference for that command was found. Replaced it with a `curl` example against the documented `projects.timeSeries.list` REST endpoint.
- The connection-count metrics snippet used Flask route syntax even though the main server example uses `websockets.serve` with `process_request`. Replaced it with a compatible `/metrics` branch in the `health_check` handler.

## Review Notes
The core Cloud Run WebSocket guidance is accurate: WebSockets are supported without special configuration, streams are subject to Cloud Run request timeouts up to 60 minutes, clients should reconnect, session affinity is best effort, and multi-instance state requires external synchronization. The Python WebSocket server is written for `websockets==12.*`; future updates to newer major versions should re-check handler and handshake hook APIs.
