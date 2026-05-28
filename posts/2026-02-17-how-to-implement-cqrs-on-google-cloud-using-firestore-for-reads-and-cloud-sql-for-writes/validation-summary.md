# Validation Summary: How to Use CQRS on Google Cloud Using Firestore for Reads and Cloud SQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud
- Cloud SQL for PostgreSQL
- Firestore
- Pub/Sub
- Cloud Run
- Python
- Flask
- SQLAlchemy
- PostgreSQL
- CQRS

## Sources Consulted
- Google Cloud SQL for PostgreSQL: Create instances: https://docs.cloud.google.com/sql/docs/postgres/create-instance
- Google Cloud SQL for PostgreSQL: Create and manage databases: https://docs.cloud.google.com/sql/docs/postgres/create-manage-databases
- Google Cloud SQL for PostgreSQL: Connect from Cloud Run: https://cloud.google.com/sql/docs/postgres/connect-run
- Google Cloud SQL for PostgreSQL: Connect using Cloud SQL Language Connectors: https://docs.cloud.google.com/sql/docs/postgres/connect-connectors
- Google Cloud Pub/Sub: Push subscriptions: https://docs.cloud.google.com/pubsub/docs/push
- Google Cloud Pub/Sub Python client reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client
- Google Cloud Firestore Python client reference, DocumentReference: https://docs.cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.document.DocumentReference
- Google Cloud Firestore Python client reference, transforms: https://cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.transforms
- Google Cloud Firestore query samples: https://docs.cloud.google.com/firestore/docs/samples/firestore-data-query
- SQLAlchemy 2.0 Engine and Connection documentation: https://docs.sqlalchemy.org/20/core/connections.html

## Issues Found
- The architecture claimed to use CDC via Debezium, but the provided code publishes domain events directly from the write API. Updated the prose and Mermaid diagram to describe the implemented Pub/Sub domain-event flow.
- The post claimed Firestore served reads with sub-millisecond latency. Google Cloud documents Firestore as low-latency, but not as a general sub-millisecond database. Changed this to "low-latency queries."
- The Cloud SQL connection sample used a TCP host default of `127.0.0.1`, which is not the documented Cloud Run connection pattern unless an auth proxy or network path is separately configured. Updated the SQLAlchemy `pg8000` URL to use Cloud Run's Unix socket path with `INSTANCE_UNIX_SOCKET`.
- The write API used `uuid.uuid1()` as a timestamp. Replaced it with a UTC ISO 8601 timestamp from `datetime.now(timezone.utc)`.
- The Pub/Sub publish call did not wait for the publish future, so publish failures could be hidden from the request path. Updated the sample to call `future.result(timeout=30)`, matching the official client-library pattern.
- The projector imported Base64 dynamically with `__import__`. Replaced it with a normal `base64` import while preserving the documented Pub/Sub push envelope behavior.
- The Firestore query used the older positional `where()` call. Updated it to the documented `where(filter=FieldFilter(...))` style.
- The pagination code passed a cursor document even if the requested cursor document did not exist. Added an existence check before applying `start_after()`.

## Review Notes
The revised post is technically valid for a simplified event-driven CQRS tutorial. For production systems, the write-to-Cloud-SQL and publish-to-Pub/Sub boundary still deserves an outbox pattern or true CDC to avoid lost projection events if the service commits the database transaction but fails before publishing the event.
