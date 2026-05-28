# Validation Summary: How to Implement Idempotent Cloud Functions to Handle Duplicate Event Deliveries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run functions / Cloud Functions
- CloudEvents
- Pub/Sub
- Cloud Storage events
- Firestore triggers, transactions, document writes, and TTL policies
- PostgreSQL `INSERT ... ON CONFLICT`
- Stripe idempotency keys
- JavaScript / Node.js Functions Framework

## Sources Consulted
- Google Cloud Run functions retry best practices: https://docs.cloud.google.com/functions/docs/bestpractices/retries
- Google Cloud Pub/Sub subscription overview: https://cloud.google.com/pubsub/docs/subscription-overview
- Google Cloud Storage Pub/Sub notifications: https://docs.cloud.google.com/storage/docs/pubsub-notifications
- Google Cloud Run Cloud Storage trigger delivery notes: https://docs.cloud.google.com/run/docs/triggering/storage-triggers
- Google Cloud Run functions local Pub/Sub CloudEvent example: https://docs.cloud.google.com/functions/docs/running/direct
- Firebase / Cloud Firestore trigger limitations: https://firebase.google.com/docs/functions/firestore-events
- Firestore TTL policy documentation: https://docs.cloud.google.com/firestore/docs/ttl
- Firestore Node.js transaction API reference: https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/transaction
- CloudEvents specification: https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md
- Stripe idempotent requests documentation: https://docs.stripe.com/api/idempotent_requests
- PostgreSQL `INSERT ... ON CONFLICT` documentation: https://www.postgresql.org/docs/current/sql-insert.html

## Issues Found
- The post said every CloudEvent has a unique ID. CloudEvents requires the combination of `source` and `id` to be unique for each distinct event, so the wording was corrected to say the ID is unique within its event source.
- The Firestore transaction example returned from the transaction callback for duplicate events but still ran `processingFn()` afterward. The snippet now returns a boolean from the transaction and exits before processing when the event was already recorded.
- The transaction example wrote `completedAt` but not `processedAt`, while the cleanup query uses `processedAt`. The completed update now sets `processedAt`.
- The natural idempotency key payment example used a non-atomic read-before-payment check, which could still double-charge under concurrent duplicate executions. The snippet now reserves the order in a Firestore transaction and passes the order ID as an idempotency key to the payment call.
- The PostgreSQL upsert example claimed repeated execution produced the same result but updated `updated_at` with `NOW()` on each duplicate. The snippet now updates only deterministic user fields.
- The email deduplication example used a read-before-send check, which could send duplicates under concurrent duplicate executions. The snippet now uses Firestore `create()` to reserve the send record atomically before sending, updates it after success, and deletes the reservation on failure.
- The Firestore TTL wording implied deletion after a relative age on the collection. Firestore TTL policies operate on a configured timestamp field, so the wording now mentions using an `expireAt`-style timestamp field.

## Review Notes
- The post is technically relevant and the main reliability guidance is correct: Google event-driven functions and the listed event sources should be treated as at-least-once delivery systems, and handlers should be idempotent.
- The examples still use placeholder helper functions such as `chargeCustomer`, `processPayment`, and `emailService.send`; their exact idempotency behavior depends on the implementation or external provider.
