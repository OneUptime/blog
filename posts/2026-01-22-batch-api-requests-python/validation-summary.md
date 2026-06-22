# Validation Summary: How to Batch API Requests into Single Queries in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python async/await and asyncio
- HTTPX AsyncClient
- FastAPI
- Pydantic
- MongoDB bulk writes with PyMongo-style operations
- GraphQL DataLoader pattern
- Strawberry GraphQL DataLoader

## Sources Consulted
- Python asyncio event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html
- HTTPX async client documentation: https://www.python-httpx.org/async/
- FastAPI HTTPException reference: https://fastapi.tiangolo.com/reference/exceptions/
- FastAPI response model documentation: https://fastapi.tiangolo.com/tutorial/response-model/
- Pydantic migration guide: https://docs.pydantic.dev/latest/migration/
- Strawberry GraphQL DataLoader guide: https://strawberry.rocks/docs/guides/dataloaders
- MongoDB PyMongo bulk write documentation: https://www.mongodb.com/docs/languages/python/pymongo-driver/current/crud/bulk-write/
- Motor async collection documentation: https://motor.readthedocs.io/en/stable/api-asyncio/asyncio_motor_collection.html

## Issues Found
- The concurrent request example incorrectly said concurrency still creates N connections. HTTP clients such as HTTPX use connection pooling and limits, so the technically correct claim is that concurrency still sends N requests. Updated the comments accordingly.
- The batched HTTPX example used `httpx.AsyncClient` without importing `httpx`. Added the import.
- The FastAPI batch endpoint deduplicated IDs with `set()`, which loses ordering. Changed it to `dict.fromkeys()` to preserve order.
- The client-side `RequestBatcher` typed an async batch function as returning `Dict` directly and used `asyncio.get_event_loop()` inside running coroutines. Updated the type hint to `Awaitable[Dict[str, T]]` and used `asyncio.get_running_loop()`.
- The client-side `RequestBatcher` resolved every pending future for every chunk, which caused incorrect `KeyError` exceptions when the unique key count exceeded `max_batch_size`. Updated it to resolve only the futures belonging to the current chunk.
- The custom `DataLoader` accepted `max_batch_size` but did not apply it. Updated dispatch to call the batch load function in chunks.
- The custom `DataLoader` typed an async batch loader as returning a list directly and used `asyncio.get_event_loop()` inside running coroutines. Updated the type hint to `Awaitable[List[Optional[T]]]` and used `asyncio.get_running_loop()`.
- The DataLoader usage example had top-level `await`, which is not valid in a normal Python file. Wrapped it in an async `main()` example.
- The bulk write example omitted imports used by the snippet and used Pydantic's deprecated `dict()` method. Added the missing imports and changed serialization to `model_dump()`.
- The GraphQL section said GraphQL naturally supports request batching, which is imprecise. Reworded it to say GraphQL APIs commonly use DataLoader to batch backend data fetching.
- The Strawberry GraphQL example referenced `User` and `Order` in annotations before class definitions and used `defaultdict` without importing it. Added `from __future__ import annotations` and imported `defaultdict`.
- The GraphQL users resolver returned `List[User]` even though the loader can return missing users as `None`. Updated the type to `List[Optional[User]]`.
- The benchmark snippet used `List[str]` without importing `List`. Added the import.

## Review Notes
- The examples still use placeholder application objects such as `db` and `ItemModel`, which is acceptable for a tutorial snippet but would need concrete definitions in a runnable project.
- The MongoDB-style async examples resemble Motor or PyMongo Async usage. Motor documentation now recommends migration to the PyMongo Async driver, so future posts should consider naming the driver explicitly.
