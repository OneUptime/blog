# Validation Summary: How to Implement Message Deduplication with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Pub/Sub, State Management, Resiliency)
- Python (Flask, psycopg2, requests)
- PostgreSQL (ON CONFLICT, transactional outbox pattern)
- CloudEvents
- YAML (Dapr component configuration)

## Sources Consulted
- Dapr State Management TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr State API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency policies: https://docs.dapr.io/operations/resiliency/policies/

## Issues Found

1. **State store TTL field location (Approach 1, `mark_processed` function)**: The code used `"options": {"ttlInSeconds": ttl_seconds}` to set the TTL when saving state. Per the Dapr State Management API, TTL must be set in the `"metadata"` field, not `"options"`. The `"options"` field is reserved for concurrency and consistency settings. Additionally, `ttlInSeconds` must be a string value. Fixed to `"metadata": {"ttlInSeconds": str(ttl_seconds)}`.

2. **Resiliency target for pub/sub (resiliency.yaml)**: The configuration used `targets.apps.order-processor.retry` which applies retry policies to service invocation calls, not pub/sub subscription delivery. Per Dapr's resiliency documentation, pub/sub retry policies must be targeted under `targets.components.<component-name>` with `inbound`/`outbound` sub-sections. Fixed to `targets.components.pubsub.inbound.retry`.

3. **Missing `import os` in db_handler.py snippet**: The code referenced `os.environ["DATABASE_URL"]` but did not import the `os` module. Added `import os` to the imports.

## Review Notes
- The outbox pattern implementation in Approach 3 wraps all publish+mark operations in a single transaction. If the process crashes after publishing some events but before the transaction commits, those events will be re-published on restart. This is a known trade-off of the polling outbox pattern and not a bug per se, but readers should be aware of it.
- The `outbox_publisher.py` snippet omits imports for `json`, `requests`, and the `DAPR_URL` variable, relying on context from earlier code blocks. This is acceptable for a tutorial with progressive code examples.
- The pub/sub status values (SUCCESS, RETRY) and the programmatic subscription endpoint (`/dapr/subscribe`) were verified as correct against the Dapr Pub/Sub API reference.
- The dead letter topic configuration using `deadLetterTopic` in the declarative subscription spec (v2alpha1) is correct.
