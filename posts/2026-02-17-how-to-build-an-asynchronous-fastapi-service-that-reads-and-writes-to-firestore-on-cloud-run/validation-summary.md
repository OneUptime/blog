# Validation Summary: How to Build an Asynchronous FastAPI Service That Reads and Writes to Firestore

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- FastAPI
- Pydantic
- Google Cloud Firestore
- Google Cloud Run
- Docker
- gcloud CLI

## Sources Consulted
- FastAPI lifespan events: https://fastapi.tiangolo.com/advanced/events/
- Pydantic BaseModel serialization API: https://docs.pydantic.dev/latest/api/base_model/
- Google Cloud Firestore AsyncClient reference: https://docs.cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.async_client.AsyncClient
- Google Cloud Firestore async client sample: https://docs.cloud.google.com/firestore/docs/samples/firestore-setup-client-create-async
- Google Cloud Firestore BaseQuery.where reference: https://docs.cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.base_query.BaseQuery
- Google Cloud Firestore async set/update samples: https://docs.cloud.google.com/firestore/docs/samples/firestore-data-set-from-map-async and https://docs.cloud.google.com/firestore/docs/samples/firestore-data-set-field-async
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Cloud Run concurrency documentation: https://docs.cloud.google.com/run/docs/about-concurrency
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy

## Issues Found
- The update endpoint used `update.dict()`, which is deprecated in Pydantic v2. Changed it to `update.model_dump(exclude_none=True)`, which is the current Pydantic API and preserves the original behavior of omitting `None` values.
- The Firestore query examples used positional arguments to `where()`. The current Firestore reference supports the explicit `filter` keyword and documents `FieldFilter`; changed the examples to `query.where(filter=FieldFilter(...))` and added the corresponding import.
- The lifespan shutdown comment said it closed the Firestore client, but the sample only set the module-level variable to `None`. Updated the docstring and comment so they accurately describe releasing the module-level reference.

## Review Notes
The Firestore async client setup, async `set()`, `get()`, `stream()`, `update()`, and `delete()` patterns match the current Google Cloud Python client documentation. The Cloud Run deployment flags shown are current. The Dockerfile listens on port 8080, which is compatible with Cloud Run's default request port, although a production version could also read the `PORT` environment variable explicitly.
