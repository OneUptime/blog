# Validation Summary: How to Use NATS with Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NATS messaging system (core NATS, JetStream)
- nats-py client library (verified against v2.15.0)
- Python asyncio
- JetStream Key-Value store and Object Store
- Prometheus client (prometheus_client library) for metrics
- Docker (for running NATS server locally)

## Sources Consulted
- nats-py GitHub repository: https://github.com/nats-io/nats.py
- nats-py official docs / modules reference: https://nats-io.github.io/nats.py/modules.html
- NATS documentation (concepts and JetStream): https://docs.nats.io
- Direct inspection of the installed `nats-py` package (v2.15.0) — verified API signatures for `nats.connect`, `JetStreamContext.publish`, `JetStreamContext.pull_subscribe`, `JetStreamContext.subscribe`, `JetStreamContext.add_stream`, `JetStreamContext.add_consumer`, `JetStreamContext.create_key_value`, `JetStreamContext.create_object_store`, `KeyValue.put/get/update/delete/watch/keys`, `ObjectStore.put/get/list/delete`, `ObjectStore.ObjectResult`, and the dataclass fields of `StreamConfig`, `ConsumerConfig`, `ObjectInfo`, `ObjectMeta`
- Verified enum members: `AckPolicy.{NONE,ALL,EXPLICIT}`, `DeliverPolicy.{ALL,LAST,NEW,BY_START_SEQUENCE,BY_START_TIME,LAST_PER_SUBJECT}`, `RetentionPolicy.{LIMITS,INTEREST,WORK_QUEUE}`
- Verified time unit handling in nats-py StreamConfig/ConsumerConfig: `max_age`, `duplicate_window`, and `ack_wait` are accepted in seconds by the Python API and converted to nanoseconds internally for the wire protocol

## Issues Found
- **Object Store retrieval used non-existent APIs.** The post showed `data = await result.read()` and `async for chunk in result: f.write(chunk)` on the value returned by `obj.get(...)`. In nats-py, `ObjectStore.get()` returns an `ObjectStore.ObjectResult` dataclass with `info` and `data` fields — it has no `read()` method and is not async-iterable. Fixed by replacing `await result.read()` with `result.data` (accessing the dataclass field) and replacing the async-for streaming loop with the supported `writeinto` parameter: `await obj.get("documents/report.txt", writeinto=f)`, which is the documented way to stream an object into a file-like object.

## Review Notes
- The Python API for `StreamConfig` and `ConsumerConfig` accepts time-related fields (`max_age`, `duplicate_window`, `ack_wait`) in **seconds**, even though the NATS wire protocol serializes them as nanoseconds. The post correctly uses seconds — confirmed by serializing a sample config and inspecting the resulting dict.
- The post claims JetStream provides "exactly-once delivery". NATS / JetStream supports "exactly-once" via publisher message deduplication (the `Nats-Msg-Id` header within the `duplicate_window`) plus consumer acknowledgements; it is not exactly-once in the strict end-to-end transactional sense. This is a common phrasing in NATS marketing material and the post's deduplication example is correct, so it was left as-is.
- `connected_url` returns a `urllib.parse.ParseResult`; accessing `.netloc` is valid.
- The `prometheus_client` integration example is generic Python code unrelated to NATS internals — its metric definitions and `start_http_server(9090)` usage are correct.
- All enum names used (`AckPolicy.EXPLICIT`, `DeliverPolicy.ALL`, `RetentionPolicy.LIMITS`) match the current nats-py enums.
- `kv.update(key, value, last=entry.revision)` correctly uses the `last` keyword argument for optimistic locking.
- The post uses `datetime.utcnow()`, which is deprecated in Python 3.12+ in favor of `datetime.now(datetime.UTC)`. Not corrected here because the code still works and the change is stylistic for current Python; future revisions may want to update.
