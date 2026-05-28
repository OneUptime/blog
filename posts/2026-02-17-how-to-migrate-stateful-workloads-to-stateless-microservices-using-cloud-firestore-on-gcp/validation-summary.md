# Validation Summary: How to Migrate Stateful Workloads to Stateless Microservices

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Firestore in Native mode
- Google Cloud Firestore Python client library
- Firestore transactions, batched writes, field transforms, and TTL policies
- Cloud Scheduler
- Cloud Run functions / Cloud Functions HTTP handlers
- Cloud Run services
- Python
- Google Cloud CLI

## Sources Consulted
- Google Cloud SDK reference: `gcloud firestore databases create` - https://cloud.google.com/sdk/gcloud/reference/firestore/databases/create
- Firestore data retention with TTL policies - https://cloud.google.com/firestore/docs/ttl
- Firestore best practices - https://cloud.google.com/firestore/native/docs/best-practices
- Firestore offline persistence documentation - https://cloud.google.com/firestore/native/docs/manage-data/enable-offline
- Firestore transactions and batched writes - https://cloud.google.com/firestore/docs/manage-data/transactions
- Firestore Python client reference for transactions and field transforms - https://cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.transaction
- Firestore Python client reference for `ArrayUnion` and `Increment` - https://cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.transforms
- Cloud Scheduler `gcloud scheduler jobs create http` reference - https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud Run functions HTTP handler documentation - https://cloud.google.com/run/docs/write-http-functions
- Cloud Run `gcloud run deploy` reference - https://cloud.google.com/sdk/gcloud/reference/run/deploy

## Issues Found
- The post claimed Firestore does not have built-in TTL. Firestore now supports TTL policies, so the cleanup section was updated to show `gcloud firestore fields ttls update ... --enable-ttl` and to describe scheduled cleanup as an option for tighter cleanup timing.
- The scheduled cleanup sample used an event-style Python function signature while the Scheduler command creates an HTTP job. The function was changed to accept a Flask `request` object and return an HTTP response.
- The cleanup query used positional `where()` arguments. It was updated to use `FieldFilter` with the `filter=` keyword, matching the current Python client style.
- The Cloud Run deploy command used `--allow-unauthenticated=false`. It was changed to the documented `--no-allow-unauthenticated` flag form.
- The article said the Firestore database is ready immediately. That was changed to state that the `gcloud` command returns when creation completes.
- The article made an overly specific single-digit millisecond latency claim for Firestore. It was replaced with a more accurate statement that latency depends on location, indexing, contention, and network path.
- The Firestore native mode description implied offline support generally. It was clarified that offline support applies to supported client SDKs.
- The initial Python pattern snippet referenced `defaultdict` and `Queue` without imports and used a Flask session example that did not accurately represent Flask's default client-side session behavior. The snippet was corrected to use explicit per-instance state examples and imports.
- The examples used naive `datetime.utcnow()` values. They were updated to timezone-aware UTC timestamps.
- The workflow history example attempted to place `firestore.SERVER_TIMESTAMP` inside an `ArrayUnion` value. It was changed to use a concrete UTC timestamp inside the array while keeping `updated_at` as a server timestamp.
- The rate limiter accepted `window_seconds` but bucketed only by minute. It now computes a bucket from `window_seconds`, and stores the matching `window_start`.

## Review Notes
- The Firestore-backed rate limiter is correct as a simple distributed example, but high request rates for the same user and window can create contention on one document. A production implementation should be load-tested and may need sharded counters or another purpose-built rate limiting store.
- Firestore TTL deletes are intentionally not immediate and usually occur within 24 hours after expiration, so scheduled cleanup can still be useful when stricter cleanup timing is required.
